import { useState, useEffect } from 'react'
import MediaCard from '../components/MediaCard.jsx'
import UploadModal from '../components/UploadModal.jsx'
import CommentModal from '../components/CommentModal.jsx'
import apiService from '../services/api.js'
import './Home.css'

function Home() {
  const [mediaItems, setMediaItems] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [filter, setFilter] = useState('all')
  const [commentItem, setCommentItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMedia()
  }, [])

  const loadMedia = async () => {
    try {
      setLoading(true)
      const data = await apiService.getAllMedia()
      // Enrich with likes, comments, and favorites
      const enrichedData = await Promise.all(data.map(async (item) => {
        const likes = await apiService.getLikes(item.id)
        const comments = await apiService.getComments(item.id)
        const favorites = await apiService.getFavorites(item.id)
        return { ...item, likes, comments, favorites }
      }))
      setMediaItems(enrichedData)
    } catch (error) {
      console.error('Failed to load media:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = (newItems) => {
    setMediaItems(prev => [...newItems, ...prev])
    setShowUploadModal(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个文件吗？')) {
      try {
        await apiService.deleteMedia(id)
        setMediaItems(prev => prev.filter(item => item.id !== id))
      } catch (error) {
        console.error('Failed to delete media:', error)
        alert('删除失败，请重试')
      }
    }
  }

  const handleDownload = (item) => {
    const link = document.createElement('a')
    // Decode URL first, then encode it properly for the request
    const decodedUrl = decodeURIComponent(item.url)
    link.href = `http://localhost:3001${decodedUrl}`
    // Set download attribute with proper filename encoding
    link.download = item.name
    // Set proper encoding for Chinese filenames
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
    // Refresh media items to update comment counts
    loadMedia()
  }

  const handleLikeChange = (id, likes) => {
    setMediaItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, likes }
      }
      return item
    }))
  }

  const filteredItems = filter === 'all'
    ? mediaItems
    : mediaItems.filter(item => item.type === filter)

  const stats = {
    total: mediaItems.length,
    photos: mediaItems.filter(i => i.type === 'photo').length,
    videos: mediaItems.filter(i => i.type === 'video').length
  }

  return (
    <div className="home">
      <section className="hero">
        <h2>欢迎来到个人媒体库</h2>
        <p>管理和分享您的照片和视频</p>
        <button
          className="upload-btn"
          onClick={() => setShowUploadModal(true)}
        >
          + 上传文件
        </button>
      </section>

      <section className="stats">
        <div className="stat-card">
          <span className="stat-number">{stats.total}</span>
          <span className="stat-label">总文件</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.photos}</span>
          <span className="stat-label">照片</span>
        </div>
        <div className="stat-card">
          <span className="stat-number">{stats.videos}</span>
          <span className="stat-label">视频</span>
        </div>
      </section>

      <section className="recent-media">
        <div className="section-header">
          <h3>最近上传</h3>
          <div className="filter-buttons">
            <button
              className={filter === 'all' ? 'active' : ''}
              onClick={() => setFilter('all')}
            >
              全部
            </button>
            <button
              className={filter === 'photo' ? 'active' : ''}
              onClick={() => setFilter('photo')}
            >
              照片
            </button>
            <button
              className={filter === 'video' ? 'active' : ''}
              onClick={() => setFilter('video')}
            >
              视频
            </button>
          </div>
        </div>

        {loading ? (
          <div className="loading-state">
            <p>加载中...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="empty-state">
            <p>还没有上传任何文件</p>
            <button onClick={() => setShowUploadModal(true)}>
              立即上传
            </button>
          </div>
        ) : (
          <div className="media-grid">
            {filteredItems.slice(0, 8).map(item => (
              <MediaCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onDownload={handleDownload}
                onComment={handleComment}
                onLikeChange={handleLikeChange}
              />
            ))}
          </div>
        )}
      </section>

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
        />
      )}

      {commentItem && (
        <CommentModal
          item={commentItem}
          onClose={handleCloseComment}
        />
      )}
    </div>
  )
}

export default Home
