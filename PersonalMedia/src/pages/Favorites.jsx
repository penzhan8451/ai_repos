import { useState, useEffect } from 'react'
import MediaCard from '../components/MediaCard.jsx'
import CommentModal from '../components/CommentModal.jsx'
import apiService from '../services/api.js'
import './Favorites.css'

function Favorites() {
  const [mediaItems, setMediaItems] = useState([])
  const [commentItem, setCommentItem] = useState(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const currentUser = '用户'

  useEffect(() => {
    loadFavorites()
  }, [])

  const loadFavorites = async () => {
    try {
      setLoading(true)
      const data = await apiService.getUserFavorites(currentUser)
      // Enrich with likes and comments
      const enrichedData = await Promise.all(data.map(async (item) => {
        const likes = await apiService.getLikes(item.id)
        const comments = await apiService.getComments(item.id)
        const favorites = await apiService.getFavorites(item.id)
        return { ...item, likes, comments, favorites }
      }))
      setMediaItems(enrichedData)
    } catch (error) {
      console.error('Failed to load favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = (item) => {
    const link = document.createElement('a')
    const decodedUrl = decodeURIComponent(item.url)
    link.href = `http://localhost:3001${decodedUrl}`
    link.download = item.name
    link.setAttribute('download', item.name)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleComment = (item) => {
    setCommentItem(item)
  }

  const handleCloseComment = () => {
    setCommentItem(null)
    loadFavorites()
  }

  const handleLikeChange = (id, likes) => {
    setMediaItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, likes }
      }
      return item
    }))
  }

  const handleFavoriteChange = (id, favorites) => {
    setMediaItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, favorites }
      }
      return item
    }))
    // Refresh the list to remove unfavorited items
    setTimeout(() => {
      loadFavorites()
    }, 300)
  }

  const stats = {
    total: mediaItems.length,
    photos: mediaItems.filter(i => i.type === 'photo').length,
    videos: mediaItems.filter(i => i.type === 'video').length
  }

  return (
    <div className="favorites-page">
      <section className="favorites-hero">
        <h2>我的收藏</h2>
        <p>查看您收藏的图片和视频</p>
      </section>

      <section className="favorites-stats">
        <div className="stat-card">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">总收藏</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.photos}</span>
          <span className="stat-label">图片</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.videos}</span>
          <span className="stat-label">视频</span>
        </div>
      </section>

      <section className="favorites-content">
        <div className="view-controls">
          <div className="view-toggle">
            <button
              className={viewMode === 'grid' ? 'active' : ''}
              onClick={() => setViewMode('grid')}
              title="网格视图"
            >
              ⊞
            </button>
            <button
              className={viewMode === 'list' ? 'active' : ''}
              onClick={() => setViewMode('list')}
              title="列表视图"
            >
              ☰
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading">加载中...</div>
        ) : mediaItems.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">⭐</div>
            <h3>还没有收藏</h3>
            <p>浏览图片和视频，点击收藏按钮添加到收藏夹</p>
          </div>
        ) : (
          <div className={`media-grid ${viewMode}`}>
            {mediaItems.map(item => (
              <MediaCard
                key={item.id}
                item={item}
                onDownload={handleDownload}
                viewMode={viewMode}
                onComment={handleComment}
                currentUser={currentUser}
                onLikeChange={handleLikeChange}
                onFavoriteChange={handleFavoriteChange}
              />
            ))}
          </div>
        )}
      </section>

      {commentItem && (
        <CommentModal
          item={commentItem}
          onClose={handleCloseComment}
          currentUser={currentUser}
        />
      )}
    </div>
  )
}

export default Favorites
