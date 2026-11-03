
const Message = ({ message }) => {
  if (message === null) {
    return null
  }
  else if (message.startsWith('Failed to create blog')) {
    return (
      <div className="addBlogMessageFailed">
        {message}
      </div>
    )
  }
  else if (message.startsWith('Wrong username or password')) {
    return (
      <div className="WrongUserOrPassword">
        {message}
      </div>
    )
  }

  return <div className="message">{message}</div>
}

export default Message