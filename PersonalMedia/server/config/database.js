import mongoose from 'mongoose'
import { GridFSBucket } from 'mongodb'

let gfs

export const connectMongoDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/traefirst'
    await mongoose.connect(uri)
    console.log('MongoDB connected successfully')

    const conn = mongoose.connection
    gfs = new GridFSBucket(conn.db, {
      bucketName: 'media'
    })
    console.log('GridFS initialized successfully')

    return true
  } catch (error) {
    console.warn('MongoDB connection failed, running in SQLite-only mode:', error.message)
    return false
  }
}

export const getGridFS = () => {
  return gfs
}

export default { connectMongoDB, getGridFS }
