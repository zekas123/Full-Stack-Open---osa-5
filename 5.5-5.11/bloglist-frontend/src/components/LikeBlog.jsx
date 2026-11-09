import blogService from '../services/blogs'

const likeBlog = async (blog, updateBlog) => {
  const updatedBlog = await blogService.update(blog.id, {
    likes: blog.likes + 1,
  })

  updateBlog(updatedBlog)
}

export default likeBlog
