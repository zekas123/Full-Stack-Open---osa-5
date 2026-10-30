const express = require('express')
const mongoose = require('mongoose')

const app = express()

const blogsRouter = require('./controllers/blogs')
const usersRouter = require('./controllers/users')
const loginRouter = require('./controllers/login')
const meRouter = require('./controllers/me')
const tokenExtractor = require('./middleware/tokenExtractor')
const errorHandler = require('./middleware/errorHandler')

app.use(express.json())
app.use(tokenExtractor)

// Minimal CORS so the React dev server can talk to the API during development.
app.use((request, response, next) => {
  response.header('Access-Control-Allow-Origin', '*')
  response.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization')
  response.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')

  if (request.method === 'OPTIONS') {
    return response.sendStatus(204)
  }

  next()
})

app.get('/', (request, response) => {
  response.json({ status: 'ok', api: '/api' })
})

app.get('/api', (request, response) => {
  response.json({
    auth: {
      register: 'POST /api/users',
      login: 'POST /api/login',
      currentUser: 'GET /api/me',
    },
    blogs: {
      list: 'GET /api/blogs?search=&author=&sort=&page=&limit=',
      one: 'GET /api/blogs/:id',
      create: 'POST /api/blogs',
      replace: 'PUT /api/blogs/:id',
      updateLikes: 'PATCH /api/blogs/:id { "likes": 1 }',
      addComment: 'POST /api/blogs/:id/comments { "comment": "text" }',
      remove: 'DELETE /api/blogs/:id',
    },
    users: {
      list: 'GET /api/users',
      one: 'GET /api/users/:id',
      create: 'POST /api/users',
    },
    health: 'GET /api/health',
  })
})

app.get('/api/health', (request, response) => {
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting']
  response.json({ status: 'ok', database: states[mongoose.connection.readyState] || 'unknown' })
})

app.use('/api/blogs', blogsRouter)
app.use('/api/users', usersRouter)
app.use('/api/login', loginRouter)
app.use('/api/me', meRouter)

app.use((request, response) => {
  response.status(404).json({ error: 'unknown endpoint' })
})

app.use(errorHandler)

module.exports = app
