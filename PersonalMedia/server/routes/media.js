import express from 'express'
import multer from 'multer'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import Media from '../models/Media.js'
import sqliteService from '../services/sqliteService.js'
import gridfsService from '../services/gridfsService.js'
import { mongoDBAvailable } from '../server.js'
import mongoose from 'mongoose'

const router = express.Router()

// Memory storage for GridFS upload
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi|webm/
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase())
    const mimetype = allowedTypes.test(file.mimetype)
    if (extname && mimetype) {
      return cb(null, true)
    }
    cb(new Error('Only images and videos are allowed'))
  }
})

// Get all media
router.get('/', async (req, res) => {
  try {
    const { type } = req.query
    let media = []

    if (type && type !== 'all') {
      // Try SQLite cache first
      media = await sqliteService.getMediaByType(type)
      if (mongoDBAvailable && media.length === 0) {
        // Fallback to MongoDB
        media = await Media.find({ type }).sort({ uploadTime: -1 }).lean()
        // Update cache
        for (const m of media) {
          await sqliteService.saveMedia(m)
        }
      }
    } else {
      // Try SQLite cache first
      media = await sqliteService.getAllMedia()
      if (mongoDBAvailable && media.length === 0) {
        // Fallback to MongoDB
        media = await Media.find().sort({ uploadTime: -1 }).lean()
        // Update cache
        for (const m of media) {
          await sqliteService.saveMedia(m)
        }
      }
    }

    // Enrich with likes and comments from cache
    const enrichedMedia = await Promise.all(media.map(async (m) => {
      const likes = await sqliteService.getLikes(m.id)
      const comments = await sqliteService.getComments(m.id)
      return { ...m, likes, comments }
    }))

    res.json(enrichedMedia)
  } catch (error) {
    console.error('Error fetching media:', error)
    res.status(500).json({ error: 'Failed to fetch media' })
  }
})

// Get single media
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params

    // Try SQLite cache first
    let media = await sqliteService.getMediaById(id)

    if (!media && mongoDBAvailable) {
      // Fallback to MongoDB
      media = await Media.findOne({ id }).lean()
      if (media) {
        await sqliteService.saveMedia(media)
      }
    }

    if (!media) {
      return res.status(404).json({ error: 'Media not found' })
    }

    // Enrich with likes and comments
    const likes = await sqliteService.getLikes(id)
    const comments = await sqliteService.getComments(id)

    res.json({ ...media, likes, comments })
  } catch (error) {
    console.error('Error fetching media:', error)
    res.status(500).json({ error: 'Failed to fetch media' })
  }
})

// Upload media
router.post('/upload', upload.array('files', 10), async (req, res) => {
  try {
    const files = req.files
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' })
    }

    const uploadedMedia = []

    for (const file of files) {
      const isImage = /jpeg|jpg|png|gif/.test(file.mimetype)
      const type = isImage ? 'photo' : 'video'

      let decodedName = file.originalname
      try {
        decodedName = Buffer.from(file.originalname, 'latin1').toString('utf8')
      } catch (e) {
        decodedName = file.originalname
      }

      let fileData = null
      if (mongoDBAvailable) {
        fileData = await gridfsService.uploadFile(file, {
          mediaId: uuidv4(),
          type: type
        })
      }

      const mediaData = {
        id: uuidv4(),
        type,
        name: decodedName,
        size: file.size,
        url: fileData ? `/api/media/file/${fileData.fileId}` : null,
        fileId: fileData ? fileData.fileId : null,
        uploadTime: new Date().toISOString(),
        metadata: {
          mimetype: file.mimetype
        }
      }

      // Save to MongoDB if available
      if (mongoDBAvailable) {
        const media = new Media(mediaData)
        await media.save()
      }

      // Save to SQLite cache
      await sqliteService.saveMedia(mediaData)
      await sqliteService.saveLikes(mediaData.id, { count: 0, users: [] })

      uploadedMedia.push(mediaData)
    }

    res.status(201).json(uploadedMedia)
  } catch (error) {
    console.error('Error uploading media:', error)
    res.status(500).json({ error: 'Failed to upload media' })
  }
})

