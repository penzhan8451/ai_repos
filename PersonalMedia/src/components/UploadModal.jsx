import { useState, useRef, useCallback } from 'react'
import apiService from '../services/api.js'
import './UploadModal.css'

function UploadModal({ onClose, onUpload, acceptType, title = '上传文件' }) {
  const [files, setFiles] = useState([])
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef(null)

  const getFileType = (file) => {
    if (file.type.startsWith('image/')) return 'photo'
    if (file.type.startsWith('video/')) return 'video'
    return 'other'
  }

  const processFiles = useCallback((fileList) => {
    const newFiles = Array.from(fileList).map(file => ({
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      file,
      name: file.name,
      size: file.size,
      type: getFileType(file),
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      uploadDate: new Date().toISOString()
    }))
    setFiles(prev => [...prev, ...newFiles])
  }, [])

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files)
    }
  }

  const handleChange = (e) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      processFiles(e.target.files)
    }
  }

  const handleSubmit = async () => {
    if (files.length === 0) return

    setUploading(true)

    try {
      // Upload files to server
      const fileList = files.map(f => f.file)
      const uploadedItems = await apiService.uploadMedia(fileList)

      // Notify parent component
      onUpload(uploadedItems)
    } catch (error) {
      console.error('Upload error:', error)
      alert('上传失败，请重试')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = (id) => {
    setFiles(prev => {
      const file = prev.find(f => f.id === id)
      if (file && file.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter(f => f.id !== id)
    })
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getAcceptTypes = () => {
    if (acceptType) return acceptType
    return 'image/*,video/*'
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <div
          className={`drop-zone ${dragActive ? 'active' : ''} ${files.length > 0 ? 'has-files' : ''}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={getAcceptTypes()}
            onChange={handleChange}
            className="hidden-input"
          />
          <div className="drop-zone-content">
            <span className="upload-icon">📁</span>
            <p>点击或拖拽文件到此处上传</p>
            <span className="file-types">
              支持 {acceptType === 'image/*' ? '图片' : acceptType === 'video/*' ? '视频' : '图片和视频'} 格式
            </span>
          </div>
        </div>

        {files.length > 0 && (
          <div className="file-list">
            <h4>待上传文件 ({files.length})</h4>
            <div className="files">
              {files.map(file => (
                <div key={file.id} className="file-item">
                  <div className="file-preview">
                    {file.preview ? (
                      <img src={file.preview} alt={file.name} />
                    ) : (
                      <span className="file-icon">
                        {file.type === 'video' ? '🎬' : '📄'}
                      </span>
                    )}
                  </div>
                  <div className="file-details">
                    <span className="file-name" title={file.name}>{file.name}</span>
                    <span className="file-size">{formatFileSize(file.size)}</span>
                  </div>
                  <button
                    className="remove-btn"
                    onClick={() => removeFile(file.id)}
                    disabled={uploading}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button
            className="btn-secondary"
            onClick={onClose}
            disabled={uploading}
          >
            取消
          </button>
          <button
            className="btn-primary"
            onClick={handleSubmit}
            disabled={files.length === 0 || uploading}
          >
            {uploading ? '上传中...' : `上传 (${files.length})`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default UploadModal
