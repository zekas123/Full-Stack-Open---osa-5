import blogService from '../services/blogs'

const SortByLikes = async (blogs, setBlogs) => {
  const sortedBlogs = await blogService.getAll()
    .then(blogs => blogs.sort((a, b) => b.likes - a.likes))
    .catch(error => console.error('Ошибка сортировки блогов:', error))
  setBlogs(sortedBlogs)
}




export default SortByLikes