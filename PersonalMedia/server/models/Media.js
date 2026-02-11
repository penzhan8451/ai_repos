import mongoose from 'mongoose'

const replySchema = new mongoose.Schema({
  id: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  timestamp: { type: Date, required: true }
}, { _id: false })

const commentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: String, required: true },
  timestamp: { type: Date, required: true },
  replyTo: { type: String, default: null },
  replies: [replySchema]
}, { _id: false })

const mediaSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  type: { type: String, enum: ['photo', 'video'], required: true },
  name: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true },
  thumbnailUrl: { type: String },
  uploadTime: { type: Date, default: Date.now },
  metadata: {
    width: Number,
    height: Number,
    duration: Number,
    format: String
  },
  likes: {
    count: { type: Number, default: 0 },
    users: [{ type: String }]
  },
  favorites: {
    users: [{ type: String }]
  },
  comments: [commentSchema]
}, {
  timestamps: true
})

// Index for faster queries
mediaSchema.index({ type: 1 })
mediaSchema.index({ uploadTime: -1 })

export default mongoose.model('Media', mediaSchema)
