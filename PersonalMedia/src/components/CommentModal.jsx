import { useState, useEffect, useRef } from 'react'
import apiService from '../services/api.js'
import './CommentModal.css'

function CommentModal({ item, onClose, currentUser = '用户' }) {
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [replyTo, setReplyTo] = useState(null)
  const [loading, setLoading] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    loadComments()
  }, [item.id])

  const loadComments = async () => {
    try {
      setLoading(true)
      const data = await apiService.getComments(item.id)
      setComments(data)
    } catch (error) {
      console.error('Failed to load comments:', error)
    } finally {
      setLoading(false)
    }
  }

  const getTotalCommentCount = () => {
    let count = 0
    comments.forEach(comment => {
      count++ // Main comment
      if (comment.replies) {
        count += comment.replies.length // Replies
      }
    })
    return count
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      const replyToId = replyTo ? replyTo.id : null
      await apiService.addComment(
        item.id,
        newComment.trim(),
        currentUser,
        replyToId
      )

      // Reload comments to get updated list
      await loadComments()
      setNewComment('')
      setReplyTo(null)
    } catch (error) {
      console.error('Failed to add comment:', error)
      alert('评论失败，请重试')
    }
  }

  const handleDelete = async (commentId, parentId = null) => {
    if (!window.confirm('确定要删除这条评论吗？')) return

    try {
      await apiService.deleteComment(item.id, commentId, parentId)
      // Reload comments to get updated list
      await loadComments()
    } catch (error) {
      console.error('Failed to delete comment:', error)
      alert('删除失败，请重试')
    }
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleReply = (comment) => {
    setReplyTo(comment)
    // Use setTimeout to ensure focus after state update
    setTimeout(() => {
      inputRef.current?.focus()
    }, 0)
  }

  const cancelReply = () => {
    setReplyTo(null)
  }

  const renderComment = (comment, isReply = false, parentId = null) => (
    <div key={comment.id} className={`comment-item ${isReply ? 'reply' : ''}`}>
      <div className="comment-avatar">
        {comment.author.charAt(0).toUpperCase()}
      </div>
      <div className="comment-content">
        <div className="comment-header">
          <span className="comment-author">{comment.author}</span>
          <span className="comment-time">{formatDate(comment.timestamp)}</span>
        </div>
        <p className="comment-text">{comment.content}</p>
        <div className="comment-actions">
          {!isReply && (
            <button
              className="comment-action-btn reply-btn"
              onClick={() => handleReply(comment)}
            >
              回复
            </button>
          )}
          {comment.author === currentUser && (
            <button
              className="comment-action-btn delete-btn"
              onClick={() => handleDelete(comment.id, parentId)}
            >
              删除
            </button>
          )}
        </div>

        {comment.replies && comment.replies.length > 0 && (
          <div className="replies-list">
            {comment.replies.map(reply => renderComment(reply, true, comment.id))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="comment-modal-overlay" onClick={onClose}>
      <div className="comment-modal" onClick={e => e.stopPropagation()}>
        <div className="comment-modal-header">
          <h3>评论 ({getTotalCommentCount()})</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div className="comment-modal-preview">
          {item.type === 'photo' ? (
            <img src={item.url} alt={item.name} />
          ) : (
            <video src={item.url} />
          )}
          <span className="preview-name">{item.name}</span>
        </div>

        <div className="comments-list">
          {loading ? (
            <div className="loading-comments">
              <p>加载中...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="no-comments">
              <span className="no-comments-icon">💬</span>
              <p>还没有评论，来说点什么吧</p>
            </div>
          ) : (
            comments.map(comment => renderComment(comment))
          )}
        </div>

        <form className="comment-form" onSubmit={handleSubmit}>
          {replyTo && (
            <div className="reply-indicator">
              <span>回复 @{replyTo.author}</span>
              <button type="button" className="cancel-reply" onClick={cancelReply}>×</button>
            </div>
          )}
          <div className="comment-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="comment-input"
              placeholder={replyTo ? `回复 @${replyTo.author}...` : "写下你的评论..."}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
            />
            <button
              type="submit"
              className="submit-comment-btn"
              disabled={!newComment.trim()}
            >
              发送
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default CommentModal
