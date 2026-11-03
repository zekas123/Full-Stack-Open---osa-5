import { useState, useEffect } from 'react';
import Blog from './components/Blog';
import blogService from './services/blogs';
import LoginForm from './log_win';
import Message from './components/erors';

const App = () => {
  const [blogs, setBlogs] = useState([]);
  const [user, setUser] = useState(null);
  const [message, setMessage] = useState(null);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [url, setUrl] = useState('');

  useEffect(() => {
    blogService.getAll()
      .then(initialBlogs => setBlogs(initialBlogs))
      .catch(error => console.error('Ошибка загрузки блогов:', error));
  }, []);

  useEffect(() => {
    const loggedUserJSON = window.localStorage.getItem('loggedBlogAppUser');
    if (!loggedUserJSON) return;

    try {
      const parsedUser = JSON.parse(loggedUserJSON);
      setUser(parsedUser);
    } catch (error) {
      console.error('Битые данные пользователя в localStorage:', error);
      window.localStorage.removeItem('loggedBlogAppUser');
    }
  }, []);

  useEffect(() => {
    blogService.setToken(user ? user.token : null);
  }, [user]);

  const showMessage = (text) => {
    setMessage(text);
    setTimeout(() => setMessage(null), 5000);
  };

  const handleLogout = () => {
    window.localStorage.removeItem('loggedBlogAppUser');
    setUser(null);
  };

  const handleCreateBlog = async (event) => {
    event.preventDefault();

    try {
      const newBlog = await blogService.create({ title, author, url });
      setBlogs(blogs.concat(newBlog));

      setTitle('');
      setAuthor('');
      setUrl('');
    } catch (error) {
      console.error('Error creating blog:', error);
      showMessage('Failed to create blog');
    }
  };

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
          
          <h2>create new</h2>
          <form onSubmit={handleCreateBlog}>
            <div>
              title:
              <input
                type="text"
                value={title}
                onChange={({ target }) => setTitle(target.value)}
                required
              />
            </div>
            <div>
              author:
              <input
                type="text"
                value={author}
                onChange={({ target }) => setAuthor(target.value)}
              />
            </div>
            <div>
              url:
              <input
                type="text"
                value={url}
                onChange={({ target }) => setUrl(target.value)}
                required
              />
            </div>
            <button type="submit">create</button>
          </form>

          {blogs.map(blog => (
            <Blog key={blog.id} blog={blog} />
          ))}
        </div>
      )}
    </div>
  );
};

export default App;