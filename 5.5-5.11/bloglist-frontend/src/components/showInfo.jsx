import likeBlog from "./LikeBlog"
import removeBlog from "./removeBlog"

const ShowInfo = ({ blog, updateBlog, setBlogs }) => {
  return (
    <div>
      <p>URL: {blog.url}</p>
      <p>
        Likes: {blog.likes}{' '}
        <button onClick={() => likeBlog(blog, updateBlog)}>
          like
        </button>
      </p> 
      <p>Added by: {blog.user?.name || blog.user?.username}</p>
      <button onClick={() => removeBlog(blog, setBlogs)}>remove</button>
    </div>
  )
}

export default ShowInfo