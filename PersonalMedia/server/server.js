import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { connectMongoDB } from './config/database.js'
import mediaRoutes from './routes/media.js'
import fs from 'fs'
import './services/gridfsService.js'

// Load environment variables
dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3001

// Global flag for MongoDB availability
export let mongoDBAvailable = false

// Ensure uploads directory exists
const uploadDir = process.env.UPLOAD_DIR || './uploads'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

// Middleware
app.use(cors())
app.use(express.json())

// Static files for uploads
app.use('/uploads', express.static(uploadDir))

// Routes
app.use('/api/media', mediaRoutes)

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    mongoDB: mongoDBAvailable,
    sqlite: true
  })
})

// Debug endpoint to list GridFS files
app.get('/api/debug/files', async (req, res) => {
  try {
    if (!mongoDBAvailable) {
      return res.status(503).json({ error: 'MongoDB not available' })
    }
    const { default: gridfsService } = await import('./services/gridfsService.js')
    const files = await gridfsService.getAllFiles()
    res.json({ count: files.length, files })
  } catch (error) {
    console.error('Error getting files:', error)
    res.status(500).json({ error: error.message })
  }
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ error: err.message || 'Something went wrong!' })
})

// Start server
const startServer = async () => {
  try {
    // Try to connect to MongoDB (optional)
    mongoDBAvailable = await connectMongoDB()

    // Initialize SQLite (always required)
    const { default: sqliteService } = await import('./services/sqliteService.js')
    await sqliteService.init()

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
      console.log(`Upload directory: ${uploadDir}`)
      console.log(`MongoDB: ${mongoDBAvailable ? 'Connected' : 'Not available (SQLite-only mode)'}`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
