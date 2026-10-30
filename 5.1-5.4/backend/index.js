const app = require('./app')
const config = require('./utils/config')
const { connectToDatabase } = require('./utils/db')

const start = async () => {
  try {
    await connectToDatabase()

    app.listen(config.PORT, () => {
      console.log(`Server running on port ${config.PORT}`)
    })
  } catch (error) {
    console.error('error connection to MongoDB:', error.message)
    process.exit(1)
  }
}

start()
