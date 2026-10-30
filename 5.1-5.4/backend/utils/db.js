const mongoose = require('mongoose')
const config = require('./config')

const connectToDatabase = async () => {
  const start = Date.now()
  console.log('connecting to MongoDB...')

  await mongoose.connect(config.mongoUrl, {
    family: 4,
    serverSelectionTimeoutMS: 5000,
    bufferTimeoutMS: 5000,
  })

  console.log(`connected to MongoDB in ${Date.now() - start} ms`)
}

module.exports = { connectToDatabase }
