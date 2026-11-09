
const dummy = (blogs) => {
  return 1
}
const totalLikes = (blogs) =>{
    return blogs.reduce((sum, blog) => sum + blog.likes, 0)
}
const favoriteBlog = (blogs) =>{
  if (blogs.length === 0){
    return null 
  }
  return blogs.reduce((prev, current) =>{
    return(current.likes>prev.likes)?current:prev
  })
    
}
const mostBlogs = (blogs) =>{
  if (blogs.length === 0){
    return null
  }

  const blogsByAuthor = {}
  blogs.forEach((blog) => {
    blogsByAuthor[blog.author] = (blogsByAuthor[blog.author] || 0) + 1
  })

  const [author, blogsCount] = Object.entries(blogsByAuthor)
    .reduce((prev, current) => (current[1] > prev[1]) ? current : prev)

  return { author, blogs: blogsCount }
}

const mostLikes = (blogs) =>{
  if (blogs.length === 0){
    return null
  }

  const likesByAuthor = {}
  blogs.forEach((blog) => {
    likesByAuthor[blog.author] = (likesByAuthor[blog.author] || 0) + blog.likes
  })

  const [author, totalLikesCount] = Object.entries(likesByAuthor)
    .reduce((prev, current) => (current[1] > prev[1]) ? current : prev)

  return { author, likes: totalLikesCount }
}

const User = require('../models/user')

const usersInDb = async () => {
  const users = await User.find({})
  return users.map(u => u.toJSON())
}



module.exports = {
  mostBlogs,
  mostLikes,
  favoriteBlog,
  dummy,
  totalLikes,
  usersInDb,
}
