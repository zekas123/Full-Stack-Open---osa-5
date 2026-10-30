const jwt = require('jsonwebtoken')
const User = require('../models/user')

// Sets request.user when a valid token is present, but never rejects the request.
const optionalUser = async (request, response, next) => {
  request.user = null

  if (!request.token) {
    return next()
  }

  try {
    const decodedToken = jwt.verify(request.token, process.env.SECRET)

    if (decodedToken.id) {
      request.user = await User.findById(decodedToken.id)
    }
  } catch (error) {
    request.user = null
  }

  next()
}

module.exports = optionalUser
