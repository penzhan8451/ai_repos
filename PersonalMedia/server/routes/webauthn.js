import express from 'express'
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse
} from '@simplewebauthn/server'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

const router = express.Router()

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// RP Configuration
const RP_NAME = 'PersonalMedia'
const RP_ID = process.env.RP_ID || 'localhost'
const ORIGIN = process.env.ORIGIN || 'http://localhost:3000'

// In-memory challenge store (production should use Redis/database)
const challengeStore = new Map()

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// Get registration options
router.post('/register-options', async (req, res) => {
  try {
    const { userId, username, displayName } = req.body
    
    if (!userId || !username) {
      return res.status(400).json({ error: '缺少必要参数' })
    }
    
    // Get user's existing credentials
    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    
    const existingCredentials = user.webAuthnCredentials || []
    
    const options = await generateRegistrationOptions({
      rpName: RP_NAME,
      rpID: RP_ID,
      userID: userId,
      userName: username,
      userDisplayName: displayName || username,
      attestationType: 'none',
      excludeCredentials: existingCredentials.map(cred => ({
        id: cred.credentialID,
        type: 'public-key',
        transports: cred.transports || []
      })),
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred'
      }
    })
    
    // Store challenge
    challengeStore.set(userId, options.challenge)
    
    res.json(options)
  } catch (error) {
    console.error('生成注册选项失败:', error)
    res.status(500).json({ error: '生成注册选项失败' })
  }
})

// Verify registration
router.post('/register', async (req, res) => {
  try {
    const { id, rawId, response, type } = req.body
    
    // Get user from response (you might need to pass userId in the request)
    const clientDataJSON = JSON.parse(
      Buffer.from(response.clientDataJSON, 'base64url').toString()
    )
    
    // Extract userId from challenge store or pass it in request
    // For simplicity, we'll pass userId in the request body
    const { userId } = req.body
    
    if (!userId) {
      return res.status(400).json({ error: '缺少用户ID' })
    }
    
    const expectedChallenge = challengeStore.get(userId)
    
    if (!expectedChallenge) {
      return res.status(400).json({ error: '注册会话已过期' })
    }
    
    const verification = await verifyRegistrationResponse({
      response: {
        id,
        rawId,
        response: {
          clientDataJSON: response.clientDataJSON,
          attestationObject: response.attestationObject
        },
        type
      },
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID
    })
    
    if (verification.verified && verification.registrationInfo) {
      // Save credential to user
      const user = await User.findById(userId)
      if (!user) {
        return res.status(404).json({ error: '用户不存在' })
      }
      
      const { credentialID, credentialPublicKey, counter } = verification.registrationInfo
      
      // Add new credential
      if (!user.webAuthnCredentials) {
        user.webAuthnCredentials = []
      }
      
      user.webAuthnCredentials.push({
        credentialID: Buffer.from(credentialID).toString('base64url'),
        credentialPublicKey: Buffer.from(credentialPublicKey).toString('base64url'),
        counter,
        transports: ['internal'],
        createdAt: new Date()
      })
      
      await user.save()
      
      // Clear challenge
      challengeStore.delete(userId)
      
      res.json({ success: true, message: '生物识别注册成功' })
    } else {
      res.status(400).json({ error: '验证失败' })
    }
  } catch (error) {
    console.error('注册验证失败:', error)
    res.status(500).json({ error: '注册验证失败: ' + error.message })
  }
})

// Get authentication options
router.post('/login-options', async (req, res) => {
  try {
    const options = await generateAuthenticationOptions({
      rpID: RP_ID,
      allowCredentials: [], // Empty to allow any credential
      userVerification: 'required'
    })
    
    // Store challenge with a temporary ID
    const tempId = Math.random().toString(36).substring(7)
    challengeStore.set(`auth_${tempId}`, options.challenge)
    
    res.json({
      ...options,
      tempId
    })
  } catch (error) {
    console.error('生成登录选项失败:', error)
    res.status(500).json({ error: '生成登录选项失败' })
  }
})

// Verify authentication
router.post('/login', async (req, res) => {
  try {
    const { id, rawId, response, type, tempId } = req.body
    
    const expectedChallenge = challengeStore.get(`auth_${tempId}`)
    
    if (!expectedChallenge) {
      return res.status(400).json({ error: '登录会话已过期' })
    }
    
    // Find user by credential ID
    const credentialID = id
    const user = await User.findOne({
      'webAuthnCredentials.credentialID': credentialID
    })
    
    if (!user) {
      return res.status(404).json({ error: '未找到匹配的凭证' })
    }
    
    // Find the specific credential
    const credential = user.webAuthnCredentials.find(
      cred => cred.credentialID === credentialID
    )
    
    if (!credential) {
      return res.status(404).json({ error: '凭证不存在' })
    }
    
    const verification = await verifyAuthenticationResponse({
      response: {
        id,
        rawId,
        response: {
          authenticatorData: response.authenticatorData,
          clientDataJSON: response.clientDataJSON,
          signature: response.signature,
          userHandle: response.userHandle
        },
        type,
        clientExtensionResults: {}
      },
      expectedChallenge,
      expectedOrigin: ORIGIN,
      expectedRPID: RP_ID,
      authenticator: {
        credentialID: Buffer.from(credential.credentialID, 'base64url'),
        credentialPublicKey: Buffer.from(credential.credentialPublicKey, 'base64url'),
        counter: credential.counter
      }
    })
    
    if (verification.verified) {
      // Update counter
      credential.counter = verification.authenticationInfo.newCounter
      await user.save()
      
      // Clear challenge
      challengeStore.delete(`auth_${tempId}`)
      
      // Update last login
      user.lastLogin = new Date()
      await user.save()
      
      // Generate token
      const token = generateToken(user._id)
      
      res.json({
        success: true,
        token,
        user: user.toJSON()
      })
    } else {
      res.status(400).json({ error: '验证失败' })
    }
  } catch (error) {
    console.error('登录验证失败:', error)
    res.status(500).json({ error: '登录验证失败: ' + error.message })
  }
})

// Get user's biometric credentials
router.get('/credentials/:userId', async (req, res) => {
  try {
    const { userId } = req.params
    const user = await User.findById(userId)
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    
    const credentials = (user.webAuthnCredentials || []).map(cred => ({
      id: cred.credentialID,
      createdAt: cred.createdAt
    }))
    
    res.json({ credentials })
  } catch (error) {
    console.error('获取凭证失败:', error)
    res.status(500).json({ error: '获取凭证失败' })
  }
})

// Delete biometric credential
router.delete('/credentials/:userId/:credentialId', async (req, res) => {
  try {
    const { userId, credentialId } = req.params
    const user = await User.findById(userId)
    
    if (!user) {
      return res.status(404).json({ error: '用户不存在' })
    }
    
    user.webAuthnCredentials = user.webAuthnCredentials.filter(
      cred => cred.credentialID !== credentialId
    )
    
    await user.save()
    
    res.json({ success: true, message: '凭证已删除' })
  } catch (error) {
    console.error('删除凭证失败:', error)
    res.status(500).json({ error: '删除凭证失败' })
  }
})

export default router
