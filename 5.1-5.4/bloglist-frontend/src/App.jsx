import { useState, useEffect } from 'react';
import Blog from './components/Blog';
import blogService from './services/blogs';
import LoginForm from './log_win';

const App = () => {
  const [blogs, setBlogs] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    blogService.getAll()
      .then(blogs => setBlogs(blogs))
      .catch(error => console.error('Ошибка загрузки блогов:', error));
  }, []);


  useEffect(() => {
    const loggedUserJSON = window.localStorage.getItem('loggedBlogAppUser');
    if (!loggedUserJSON) return;

    try {
      setUser(JSON.parse(loggedUserJSON));
    } catch (error) {
      console.error('Битые данные пользователя в localStorage:', error);
      window.localStorage.removeItem('loggedBlogAppUser');
    }
  }, []);

  const handleLogout = () => {
    window.localStorage.removeItem('loggedBlogAppUser');
    setUser(null);
  };

  return (
    <div>

      {!user && <LoginForm setUser={setUser} />}


      {user && (
        <div>
          <h2>blogs</h2>
          <p>
            {user.name || user.username} logged in{' '}
            <button onClick={handleLogout}>logout</button>
          </p>

          {blogs.map(blog =>
            <Blog key={blog.id} blog={blog} />
          )}
        </div>
      )}
    </div>
  );
};

export default App;