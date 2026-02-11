import { useState, useEffect } from 'react'
import MediaCard from '../components/MediaCard.jsx'
import UploadModal from '../components/UploadModal.jsx'
import CommentModal from '../components/CommentModal.jsx'
import apiService from '../services/api.js'
import './Photos.css'

function Photos() {
  const [photos, setPhotos] = useState([])
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [viewMode, setViewMode] = useState('grid')
  const [commentItem, setCommentItem] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPhotos()
  }, [])

  const loadPhotos = async () => {
    try {
      setLoading(true)
      const data = await apiService.getAllMedia('photo')
      // Enrich with likes, comments, and favorites
      const enrichedData = await Promise.all(data.map(async (item) => {
        const likes = await apiService.getLikes(item.id)
        const comments = await apiService.getComments(item.id)
        const favorites = await apiService.getFavorites(item.id)
        return { ...item, likes, comments, favorites }
      }))
      setPhotos(enrichedData)
    } catch (error) {
      console.error('Failed to load photos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = (newItems) => {
    const photoItems = newItems.filter(item => item.type === 'photo')
    setPhotos(prev => [...photoItems, ...prev])
    setShowUploadModal(false)
  }

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这张照片吗？')) {
      try {
        await apiService.deleteMedia(id)
        setPhotos(prev => prev.filter(item => item.id !== id))
      } catch (error) {
        console.error('Failed to delete photo:', error)
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
    // Refresh photos to update comment counts
    loadPhotos()
  }

  const handleLikeChange = (id, likes) => {
    setPhotos(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, likes }
      }
      return item
    }))
  }

  return (
    <div className="photos-page">
      <div className="page-header">
        <h2>照片管理</h2>
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
            + 上传照片
          </button>
        </div>
      </div>

      <div className="photos-info">
        <span>共 {photos.length} 张照片</span>
      </div>

      {loading ? (
        <div className="loading-state">
          <p>加载中...</p>
        </div>
      ) : photos.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📷</div>
          <h3>还没有照片</h3>
          <p>点击上方按钮上传您的第一张照片</p>
        </div>
      ) : (
        <div className={`photos-container ${viewMode}`}>
          {photos.map(photo => (
            <MediaCard
              key={photo.id}
              item={photo}
              onDelete={handleDelete}
              onDownload={handleDownload}
              onComment={handleComment}
              onLikeChange={handleLikeChange}
              viewMode={viewMode}
            />
          ))}
        </div>
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
          acceptType="image/*"
          title="上传照片"
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

export default Photos
