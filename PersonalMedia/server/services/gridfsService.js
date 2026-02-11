import mongoose from 'mongoose'
import { GridFSBucket } from 'mongodb'
import { Readable } from 'stream'
import { getGridFS } from '../config/database.js'

class GridFSService {
  constructor() {
    this.gfs = null
    this.db = null
  }

  async init() {
    if (this.gfs) return
    this.gfs = getGridFS()
    if (this.gfs) {
      this.db = this.gfs.s.db
    }
  }

  async uploadFile(file, metadata = {}) {
    await this.init()

    const uploadStream = this.gfs.openUploadStream(file.originalname, {
      contentType: file.mimetype,
      metadata: {
        ...metadata,
        originalName: file.originalname
      }
    })

    return new Promise((resolve, reject) => {
      const stream = Readable.from(file.buffer)
      stream.pipe(uploadStream)

      uploadStream.on('finish', () => {
        resolve({
          fileId: uploadStream.id.toString(),
          filename: uploadStream.filename,
          contentType: uploadStream.contentType,
          length: uploadStream.length,
          uploadDate: uploadStream.uploadDate
        })
      })

      uploadStream.on('error', (error) => {
        reject(error)
      })
    })
  }

  async getFile(fileId) {
    await this.init()

    const ObjectId = mongoose.Types.ObjectId
    try {
      const file = this.gfs.openDownloadStream(new ObjectId(fileId))
      return file
    } catch (error) {
      console.error('Error getting file:', error)
      return null
    }
  }

  async getFileInfo(fileId) {
    await this.init()

    const ObjectId = mongoose.Types.ObjectId
    try {
      const filesCollection = this.db.collection('media.files')
      const file = await filesCollection.findOne({ _id: new ObjectId(fileId) })
      return file
    } catch (error) {
      console.error('Error getting file info:', error)
      return null
    }
  }

  async deleteFile(fileId) {
    await this.init()

    const ObjectId = mongoose.Types.ObjectId
    try {
      await this.gfs.delete(new ObjectId(fileId))
      return true
    } catch (error) {
      console.error('Error deleting file:', error)
      return false
    }
  }

  async getAllFiles() {
    await this.init()

    const filesCollection = this.db.collection('media.files')
    const files = await filesCollection.find({}).toArray()
    return files
  }
}

export default new GridFSService()
