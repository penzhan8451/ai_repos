import { useState, useEffect } from 'react'
import apiService from '../services/api.js'
import './MediaCard.css'

function MediaCard({ item, onDelete, onDownload, viewMode = 'grid', extraInfo, onComment, currentUser = '用户', onLikeChange, onFavoriteChange }) {
  const [isHovered, setIsHovered] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [commentCount, setCommentCount] = useState(0)
  const [isFavorited, setIsFavorited] = useState(false)

  // Helper to get full URL for media display
  const getMediaUrl = (url) => {
    if (!url) return ''
    if (url.startsWith('http')) return url
    if (url.startsWith('/api/')) return `http://localhost:3001${url}`
    const decodedUrl = decodeURIComponent(url)
    return `http://localhost:3001${decodedUrl}`
  }

  useEffect(() => {
    // Use data from API if available, otherwise fetch
    if (item.likes) {
      setLikeCount(item.likes.count || 0)
      setIsLiked(item.likes.users?.includes(currentUser) || false)
    }

    if (item.comments) {
      const totalComments = item.comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)
      setCommentCount(totalComments)
    }

    if (item.favorites) {
      setIsFavorited(item.favorites.users?.includes(currentUser) || false)
    }
  }, [item, currentUser])

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = () => {
    if (item.type === 'photo') return '🖼️'
    if (item.type === 'video') return '🎬'
    return '📄'
  }

  const handleLike = async (e) => {
    e.stopPropagation()
    try {
      const result = await apiService.toggleLike(item.id, currentUser)
      setLikeCount(result.count)
      setIsLiked(result.users.includes(currentUser))
      onLikeChange?.(item.id, result)
    } catch (error) {
      console.error('Failed to toggle like:', error)
    }
  }

  const handleComment = (e) => {
    e.stopPropagation()
    onComment?.(item)
  }

  const handleFavorite = async (e) => {
    e.stopPropagation()
    try {
      const result = await apiService.toggleFavorite(item.id, currentUser)
      setIsFavorited(result.users.includes(currentUser))
      onFavoriteChange?.(item.id, result)
    } catch (error) {
      console.error('Failed to toggle favorite:', error)
    }
  }

  const renderActions = () => (
    <>
      <button
        className={`action-btn like ${isLiked ? 'liked' : ''}`}
        onClick={handleLike}
        title={isLiked ? '取消点赞' : '点赞'}
      >
        {isLiked ? '❤️' : '🤍'}
        {likeCount > 0 && <span className="count">{likeCount}</span>}
      </button>
      <button
        className="action-btn comment"
        onClick={handleComment}
        title="评论"
      >
        💬
        {commentCount > 0 && <span className="count">{commentCount}</span>}
      </button>
      <button
        className={`action-btn favorite ${isFavorited ? 'favorited' : ''}`}
        onClick={handleFavorite}
        title={isFavorited ? '取消收藏' : '收藏'}
      >
        {isFavorited ? '⭐' : '☆'}
      </button>
    </>
  )

  if (viewMode === 'list') {
    return (
      <div className="media-card list">
        <div className="list-thumbnail">
          {item.type === 'photo' && !imageError ? (
            <img
              src={getMediaUrl(item.url)}
              alt={item.name}
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="file-icon">{getFileIcon()}</div>
          )}
        </div>
        <div className="list-info">
          <h4 className="file-name" title={item.name}>{item.name}</h4>
          <div className="file-meta">
            <span>{formatFileSize(item.size)}</span>
            <span>•</span>
            <span>{formatDate(item.uploadTime || item.uploadDate)}</span>
            {extraInfo && (
              <>
                <span>•</span>
                <span>{extraInfo}</span>
              </>
            )}
          </div>
          <div className="list-actions-bar">
            {renderActions()}
          </div>
        </div>
        <div className="list-actions">
          <button
            className="action-btn download"
            onClick={() => onDownload(item)}
            title="下载"
          >
            ⬇️
          </button>
          <button
            className="action-btn delete"
            onClick={() => onDelete(item.id)}
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="media-card grid"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card-preview">
        {item.type === 'photo' && !imageError ? (
          <img
            src={getMediaUrl(item.url)}
            alt={item.name}
            onError={() => setImageError(true)}
          />
        ) : item.type === 'video' ? (
          <video src={getMediaUrl(item.url)} preload="metadata" />
        ) : (
          <div className="file-icon">{getFileIcon()}</div>
        )}

        {item.type === 'video' && (
          <div className="play-overlay">
            <span className="play-icon">▶️</span>
          </div>
        )}

        {extraInfo && (
          <div className="duration-badge">{extraInfo}</div>
        )}

        <div className={`card-overlay ${isHovered ? 'visible' : ''}`}>
          <button
            className="overlay-btn download"
            onClick={() => onDownload(item)}
            title="下载"
          >
            ⬇️
          </button>
          <button
            className="overlay-btn delete"
            onClick={() => onDelete(item.id)}
            title="删除"
          >
            🗑️
          </button>
        </div>
      </div>

      <div className="card-info">
        <h4 className="file-name" title={item.name}>{item.name}</h4>
        <div className="file-meta">
          <span>{formatFileSize(item.size)}</span>
          <span>•</span>
          <span>{formatDate(item.uploadTime || item.uploadDate)}</span>
        </div>
        <div className="card-actions-bar">
          {renderActions()}
        </div>
      </div>
    </div>
  )
}

export default MediaCard
