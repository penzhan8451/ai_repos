import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

class SQLiteService {
  constructor() {
    this.db = null
    this.initialized = false
  }

  async init() {
    if (this.initialized) return

    const dbPath = process.env.SQLITE_DB_PATH || path.join(__dirname, '../cache.db')
    this.db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    })

    await this.initTables()
    this.initialized = true
  }

  async initTables() {
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS media_cache (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        name TEXT NOT NULL,
        size INTEGER NOT NULL,
        url TEXT NOT NULL,
        thumbnail_url TEXT,
        upload_time TEXT NOT NULL,
        file_id TEXT,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS likes_cache (
        media_id TEXT PRIMARY KEY,
        count INTEGER DEFAULT 0,
        users TEXT DEFAULT '[]',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS comments_cache (
        id TEXT PRIMARY KEY,
        media_id TEXT NOT NULL,
        content TEXT NOT NULL,
        author TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        reply_to TEXT,
        replies TEXT DEFAULT '[]',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS favorites_cache (
        media_id TEXT PRIMARY KEY,
        users TEXT DEFAULT '[]',
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_media_cache_type ON media_cache(type);
      CREATE INDEX IF NOT EXISTS idx_comments_media_id ON comments_cache(media_id);
    `)
  }

  // Media cache operations
  async getAllMedia() {
    await this.init()
    const rows = await this.db.all('SELECT * FROM media_cache ORDER BY upload_time DESC')
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      name: row.name,
      size: row.size,
      url: row.url,
      thumbnailUrl: row.thumbnail_url,
      uploadTime: row.upload_time,
      fileId: row.file_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }))
  }

  async getMediaByType(type) {
    await this.init()
    const rows = await this.db.all('SELECT * FROM media_cache WHERE type = ? ORDER BY upload_time DESC', [type])
    return rows.map(row => ({
      id: row.id,
      type: row.type,
      name: row.name,
      size: row.size,
      url: row.url,
      thumbnailUrl: row.thumbnail_url,
      uploadTime: row.upload_time,
      fileId: row.file_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }))
  }

  async getMediaById(id) {
    await this.init()
    const row = await this.db.get('SELECT * FROM media_cache WHERE id = ?', [id])
    if (!row) return null
    return {
      id: row.id,
      type: row.type,
      name: row.name,
      size: row.size,
      url: row.url,
      thumbnailUrl: row.thumbnail_url,
      uploadTime: row.upload_time,
      fileId: row.file_id,
      metadata: row.metadata ? JSON.parse(row.metadata) : null
    }
  }

  async saveMedia(media) {
    await this.init()
    await this.db.run(`
      INSERT OR REPLACE INTO media_cache 
      (id, type, name, size, url, thumbnail_url, upload_time, file_id, metadata, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      media.id,
      media.type,
      media.name,
      media.size,
      media.url,
      media.thumbnailUrl || null,
      media.uploadTime,
      media.fileId || null,
      media.metadata ? JSON.stringify(media.metadata) : null
    ])
  }

  async deleteMedia(id) {
    await this.init()
    await this.db.run('DELETE FROM media_cache WHERE id = ?', [id])
    // Also delete related likes and comments
    await this.db.run('DELETE FROM likes_cache WHERE media_id = ?', [id])
    await this.db.run('DELETE FROM comments_cache WHERE media_id = ?', [id])
  }

  // Likes cache operations
  async getLikes(mediaId) {
    await this.init()
    const row = await this.db.get('SELECT * FROM likes_cache WHERE media_id = ?', [mediaId])
    if (!row) return { count: 0, users: [] }
    return {
      count: row.count,
      users: JSON.parse(row.users)
    }
  }

  async saveLikes(mediaId, likes) {
    await this.init()
    await this.db.run(`
      INSERT OR REPLACE INTO likes_cache (media_id, count, users, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `, [mediaId, likes.count, JSON.stringify(likes.users)])
  }

  // Comments cache operations
  async getComments(mediaId) {
    await this.init()
    const rows = await this.db.all('SELECT * FROM comments_cache WHERE media_id = ? ORDER BY timestamp ASC', [mediaId])
    return rows.map(row => ({
      id: row.id,
      content: row.content,
      author: row.author,
      timestamp: row.timestamp,
      replyTo: row.reply_to,
      replies: JSON.parse(row.replies)
    }))
  }

  async saveComment(mediaId, comment) {
    await this.init()
    await this.db.run(`
      INSERT OR REPLACE INTO comments_cache 
      (id, media_id, content, author, timestamp, reply_to, replies)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      comment.id,
      mediaId,
      comment.content,
      comment.author,
      comment.timestamp,
      comment.replyTo || null,
      JSON.stringify(comment.replies || [])
    ])
  }

  async updateCommentReplies(mediaId, commentId, replies) {
    await this.init()
    await this.db.run(`
      UPDATE comments_cache SET replies = ? WHERE id = ? AND media_id = ?
    `, [JSON.stringify(replies), commentId, mediaId])
  }

  async deleteComment(mediaId, commentId) {
    await this.init()
    await this.db.run('DELETE FROM comments_cache WHERE id = ? AND media_id = ?', [commentId, mediaId])
  }

  // Favorites cache operations
  async getFavorites(mediaId) {
    await this.init()
    const row = await this.db.get('SELECT * FROM favorites_cache WHERE media_id = ?', [mediaId])
    if (!row) return { users: [] }
    return {
      users: JSON.parse(row.users)
    }
  }

  async saveFavorites(mediaId, favorites) {
    await this.init()
    await this.db.run(`
      INSERT OR REPLACE INTO favorites_cache (media_id, users, updated_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
    `, [mediaId, JSON.stringify(favorites.users)])
  }

  async getUserFavorites(user) {
    await this.init()
    const rows = await this.db.all('SELECT media_id, users FROM favorites_cache')
    const favorites = []
    for (const row of rows) {
      const users = JSON.parse(row.users || '[]')
      if (users.includes(user)) {
        favorites.push(row.media_id)
      }
    }
    return favorites
  }

  // Cache sync operations
  async getLastSyncTime() {
    await this.init()
    const row = await this.db.get(`
      SELECT MAX(updated_at) as last_sync FROM media_cache
    `)
    return row?.last_sync || null
  }

  async clearCache() {
    await this.init()
    await this.db.exec('DELETE FROM media_cache; DELETE FROM likes_cache; DELETE FROM comments_cache;')
  }
}

export default new SQLiteService()