// Get media file from GridFS
router.get('/file/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params

    console.log('Getting file:', fileId)

    if (!mongoDBAvailable) {
      return res.status(503).json({ error: 'MongoDB not available' })
    }

    const file = await gridfsService.getFile(fileId)

    if (!file) {
      return res.status(404).json({ error: 'File not found' })
    }

    const fileInfo = await gridfsService.getFileInfo(fileId)

    if (!fileInfo) {
      return res.status(404).json({ error: 'File info not found' })
    }

    res.set('Content-Type', fileInfo.contentType || 'application/octet-stream')
    res.set('Content-Length', fileInfo.length)
    res.set('Content-Disposition', `inline; filename="${fileInfo.filename}"`)

    file.pipe(res)
  } catch (error) {
    console.error('Error getting file:', error)
    res.status(500).json({ error: 'Failed to get file: ' + error.message })
  }
})

// Delete media
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    console.log('Deleting media:', id)

    let media = await sqliteService.getMediaById(id)
    console.log('Found in SQLite:', media ? 'yes' : 'no')

    if (!media && mongoDBAvailable) {
      media = await Media.findOne({ id }).lean()
      console.log('Found in MongoDB:', media ? 'yes' : 'no')
    }

    if (media && media.fileId && mongoDBAvailable) {
      console.log('Deleting GridFS file:', media.fileId)
      const deleted = await gridfsService.deleteFile(media.fileId)
      console.log('GridFS delete result:', deleted)
    }

    // Delete from MongoDB if available
    if (mongoDBAvailable) {
      const mongoResult = await Media.deleteOne({ id })
      console.log('MongoDB delete result:', mongoResult)
    }

    // Delete from SQLite cache
    await sqliteService.deleteMedia(id)
    console.log('SQLite delete completed')

    res.json({ message: 'Media deleted successfully' })
  } catch (error) {
    console.error('Error deleting media:', error)
    res.status(500).json({ error: 'Failed to delete media' })
  }
})

// Toggle like
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params
    const { user } = req.body

    if (!user) {
      return res.status(400).json({ error: 'User is required' })
    }

    // Get current likes from cache
    const likes = await sqliteService.getLikes(id)

    const userIndex = likes.users.indexOf(user)
    if (userIndex > -1) {
      // Unlike
      likes.users.splice(userIndex, 1)
      likes.count = Math.max(0, likes.count - 1)
    } else {
      // Like
      likes.users.push(user)
      likes.count += 1
    }

    // Save to cache
    await sqliteService.saveLikes(id, likes)

    // Update MongoDB if available
    if (mongoDBAvailable) {
      await Media.updateOne({ id }, { $set: { likes } })
    }

    res.json(likes)
  } catch (error) {
    console.error('Error toggling like:', error)
    res.status(500).json({ error: 'Failed to toggle like' })
  }
})

// Get likes
router.get('/:id/likes', async (req, res) => {
  try {
    const { id } = req.params
    const likes = await sqliteService.getLikes(id)
    res.json(likes)
  } catch (error) {
    console.error('Error fetching likes:', error)
    res.status(500).json({ error: ' likes' })
  }
})

// Add comment
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params
    const { content, author, replyTo } = req.body

    if (!content || !author) {
      return res.status(400).json({ error: 'Content and author are required' })
    }

    const comment = {
      id: uuidv4(),
      content,
      author,
      timestamp: new Date().toISOString(),
      replyTo: replyTo || null,
      replies: []
    }

    if (replyTo) {
      // This is a reply - update parent comment
      const comments = await sqliteService.getComments(id)
      const parentComment = comments.find(c => c.id === replyTo)
      if (parentComment) {
        parentComment.replies.push(comment)
        await sqliteService.updateCommentReplies(id, replyTo, parentComment.replies)

        // Update MongoDB if available
        if (mongoDBAvailable) {
          await Media.updateOne(
            { id, 'comments.id': replyTo },
            { $push: { 'comments.$.replies': comment } }
          )
        }
      }
    } else {
      // This is a top-level comment
      await sqliteService.saveComment(id, comment)

      // Update MongoDB if available
      if (mongoDBAvailable) {
        await Media.updateOne({ id }, { $push: { comments: comment } })
      }
    }

    res.status(201).json(comment)
  } catch (error) {
    console.error('Error adding comment:', error)
    res.status(500).json({ error: 'Failed to add comment' })
  }
})

