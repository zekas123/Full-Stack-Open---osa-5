const blogsRouter = require('express').Router()
const Blog = require('../models/blog')
const userExtractor = require('../middleware/userExtractor')
const optionalUser = require('../middleware/optionalUser')

const PUBLIC_USER_FIELDS = { username: 1, name: 1 }
const EDITABLE_FIELDS = ['title', 'author', 'url', 'likes']
const SORTABLE = ['likes', '-likes', 'title', '-title', 'createdAt', '-createdAt']

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const pick = (source, keys) => keys.reduce((result, key) => {
  if (source[key] !== undefined) result[key] = source[key]
  return result
}, {})

const isOwner = (blog, user) =>
  Boolean(user && blog.user && blog.user.toString() === user._id.toString())

const findBlogOr404 = async (id) => {
  const blog = await Blog.findById(id)
  if (!blog) return null
  await blog.populate('user', PUBLIC_USER_FIELDS)
  return blog
}

const validateBlogBody = (body) => {
  if (body.title !== undefined && (typeof body.title !== 'string' || !body.title.trim())) {
    return 'title must be a non-empty string'
  }
  if (body.url !== undefined && (typeof body.url !== 'string' || !body.url.trim())) {
    return 'url must be a non-empty string'
  }
  if (body.likes !== undefined && (!Number.isInteger(body.likes) || body.likes < 0)) {
    return 'likes must be a non-negative integer'
  }
  return null
}

/* GET /api/blogs?search=&author=&sort=-createdAt&page=1&limit=10 */
blogsRouter.get('/', async (request, response) => {
  const { search, author, sort, page, limit } = request.query

  const filter = {}

  if (author) {
    filter.author = new RegExp(escapeRegex(String(author)), 'i')
  }

  if (search) {
    const regex = new RegExp(escapeRegex(String(search)), 'i')
    filter.$or = [{ title: regex }, { author: regex }]
  }

  const query = Blog.find(filter).populate('user', PUBLIC_USER_FIELDS)

  query.sort(SORTABLE.includes(sort) ? sort : '-createdAt')

  if (page !== undefined || limit !== undefined) {
    const pageNumber = Math.max(1, Number.parseInt(page, 10) || 1)
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 10))
    query.skip((pageNumber - 1) * pageSize).limit(pageSize)
  }

  const blogs = await query
  response.json(blogs)
})

/* GET /api/blogs/:id */
blogsRouter.get('/:id', async (request, response) => {
  const blog = await findBlogOr404(request.params.id)

  if (!blog) {
    return response.status(404).json({ error: 'blog not found' })
  }

  response.json(blog)
})

/* POST /api/blogs */
blogsRouter.post('/', userExtractor, async (request, response) => {
  const { title, url } = request.body

  if (!title || !url) {
    return response.status(400).json({ error: 'title and url are required' })
  }

  const validationError = validateBlogBody(request.body)
  if (validationError) {
    return response.status(400).json({ error: validationError })
  }

  const blog = new Blog({
    ...pick(request.body, EDITABLE_FIELDS),
    user: request.user._id,
  })

  const savedBlog = await blog.save()

  request.user.blogs = request.user.blogs.concat(savedBlog._id)
  await request.user.save()

  await savedBlog.populate('user', PUBLIC_USER_FIELDS)
  response.status(201).json(savedBlog)
})

/* PUT /api/blogs/:id — replace a blog (creator only) */
blogsRouter.put('/:id', userExtractor, async (request, response) => {
  const blog = await Blog.findById(request.params.id)

  if (!blog) {
    return response.status(404).json({ error: 'blog not found' })
  }

  if (!isOwner(blog, request.user)) {
    return response.status(403).json({ error: 'only the creator can edit this blog' })
  }

  const validationError = validateBlogBody(request.body)
  if (validationError) {
    return response.status(400).json({ error: validationError })
  }

  const updatedBlog = await Blog.findByIdAndUpdate(
    request.params.id,
    pick(request.body, EDITABLE_FIELDS),
    { returnDocument: 'after', runValidators: true, context: 'query' }
  ).populate('user', PUBLIC_USER_FIELDS)

  response.json(updatedBlog)
})

/* PATCH /api/blogs/:id — likes are public, other fields are creator only */
blogsRouter.patch('/:id', optionalUser, async (request, response) => {
  const blog = await Blog.findById(request.params.id)

  if (!blog) {
    return response.status(404).json({ error: 'blog not found' })
  }

  const validationError = validateBlogBody(request.body)
  if (validationError) {
    return response.status(400).json({ error: validationError })
  }

  const changes = pick(request.body, EDITABLE_FIELDS)
  const editsContent = ['title', 'author', 'url'].some((field) => changes[field] !== undefined)

  if (editsContent) {
    if (!request.user) {
      return response.status(401).json({ error: 'token missing or invalid' })
    }
    if (!isOwner(blog, request.user)) {
      return response.status(403).json({ error: 'only the creator can edit this blog' })
    }
  }

  Object.assign(blog, changes)
  const updatedBlog = await blog.save()
  await updatedBlog.populate('user', PUBLIC_USER_FIELDS)

  response.json(updatedBlog)
})

/* POST /api/blogs/:id/comments */
blogsRouter.post('/:id/comments', optionalUser, async (request, response) => {
  const { comment } = request.body

  if (typeof comment !== 'string' || !comment.trim()) {
    return response.status(400).json({ error: 'comment is required' })
  }

  const blog = await Blog.findById(request.params.id)

  if (!blog) {
    return response.status(404).json({ error: 'blog not found' })
  }

  blog.comments = blog.comments.concat(comment.trim())
  const updatedBlog = await blog.save()
  await updatedBlog.populate('user', PUBLIC_USER_FIELDS)

  response.status(201).json(updatedBlog)
})

/* DELETE /api/blogs/:id — creator only */
blogsRouter.delete('/:id', userExtractor, async (request, response) => {
  const { id } = request.params
  const user = request.user

  const blog = await Blog.findById(id)

  if (!blog) {
    return response.status(404).json({ error: 'blog not found' })
  }

  if (!isOwner(blog, user)) {
    return response.status(403).json({ error: 'only the creator can delete this blog' })
  }

  await blog.deleteOne()

  user.blogs = user.blogs.filter((blogId) => blogId.toString() !== id)
  await user.save()

  response.status(204).end()
})

module.exports = blogsRouter
