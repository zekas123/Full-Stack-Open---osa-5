const { test, describe, before, beforeEach, after } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const bcrypt = require('bcrypt')

const app = require('../app')
const config = require('../utils/config')
const Blog = require('../models/blog')
const User = require('../models/user')

const api = supertest(app)

const SEED_PASSWORD = 'salainen123'

const createUser = (user) => api.post('/api/users').send(user)
const login = (username, password) => api.post('/api/login').send({ username, password })
const createBlog = (token, overrides = {}) =>
  api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${token}`)
    .send({ title: 'AI blog', author: 'AI Author', url: 'https://ai.example', ...overrides })

const resetDb = async () => {
  await Blog.deleteMany({})
  await User.deleteMany({})
}

let token
let userId

before(async () => {
  await mongoose.connect(config.mongoUrl, {
    family: 4,
    serverSelectionTimeoutMS: 5000,
  })
})

beforeEach(async () => {
  await resetDb()

  const user = { username: 'aiuser', name: 'AI User', password: SEED_PASSWORD }
  const created = await createUser(user).expect(201)
  userId = created.body.id

  const logged = await login(user.username, user.password).expect(200)
  token = logged.body.token
})

after(async () => {
  await mongoose.connection.close()
})

describe('4.15: creating and listing users', () => {
  test('POST /api/users creates a user and returns it without the password hash', async () => {
    const response = await createUser({ username: 'newbie', name: 'New Bie', password: 'qwerty1' })
      .expect(201)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.username, 'newbie')
    assert.strictEqual(response.body.name, 'New Bie')
    assert.ok(response.body.id)
    assert.strictEqual(response.body.password, undefined)
    assert.strictEqual(response.body.passwordHash, undefined)
  })

  test('password is stored as a bcrypt hash, not as plaintext', async () => {
    await createUser({ username: 'hashuser', name: 'Hash User', password: 'plaintext123' })
      .expect(201)

    const saved = await User.findOne({ username: 'hashuser' })
    assert.ok(saved)
    assert.ok(saved.passwordHash)
    assert.notStrictEqual(saved.passwordHash, 'plaintext123')
    assert.match(saved.passwordHash, /^\$2[aby]\$/)
    assert.strictEqual(await bcrypt.compare('plaintext123', saved.passwordHash), true)
  })

  test('GET /api/users lists users without passwordHash', async () => {
    const response = await api
      .get('/api/users')
      .expect(200)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.length, 1)
    assert.strictEqual(response.body[0].username, 'aiuser')
    assert.strictEqual(response.body[0].name, 'AI User')
    assert.strictEqual(response.body[0].passwordHash, undefined)
  })
})

describe('4.16: user validation', () => {
  const countUsers = () => User.countDocuments()

  test('username is required', async () => {
    const before = await countUsers()
    const response = await createUser({ name: 'No Username', password: 'validpass' }).expect(400)

    assert.ok(response.body.error)
    assert.strictEqual(await countUsers(), before)
  })

  test('username must be at least 3 characters long', async () => {
    const before = await countUsers()
    const response = await createUser({ username: 'ab', name: 'Short', password: 'validpass' })
      .expect(400)

    assert.ok(response.body.error)
    assert.strictEqual(await countUsers(), before)
  })

  test('password is required', async () => {
    const before = await countUsers()
    const response = await createUser({ username: 'nopass', name: 'No Pass' }).expect(400)

    assert.ok(response.body.error)
    assert.strictEqual(await countUsers(), before)
  })

  test('password must be at least 3 characters long', async () => {
    const before = await countUsers()
    const response = await createUser({ username: 'shortpass', name: 'Short Pass', password: 'ab' })
      .expect(400)

    assert.ok(response.body.error)
    assert.strictEqual(await countUsers(), before)
  })

  test('username must be unique', async () => {
    const before = await countUsers()
    const response = await createUser({ username: 'aiuser', name: 'Duplicate', password: 'validpass' })
      .expect(400)

    assert.match(response.body.error, /unique/i)
    assert.strictEqual(await countUsers(), before)
  })
})

describe('4.17: blogs are linked to their creator', () => {
  test('new blog is saved with the user taken from the token', async () => {
    const response = await createBlog(token).expect(201)

    assert.strictEqual(response.body.user.id, userId)
    assert.strictEqual(response.body.user.username, 'aiuser')

    const saved = await Blog.findById(response.body.id)
    assert.strictEqual(saved.user.toString(), userId)
  })

  test('GET /api/blogs shows creator info as an object with id, username and name', async () => {
    await createBlog(token).expect(201)

    const response = await api.get('/api/blogs').expect(200)
    assert.strictEqual(response.body.length, 1)

    const [blog] = response.body
    assert.ok(blog.id)
    assert.strictEqual(blog._id, undefined)
    assert.deepStrictEqual(blog.user, {
      username: 'aiuser',
      name: 'AI User',
      id: userId,
    })
  })

  test('GET /api/users shows blogs created by the user', async () => {
    const created = await createBlog(token).expect(201)

    const response = await api.get('/api/users').expect(200)
    const user = response.body.find((u) => u.id === userId)

    assert.strictEqual(user.blogs.length, 1)
    assert.strictEqual(user.blogs[0].id, created.body.id)
    assert.strictEqual(user.blogs[0].title, 'AI blog')
    assert.strictEqual(user.blogs[0].url, 'https://ai.example')
  })
})

describe('4.18: token based login', () => {
  test('correct credentials return a JWT and basic user info', async () => {
    const response = await login('aiuser', SEED_PASSWORD).expect(200)

    assert.strictEqual(typeof response.body.token, 'string')
    assert.strictEqual(response.body.token.split('.').length, 3)
    assert.strictEqual(response.body.username, 'aiuser')
    assert.strictEqual(response.body.name, 'AI User')
    assert.strictEqual(response.body.passwordHash, undefined)
  })

  test('wrong password returns 401', async () => {
    const response = await login('aiuser', 'wrongpassword').expect(401)
    assert.strictEqual(response.body.error, 'invalid username or password')
  })

  test('unknown username returns 401', async () => {
    await login('doesnotexist', SEED_PASSWORD).expect(401)
  })
})

describe('4.19: creating a blog requires a valid token', () => {
  test('request without a token returns 401', async () => {
    const response = await api
      .post('/api/blogs')
      .send({ title: 'No token', url: 'https://no-token.example' })
      .expect(401)

    assert.match(response.body.error, /token/i)
    assert.strictEqual(await Blog.countDocuments(), 0)
  })

  test('request with an invalid token returns 401', async () => {
    await api
      .post('/api/blogs')
      .set('Authorization', 'Bearer not.a.real.token')
      .send({ title: 'Bad token', url: 'https://bad-token.example' })
      .expect(401)

    assert.strictEqual(await Blog.countDocuments(), 0)
  })

  test('request with a valid token creates the blog for that user', async () => {
    const response = await createBlog(token).expect(201)
    assert.strictEqual(response.body.user.id, userId)
  })
})

describe('4.20: tokenExtractor middleware', () => {
  test('token must be sent with the "Bearer " prefix', async () => {
    await api
      .post('/api/blogs')
      .set('Authorization', token)
      .send({ title: 'No Bearer', url: 'https://no-bearer.example' })
      .expect(401)
  })

  test('wrong authorization scheme is ignored', async () => {
    await api
      .post('/api/blogs')
      .set('Authorization', `Token ${token}`)
      .send({ title: 'Wrong scheme', url: 'https://wrong-scheme.example' })
      .expect(401)
  })

  test('proper Bearer header gives access to the token', async () => {
    const response = await createBlog(token).expect(201)
    assert.ok(response.body.id)
  })
})

describe('4.21: only the creator can delete a blog', () => {
  let otherToken

  beforeEach(async () => {
    await createUser({ username: 'otheruser', name: 'Other User', password: 'otherpass' })
      .expect(201)
    const logged = await login('otheruser', 'otherpass').expect(200)
    otherToken = logged.body.token
  })

  test('creator can delete their own blog', async () => {
    const created = await createBlog(token).expect(201)

    await api
      .delete(`/api/blogs/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    assert.strictEqual(await Blog.countDocuments(), 0)
  })

  test('another user gets 403 and the blog is not deleted', async () => {
    const created = await createBlog(token).expect(201)

    const response = await api
      .delete(`/api/blogs/${created.body.id}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .expect(403)

    assert.match(response.body.error, /creator/i)
    assert.strictEqual(await Blog.countDocuments(), 1)
  })

  test('deleting without a token returns 401', async () => {
    const created = await createBlog(token).expect(201)

    await api.delete(`/api/blogs/${created.body.id}`).expect(401)
    assert.strictEqual(await Blog.countDocuments(), 1)
  })

  test('deleting a non existing blog returns 404', async () => {
    await api
      .delete('/api/blogs/6ae047a8b8586f8e1939ebaa')
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
  })
})

describe('4.22: userExtractor is used only where needed', () => {
  test('GET /api/blogs works without a token', async () => {
    await createBlog(token).expect(201)

    const response = await api.get('/api/blogs').expect(200)
    assert.strictEqual(response.body.length, 1)
  })

  test('GET /api/users works without a token', async () => {
    await api.get('/api/users').expect(200)
  })

  test('deleted blog is removed from user.blogs', async () => {
    const created = await createBlog(token).expect(201)

    await api
      .delete(`/api/blogs/${created.body.id}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(204)

    const user = await User.findById(userId)
    assert.strictEqual(user.blogs.length, 0)
  })
})

describe('4.23: blog creation tests fixed for token authentication', () => {
  test('creating a blog with a token returns 201 and likes default to 0', async () => {
    const response = await createBlog(token, { title: 'With token', url: 'https://token.example' })
      .expect(201)
      .expect('Content-Type', /application\/json/)

    assert.strictEqual(response.body.likes, 0)
    assert.strictEqual(response.body.title, 'With token')
  })

  test('creating a blog without a token returns 401 Unauthorized', async () => {
    await api
      .post('/api/blogs')
      .send({ title: 'Without token', url: 'https://no-token.example' })
      .expect(401)
  })

  test('creating a blog with a token but without title returns 400', async () => {
    await createBlog(token, { title: undefined }).expect(400)

    const blogs = await Blog.find({})
    assert.strictEqual(blogs.length, 0)
  })
})
