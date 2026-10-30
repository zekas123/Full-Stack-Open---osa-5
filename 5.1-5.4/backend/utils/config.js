require('dotenv').config({ quiet: true })

const PORT = 3003
const mongoUrl = `mongodb+srv://newqwe:J7cffcHyxah2Guxo@cluster0.m0li5t8.mongodb.net/bloglist?retryWrites=true&w=majority&appName=Cluster0`

module.exports = {
  PORT,
  mongoUrl
}
