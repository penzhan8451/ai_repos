import express from 'express'
import jwt from 'jsonwebtoken'
import { sendVerificationCode, verifyCode } from '../services/smsService.js'
import User from '../models/User.js'

const router = express.Router()

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

/**
 * @route POST /api/auth/sms/send-code
 * @desc 发送短信验证码
 * @access Public
 */
router.post('/send-code', async (req, res) => {
  try {
    const { phoneNumber } = req.body
    
    if (!phoneNumber) {
      return res.status(400).json({ error: '请提供手机号' })
    }
    
    const result = await sendVerificationCode(phoneNumber)
    
    if (result.success) {
      res.json({ message: result.message })
    } else {
      res.status(400).json({ error: result.message })
    }
  } catch (error) {
    console.error('发送验证码错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * @route POST /api/auth/sms/login
 * @desc 短信验证码登录
 * @access Public
 */
router.post('/login', async (req, res) => {
  try {
    const { phoneNumber, code } = req.body
    
    if (!phoneNumber || !code) {
      return res.status(400).json({ error: '请提供手机号和验证码' })
    }
    
    // 验证验证码
    const verifyResult = await verifyCode(phoneNumber, code)
    
    if (!verifyResult.success) {
      return res.status(400).json({ error: verifyResult.message })
    }
    
    // 查找或创建用户
    let user = await User.findOne({ phoneNumber })
    
    if (!user) {
      // 创建新用户
      const username = `user_${phoneNumber.slice(-4)}_${Date.now().toString().slice(-4)}`
      user = new User({
        username,
        email: `${username}@sms.local`, // 临时邮箱
        phoneNumber,
        password: Math.random().toString(36).slice(-16),
        provider: 'sms'
      })
      await user.save()
    }
    
    // 检查账户是否被锁定
    if (user.isLocked()) {
      return res.status(423).json({ 
        error: '账户已锁定，请2小时后再试' 
      })
    }
    
    // 更新最后登录时间
    user.lastLogin = new Date()
    await user.save()
    
    // 生成 token
    const token = generateToken(user._id)
    
    res.json({
      message: '登录成功',
      token,
      user: user.toJSON()
    })
  } catch (error) {
    console.error('短信登录错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

/**
 * @route POST /api/auth/sms/bind-phone
 * @desc 绑定手机号到现有账户
 * @access Private (需要 JWT)
 */
router.post('/bind-phone', async (req, res) => {
  try {
    // 这里需要 JWT 验证中间件
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: '未提供认证令牌' })
    }
    
    const token = authHeader.substring(7)
    let decoded
    
    try {
      decoded = jwt.verify(token, JWT_SECRET)
    } catch (error) {
      return res.status(401).json({ error: '无效的认证令牌' })
    }
    
    const { phoneNumber, code } = req.body
    
    if (!phoneNumber || !code) {
      return res.status(400).json({ error: '请提供手机号和验证码' })
    }
    
    // 验证验证码
    const verifyResult = await verifyCode(phoneNumber, code)
    
    if (!verifyResult.success) {
      return res.status(400).json({ error: verifyResult.message })
    }
    
    // 检查手机号是否已被绑定
    const existingUser = await User.findOne({ phoneNumber })
    if (existingUser && existingUser._id.toString() !== decoded.userId) {
      return res.status(400).json({ error: '该手机号已被其他账户绑定' })
    }
    
    // 更新用户手机号
    const user = await User.findById(decoded.userId)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    
    user.phoneNumber = phoneNumber
    await user.save()
    
    res.json({
      message: '手机号绑定成功',
      user: user.toJSON()
    })
  } catch (error) {
    console.error('绑定手机号错误:', error)
    res.status(500).json({ error: '服务器错误' })
  }
})

export default router
