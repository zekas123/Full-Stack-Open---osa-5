import { useState } from 'react';

function LoginForm({ setUser }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    const credentials = { username, password };
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', 
        },
        body: JSON.stringify(credentials), 
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Wrong username or password');
      }

      const userData = await response.json();

      window.localStorage.setItem('loggedBlogAppUser', JSON.stringify(userData));
      setUser(userData);
      setUsername('');
      setPassword('');
    } catch (error) {
      console.error('Ошибка авторизации:', error);
      alert(error.message);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <h2>log in to application</h2>
      
      <div>
        <label>username </label>
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>

      <div>
        <label>password </label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>

      <button type="submit">login</button>
    </form>
  );
}

export default LoginForm;