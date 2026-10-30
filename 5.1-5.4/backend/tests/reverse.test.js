const { test, describe, after, before, beforeEach } = require('node:test')
const assert = require('node:assert')
const mongoose = require('mongoose')
const supertest = require('supertest')
const app = require('../app')
const config = require('../utils/config')
const Blog = require('../models/blog') 
const listHelper = require('../utils/list_helper')
const helper = require('../utils/list_helper')
const { favoriteBlog } = require('../utils/list_helper')
const blog = require('../models/blog')
const bcrypt = require('bcrypt')
const User = require('../models/user')


const api = supertest(app)

const lol_blog = [
  {
    title: "React patterns",
    author: "Michael Chan",
    url: "https://reactpatterns.com/",
    likes: 7
  },
  {
    title: "Go To Statement Considered Harmful",
    author: "Edsger W. Dijkstra",
    url: "http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html",
    likes: 5
  },
  {
    title: "Canonical string reduction",
    author: "Edsger W. Dijkstra",
    url: "http://www.cs.utexas.edu/~EWD/transcriptions/EWD08xx/EWD808.html",
    likes: 12
  }
]

describe('unit tests (list helper)', () => {
  test('dummy returns one', () => {
    const blogs = []
    const result = listHelper.dummy(blogs)
    assert.strictEqual(result, 1)
  })

  describe('total likes', () => {
    const listWithOneBlog = [
      {
        _id: '5a422aa71b54a676234d17f8',
        title: 'Go To Statement Considered Harmful',
        author: 'Edsger W. Dijkstra',
        url: 'http://www.u.arizona.edu/~rubinson/copyright_violations/Go_To_Considered_Harmful.html',
        likes: 5,
        __v: 0
      }
    ]

    test('when list has only one blog equals the likes of that', () => {
      const result = listHelper.totalLikes(listWithOneBlog)
      assert.strictEqual(result, 5)
    })
  })

  describe('favorite blog', () => {
    const listWithMultipleBlogs = [
      {
        title: 'Canonical string reduction',
        author: 'Edsger W. Dijkstra',
        likes: 12
      },
      {
        title: 'First class tests',
        author: 'Robert C. Martin',
        likes: 10
      }
    ]

    test('finds the blog with most likes', () => {
      const result = favoriteBlog(listWithMultipleBlogs)
      assert.deepStrictEqual(result, listWithMultipleBlogs[0])
    })

    test('when list is empty returns null', () => {
      const result = favoriteBlog([])
      assert.strictEqual(result, null)
    })
  })

  describe('most blogs', () => {
    const listWithSeveralBlogs = [
      { title: 'React rules', author: 'Michael Chan', likes: 7 },
      { title: 'Go To Statement Considered Harmful', author: 'Edsger W. Dijkstra', likes: 5 },
      { title: 'Canonical string reduction', author: 'Edsger W. Dijkstra', likes: 12 },
      { title: 'First class tests', author: 'Robert C. Martin', likes: 10 },
      { title: 'TDD harms architecture', author: 'Robert C. Martin', likes: 0 },
      { title: 'Type wars', author: 'Robert C. Martin', likes: 2 }
    ]

    test('author with the most blogs', () => {
      const result = listHelper.mostBlogs(listWithSeveralBlogs)
      assert.deepStrictEqual(result, {
        author: 'Robert C. Martin',
        blogs: 3
      })
    })

    test('when list is empty returns null', () => {
      const result = listHelper.mostBlogs([])
      assert.strictEqual(result, null)
    })
  })

  describe('most likes', () => {
    const listWithSeveralBlogs = [
      { title: 'React rules', author: 'Michael Chan', likes: 7 },
      { title: 'Go To Statement Considered Harmful', author: 'Edsger W. Dijkstra', likes: 5 },
      { title: 'Canonical string reduction', author: 'Edsger W. Dijkstra', likes: 12 },
      { title: 'First class tests', author: 'Robert C. Martin', likes: 10 },
      { title: 'TDD harms architecture', author: 'Robert C. Martin', likes: 0 },
      { title: 'Type wars', author: 'Robert C. Martin', likes: 2 }
    ]

    test('author whose blogs have the most likes', () => {
      const result = listHelper.mostLikes(listWithSeveralBlogs)
      assert.deepStrictEqual(result, {
        author: 'Edsger W. Dijkstra',
        likes: 17
      })
    })

    test('when list is empty returns null', () => {
      const result = listHelper.mostLikes([])
      assert.strictEqual(result, null)
    })
  })
})







