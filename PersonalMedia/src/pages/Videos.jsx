import { useState, useEffect } from 'react'
import MediaCard from '../components/MediaCard'
import UploadModal from '../components/UploadModal'
import CommentModal from '../components/CommentModal'
import apiService from '../services/api.js'
import './Videos.css'

function Videos() {
  const [videos, setVideos] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [commentItem, setCommentItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadVideos()
  }, [])

  const loadVideos = async () => {
    try {
      setLoading(true)
      const data = await apiService.getAllMedia('video')
      // Enrich with likes, comments, and favorites
      const enrichedData = await Promise.all(data.map(async (item) => {
        const likes = await apiService.getLikes(item.id)
        const comments = await apiService.getComments(item.id)
        const favorites = await apiService.getFavorites(item.id)
        return { ...item, likes, comments, favorites }
      }))
      setVideos(enrichedData)
    } catch (error) {
      console.error('Failed to load videos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = (newItems) => {
    const videoItems = newItems.filter(item => item.type === 'video')
    setVideos(prev => [...videoItems, ...prev])
    setShowUploadModal(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个视频吗？')) {
      try {
        await apiService.deleteMedia(id)
        setVideos(prev => prev.filter(item => item.id !== id))
      } catch (error) {
        console.error('Failed to delete video:', error)
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
    // Refresh videos to update comment counts
    loadVideos()
  }

  const handleLikeChange = (id, likes) => {
    setVideos(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, likes }
      }
      return item
    }))
  }

  const formatDuration = (seconds) => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="videos-page">
      <div className="page-header">
        <h2>视频管理</h2>
        <div className="header-actions">
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
          <button
            className="upload-btn"
            onClick={() => setShowUploadModal(true)}
          >
            + 上传视频
          </button>
        </div>
      </div>

      <div className="videos-info">
        <span>共 {videos.length} 个视频</span>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>加载中...</p>
        </div>
      ) : videos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🎬</div>
          <h3>还没有视频</h3>
          <p>点击上方按钮上传您的第一个视频</p>
        </div>
      ) : (
        <div className={`videos-container ${viewMode}`}>
          {videos.map(video => (
            <MediaCard
              key={video.id}
              item={video}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onComment={handleComment}
              onLikeChange={handleLikeChange}
              viewMode={viewMode}
              extraInfo={video.metadata?.duration ? formatDuration(video.metadata.duration) : null}
            />
          ))}
        </div>
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          acceptType="video/*"
          title="上传视频"
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

export default Videos
