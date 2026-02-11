import express from 'express'
import jwt from 'jsonwebtoken'
import rateLimit from 'express-rate-limit'
import User from '../models/User.js'

const router = express.Router()

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: { error: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
})

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body

    // Validation
    if (!username || !email || !password) {
      return res.status(400).json({ error: '所有字段都是必需的' })
    }

    // Check if user exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    })

    if (existingUser) {
      if (existingUser.email === email) {
        return res.status(409).json({ error: '该邮箱已被注册' })
      }
      if (existingUser.username === username) {
        return res.status(409).json({ error: '该用户名已被使用' })
      }
    }

    // Create user
    const user = new User({ username, email, password })
    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.status(201).json({
      message: '注册成功',
      user: user.toJSON(),
      token
    })
  } catch (error) {
    console.error('Registration error:', error)
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message)
      return res.status(400).json({ error: messages.join(', ') })
    }
    res.status(500).json({ error: '注册失败，请稍后重试' })
  }
})

// Login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: '邮箱和密码是必需的' })
    }

    // Find user with password
    const user = await User.findOne({ email }).select('+password')

    if (!user) {
      return res.status(401).json({ error: '邮箱或密码错误' })
    }

    // Check if account is locked
    if (user.isLocked()) {
      return res.status(423).json({
        error: '账户已被锁定，请2小时后再试'
      })
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(403).json({ error: '账户已被禁用' })
    }

    // Verify password
    const isValid = await user.comparePassword(password)

    if (!isValid) {
      await user.incrementLoginAttempts()
      const attemptsLeft = 5 - (user.loginAttempts + 1)
      return res.status(401).json({
        error: '邮箱或密码错误',
        attemptsLeft: Math.max(0, attemptsLeft)
      })
    }

    // Reset login attempts
    await user.resetLoginAttempts()

    // Update last login
    user.lastLogin = new Date()
    await user.save()

    // Generate token
    const token = generateToken(user._id)

    res.json({
      message: '登录成功',
      user: user.toJSON(),
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ error: '登录失败，请稍后重试' })
  }
})

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    if (!user.isActive) {
      return res.status(403).json({ error: '账户已被禁用' })
    }

    res.json({ user: user.toJSON() })
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: '无效的令牌' })
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: '令牌已过期' })
    }
    console.error('Get user error:', error)
    res.status(500).json({ error: '获取用户信息失败' })
  }
})

// Update profile
router.patch('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const { username, avatar } = req.body

    const user = await User.findById(decoded.userId)

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // Update fields
    if (username) user.username = username
    if (avatar) user.avatar = avatar

    await user.save()

    res.json({
      message: '更新成功',
      user: user.toJSON()
    })
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(e => e.message)
      return res.status(400).json({ error: messages.join(', ') })
    }
    console.error('Update profile error:', error)
    res.status(500).json({ error: '更新失败' })
  }
})

// Change password
router.post('/change-password', authLimiter, async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1]

    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: '当前密码和新密码都是必需的' })
    }

    const user = await User.findById(decoded.userId).select('+password')

    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }

    // Verify current password
    const isValid = await user.comparePassword(currentPassword)

    if (!isValid) {
      return res.status(401).json({ error: '当前密码错误' })
    }

    // Update password
    user.password = newPassword
    await user.save()

    res.json({ message: '密码修改成功' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ error: '修改密码失败' })
  }
})

export default router
