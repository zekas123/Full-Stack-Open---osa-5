const meRouter = require('express').Router()
const userExtractor = require('../middleware/userExtractor')

meRouter.get('/', userExtractor, async (request, response) => {
  await request.user.populate('blogs', {
    url: 1,
    title: 1,
    author: 1,
    likes: 1,
    comments: 1,
  })

  response.json(request.user)
})

module.exports = meRouter