describe('api tests', () => {
  let testUser
  let testToken

  before(async () => {
    await User.deleteMany({})
    const passwordHash = await bcrypt.hash('testpass', 10)
    testUser = await new User({ username: 'testuser', name: 'Test User', passwordHash }).save()

    const loginResponse = await api
      .post('/api/login')
      .send({ username: 'testuser', password: 'testpass' })
    testToken = loginResponse.body.token
  })

  beforeEach(async () => {
    await Blog.deleteMany({})
    await Blog.insertMany(lol_blog.map(blog => ({ ...blog, user: testUser._id })))
  })

  test('how many blogs', async () => {
    const response = await api
      .get('/api/blogs')
      .expect(200)

    assert.strictEqual(response.body.length, lol_blog.length)
  })

  test('check ID', async () => {
    const response = await api
      .get('/api/blogs')
      .expect(200)

    for (const blog of response.body) {
      assert.ok(blog.id)
      assert.strictEqual(blog._id, undefined)
    }
  })

  test('if likes parameter is missing, it defaults to 0', async () => {
  const newBlogWithoutLikes = {
    title: 'Blog without likes',
    author: 'Some Author',
    url: 'https://example.com'

  }


  const response = await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${testToken}`)
    .send(newBlogWithoutLikes)
    .expect(201)
    .expect('Content-Type', /application\/json/)

  assert.strictEqual(response.body.likes, 0)
})


test('blog cannot be added without a token', async () => {
  await api
    .post('/api/blogs')
    .send({ title: 'No token', url: 'https://example.com' })
    .expect(401)

  const response = await api.get('/api/blogs')
  assert.strictEqual(response.body.length, lol_blog.length)
})


test('blog without title is not added', async () => {
  const newBlogWithoutTitle = {
    author: 'Author Name',
    url: 'https://example.com',
    likes: 2

  }

  await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${testToken}`)
    .send(newBlogWithoutTitle)
    .expect(400)

  const response = await api.get('/api/blogs')
  assert.strictEqual(response.body.length, lol_blog.length)
})


test('blog without url is not added', async () => {
  const newBlogWithoutUrl = {
    title: 'Blog without url',
    author: 'Author Name',
    likes: 2
  }

  await api
    .post('/api/blogs')
    .set('Authorization', `Bearer ${testToken}`)
    .send(newBlogWithoutUrl)
    .expect(400)

  const response = await api.get('/api/blogs')
  assert.strictEqual(response.body.length, lol_blog.length)
})

test('a blog can be deleted', async () => {

  const blogsAtStart = await Blog.find({})
  const blogToDelete = blogsAtStart[0]

  await api
    .delete(`/api/blogs/${blogToDelete.id}`)
    .set('Authorization', `Bearer ${testToken}`)
    .expect(204)

  const blogsAtEnd = await Blog.find({})

  assert.strictEqual(blogsAtEnd.length, blogsAtStart.length - 1)

  const titles = blogsAtEnd.map(b => b.title)
  assert.ok(!titles.includes(blogToDelete.title))
})
test('a blog can be updated (only likes=)', async () => {
  const blogsAtStart = await Blog.find({})
  const blogToUpdate = blogsAtStart[0]

  const updatedLikes = 1515212

  const response = await api
    .patch(`/api/blogs/${blogToUpdate.id}`)
    .send({ likes: updatedLikes })
    .expect(200)
    .expect('Content-Type', /application\/json/)
  assert.strictEqual(response.body.likes, updatedLikes)
  const updatedBlogInDb = await Blog.findById(blogToUpdate.id)
  assert.strictEqual(updatedBlogInDb.likes, updatedLikes)
})

})


before(async () => {

  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(config.mongoUrl, {
      family: 4,
      serverSelectionTimeoutMS: 5000,
    })
  } else if (mongoose.connection.readyState === 2) {
    await mongoose.connection.asPromise()
  }
})

describe('when there is initially one user at db', () => {
  beforeEach(async () => {
    await User.deleteMany({})

    const passwordHash = await bcrypt.hash('sekret', 10)
    const user = new User({ username: 'root', passwordHash })

    await user.save()
  })

  test('creation succeeds with a fresh username', async () => {
    const usersAtStart = await helper.usersInDb()

    const newUser = {
      username: 'mluukkai',
      name: 'Matti Luukkainen',
      password: 'salainen',
    }

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/)

    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length + 1)

    const usernames = usersAtEnd.map(u => u.username)
    assert(usernames.includes(newUser.username))
  })
})
describe('when creating a user with a duplicate username', () => {
  beforeEach(async () => {
    await User.deleteMany({}) 

    const initialUser = {
      username: 'mluukkai',
      name: 'Matti Luukkainen',
      password: 'salainen',
    }

    // Создаем первого пользователя (успешно)
    await api
      .post('/api/users')
      .send(initialUser)
      .expect(201)
  })

  test('creation fails with proper statuscode and message if username is already taken', async () => {
    const usersAtStart = await helper.usersInDb()

    const duplicateUser = {
      username: 'mluukkai', 
      name: 'Matti Luukkainen',
      password: 'salainen',
    }

    // Второй запрос с тем же логином должен упасть с 400
    const result = await api
      .post('/api/users')
      .send(duplicateUser)
      .expect(400)
      .expect('Content-Type', /application\/json/)

    // Проверяем, что в теле ответа есть текст ошибки
    assert(result.body.error.includes('expected `username` to be unique'))

    // Проверяем, что база не изменилась (пользователь не добавился)
    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })
})
test('username have <3 leght', async () => {
  beforeEach(async () => {
    await User.deleteMany({}) 

    const initialUser = {
      username: 'ml',
      name: 'Matti Luukkainen',
      password: 'salainen',
    }

     
    await api
      .post('/api/users')
      .send(initialUser)
      .expect(400)

    assert(result.body.error.includes('expected `username` to be unique'))


    const usersAtEnd = await helper.usersInDb()
    assert.strictEqual(usersAtEnd.length, usersAtStart.length)
  })

})

after(async () => {
  await mongoose.connection.close()
})
