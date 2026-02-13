import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import passport from 'passport'
import { connectMongoDB } from './config/database.js'
import mediaRoutes from './routes/media.js'
import authRoutes from './routes/auth.js'
import oauthRoutes, { configureOAuth } from './routes/oauth.js'
import webAuthnRoutes from './routes/webauthn.js'
import fs from 'fs'
import './services/gridfsService.js'
import cookieParser from 'cookie-parser'
import csrf from 'csurf'

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
const isProduction = process.env.NODE_ENV === 'production'

// CORS configuration
app.use(cors({
  credentials: true,
  origin: (origin, callback) => {
    // Allow all origins in development
    if (!isProduction) {
      callback(null, true)
      return
    }
    
    // In production, only allow specific origins
    const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000']
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
  exposedHeaders: ['X-CSRF-Token'],
  maxAge: 86400 // 24 hours
}))

app.use(express.json())
app.use(cookieParser())

// Initialize Passport
app.use(passport.initialize())
configureOAuth()

// CSRF protection
const csrfProtection = csrf({ cookie: {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'strict'
}})

// Static files for uploads
app.use('/uploads', express.static(uploadDir))

// Routes
// Get CSRF token
app.get('/api/csrf-token', csrfProtection, (req, res) => {
  res.json({ csrfToken: req.csrfToken() })
})

// WebAuthn routes (不需要 CSRF 保护，使用 challenge-response 机制)
app.use('/api/auth/webauthn', webAuthnRoutes)

// OAuth routes (不需要 CSRF 保护，因为使用 OAuth 流程)
app.use('/api/auth', oauthRoutes)

// Protected routes
app.use('/api/auth', csrfProtection, authRoutes)
app.use('/api/media', csrfProtection, mediaRoutes)

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
  if (err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'CSRF token 验证失败' })
  }
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
      console.log(`Environment: ${isProduction ? 'Production' : 'Development'}`)
      console.log(`Upload directory: ${uploadDir}`)
      console.log(`MongoDB: ${mongoDBAvailable ? 'Connected' : 'Not available (SQLite-only mode)'}`)
      console.log(`CORS: ${!isProduction ? 'Allow all origins' : 'Restricted to specific origins'}`)
      console.log(`OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Google enabled' : 'Google disabled'}, ${process.env.GITHUB_CLIENT_ID ? 'GitHub enabled' : 'GitHub disabled'}`)
      console.log(`WebAuthn: Enabled (RP_ID: ${process.env.RP_ID || 'localhost'})`)
    })
  } catch (error) {
    console.error('Failed to start server:', error)
    process.exit(1)
  }
}

startServer()