// Get comments
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params
    const comments = await sqliteService.getComments(id)
    res.json(comments)
  } catch (error) {
    console.error('Error fetching comments:', error)
    res.status(500).json({ error: 'Failed to fetch comments' })
  }
})

// Delete comment
router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    const { id, commentId } = req.params
    const { parentId } = req.query

    if (parentId) {
      // Delete a reply
      const comments = await sqliteService.getComments(id)
      const parentComment = comments.find(c => c.id === parentId)
      if (parentComment) {
        parentComment.replies = parentComment.replies.filter(r => r.id !== commentId)
        await sqliteService.updateCommentReplies(id, parentId, parentComment.replies)

        // Update MongoDB if available
        if (mongoDBAvailable) {
          await Media.updateOne(
            { id, 'comments.id': parentId },
            { $pull: { 'comments.$.replies': { id: commentId } } }
          )
        }
      }
    } else {
      // Delete a top-level comment
      await sqliteService.deleteComment(id, commentId)

      // Update MongoDB if available
      if (mongoDBAvailable) {
        await Media.updateOne({ id }, { $pull: { comments: { id: commentId } } })
      }
    }

    res.json({ message: 'Comment deleted successfully' })
  } catch (error) {
    console.error('Error deleting comment:', error)
    res.status(500).json({ error: 'Failed to delete comment' })
  }
})

// Toggle favorite
router.post('/:id/favorite', async (req, res) => {
  try {
    const { id } = req.params
    const { user } = req.body

    console.log('Toggle favorite:', { id, user })

    if (!user) {
      return res.status(400).json({ error: 'User is required' })
    }

    // Get current favorites from cache
    const favorites = await sqliteService.getFavorites(id)
    console.log('Current favorites:', favorites)

    const userIndex = favorites.users.indexOf(user)
    if (userIndex > -1) {
      // Remove from favorites
      favorites.users.splice(userIndex, 1)
      console.log('Removed from favorites')
    } else {
      // Add to favorites
      favorites.users.push(user)
      console.log('Added to favorites')
    }

    // Save to cache
    await sqliteService.saveFavorites(id, favorites)
    console.log('Saved favorites:', favorites)

    // Update MongoDB if available
    if (mongoDBAvailable) {
      await Media.updateOne({ id }, { $set: { favorites } })
    }

    res.json(favorites)
  } catch (error) {
    console.error('Error toggling favorite:', error)
    res.status(500).json({ error: 'Failed to toggle favorite' })
  }
})

// Get favorites
router.get('/:id/favorites', async (req, res) => {
  try {
    const { id } = req.params
    const favorites = await sqliteService.getFavorites(id)
    res.json(favorites)
  } catch (error) {
    console.error('Error fetching favorites:', error)
    res.status(500).json({ error: 'Failed to fetch favorites' })
  }
})

// Get user's favorite media
router.get('/user/:user/favorites', async (req, res) => {
  try {
    const { user } = req.params
    const favoriteIds = await sqliteService.getUserFavorites(user)

    // Get media details for each favorite
    const media = []
    for (const id of favoriteIds) {
      let item = await sqliteService.getMediaById(id)
      if (!item && mongoDBAvailable) {
        item = await Media.findOne({ id }).lean()
      }
      if (item) {
        media.push(item)
      }
    }

    res.json(media)
  } catch (error) {
    console.error('Error fetching user favorites:', error)
    res.status(500).json({ error: 'Failed to fetch user favorites' })
  }
})

// Sync cache with MongoDB
router.post('/sync', async (req, res) => {
  try {
    if (!mongoDBAvailable) {
      return res.status(503).json({ error: 'MongoDB not available' })
    }

    // Clear cache
    await sqliteService.clearCache()

    // Fetch all from MongoDB and populate cache
    const media = await Media.find().lean()
    for (const m of media) {
      await sqliteService.saveMedia(m)
      await sqliteService.saveLikes(m.id, m.likes || { count: 0, users: [] })
      await sqliteService.saveFavorites(m.id, m.favorites || { users: [] })
      if (m.comments) {
        for (const c of m.comments) {
          await sqliteService.saveComment(m.id, c)
        }
      }
    }

    res.json({ message: 'Cache synchronized successfully', count: media.length })
  } catch (error) {
    console.error('Error syncing cache:', error)
    res.status(500).json({ error: 'Failed to sync cache' })
  }
})

export default router
