import { useState, useEffect, useRef } from 'react'
import Blog from './components/Blog'
import BlogForm from './components/BlogForm'
import Togglable from './components/Togglable'
import blogService from './services/blogs'
import LoginForm from './log_win'
import Message from './components/erors'
import ShowInfo from './components/showInfo'
import SortByLikes from './components/sortedBlogs'

const blogStyle = {
    paddingTop: 10,
    paddingLeft: 2,
    border: 'solid',
    borderWidth: 1,
    marginBottom: 5
  }


const App = () => {
  const [blogs, setBlogs] = useState([])
  const [user, setUser] = useState(null)
  const [message, setMessage] = useState(null)

  const blogFormRef = useRef()

  useEffect(() => {
    blogService.getAll()
      .then(initialBlogs => setBlogs(initialBlogs))
      .catch(error => console.error('Ошибка загрузки блогов:', error))
  }, [])

  useEffect(() => {
    const loggedUserJSON = window.localStorage.getItem('loggedBlogAppUser')
    if (!loggedUserJSON) return

    try {
      const parsedUser = JSON.parse(loggedUserJSON)
      setUser(parsedUser)
    } catch (error) {
      console.error('Битые данные пользователя в localStorage:', error)
      window.localStorage.removeItem('loggedBlogAppUser')
    }
  }, [])

  useEffect(() => {
    blogService.setToken(user ? user.token : null)
  }, [user])

  const showMessage = (text) => {
    setMessage(text)
    setTimeout(() => setMessage(null), 5000)
  }

  const handleLogout = () => {
    window.localStorage.removeItem('loggedBlogAppUser')
    setUser(null)
  }

  const handleCreateBlog = async (blogObject) => {
    try {
      const newBlog = await blogService.create(blogObject)
      setBlogs(blogs.concat(newBlog))

      blogFormRef.current.toggleVisibility()

      showMessage(`a new blog '${newBlog.title}' by ${newBlog.author || 'unknown'} added`)
    } catch (error) {
      console.error('Error creating blog:', error)
      showMessage('Failed to create blog')
    }
  }

  const handleUpdateBlog = (updatedBlog) => {
    setBlogs(blogs.map(blog => blog.id === updatedBlog.id ? updatedBlog : blog))
  }

  return (
    <div>
      <Message message={message} />

      {!user && <LoginForm setUser={setUser} setMessage={showMessage} />}

      {user && (
        <div>
          <h2>blogs</h2>
          <div>
            <span>{user.name || user.username} logged in</span>{' '}
            <button type="button" onClick={handleLogout}>logout</button>
          </div>

          <Togglable buttonLabel="new blog" ref={blogFormRef}>
            <BlogForm createBlog={handleCreateBlog} />
          </Togglable>
          <p>Sorted by <button onClick={() => SortByLikes(blogs, setBlogs)}>likes</button></p> 
          {blogs.map(blog => (
              <div key={blog.id} style={blogStyle}>
                <Blog blog={blog} />
                <Togglable buttonLabel="view">
                    <ShowInfo blog={blog} updateBlog={handleUpdateBlog} setBlogs={setBlogs} />
                </Togglable>
              </div>
            ))}
        </div>
      )}
    </div>
  )
}

export default App