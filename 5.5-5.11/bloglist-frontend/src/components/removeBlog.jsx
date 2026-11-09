import blogService from '../services/blogs'

const removeBlog = async (blog, setBlogs) => {
  const confirmDelete = window.confirm(
    `Remove blog "${blog.title}" by ${blog.author}?`
  )

  if (!confirmDelete) {
    return
  }

  try {
    await blogService.remove(blog.id)
    setBlogs(prevBlogs => prevBlogs.filter(b => b.id !== blog.id))
  } catch (error) {
    console.error('Failed to delete blog:', error)
    alert('Failed to delete the blog. Make sure you are authorized.')
  }
}

export default removeBlog