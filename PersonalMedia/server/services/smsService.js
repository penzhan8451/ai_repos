// 短信服务
// 支持 Twilio 和模拟模式（开发测试用）

import twilio from 'twilio'

// 短信提供商类型
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'mock' // 'twilio' 或 'mock'

// Twilio 配置
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER

// 验证码存储（生产环境应使用 Redis）
const verificationCodes = new Map()

// 验证码有效期（分钟）
const CODE_EXPIRY_MINUTES = 5

// 发送间隔（秒）
const SEND_INTERVAL_SECONDS = 60

// 每日发送限制
const DAILY_LIMIT = 10

/**
 * 发送短信验证码
 * @param {string} phoneNumber - 手机号
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function sendVerificationCode(phoneNumber) {
  try {
    // 验证手机号格式
    if (!isValidPhoneNumber(phoneNumber)) {
      return { success: false, message: '请输入有效的手机号' }
    }
    
    // 检查发送间隔
    const lastSent = verificationCodes.get(`${phoneNumber}_lastSent`)
    if (lastSent && Date.now() - lastSent < SEND_INTERVAL_SECONDS * 1000) {
      const remaining = Math.ceil((SEND_INTERVAL_SECONDS * 1000 - (Date.now() - lastSent)) / 1000)
      return { success: false, message: `请 ${remaining} 秒后重试` }
    }
    
    // 检查每日限制
    const today = new Date().toDateString()
    const dailyKey = `${phoneNumber}_daily_${today}`
    const dailyCount = verificationCodes.get(dailyKey) || 0
    if (dailyCount >= DAILY_LIMIT) {
      return { success: false, message: '今日发送次数已达上限，请明天再试' }
    }
    
    // 生成6位验证码
    const code = generateCode()
    
    // 存储验证码
    verificationCodes.set(phoneNumber, {
      code,
      expiresAt: Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000,
      attempts: 0
    })
    
    // 更新发送记录
    verificationCodes.set(`${phoneNumber}_lastSent`, Date.now())
    verificationCodes.set(dailyKey, dailyCount + 1)
    
    // 发送短信
    if (SMS_PROVIDER === 'twilio' && TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN) {
      await sendTwilioSMS(phoneNumber, code)
    } else {
      // 模拟模式 - 打印到控制台
      console.log(`\n========== 短信验证码 ==========`)
      console.log(`手机号: ${phoneNumber}`)
      console.log(`验证码: ${code}`)
      console.log(`有效期: ${CODE_EXPIRY_MINUTES}分钟`)
      console.log(`================================\n`)
    }
    
    return { success: true, message: '验证码已发送' }
  } catch (error) {
    console.error('发送验证码失败:', error)
    return { success: false, message: '发送失败，请稍后重试' }
  }
}

/**
 * 验证短信验证码
 * @param {string} phoneNumber - 手机号
 * @param {string} code - 验证码
 * @returns {Promise<{success: boolean, message: string}>}
 */
export async function verifyCode(phoneNumber, code) {
  try {
    const record = verificationCodes.get(phoneNumber)
    
    if (!record) {
      return { success: false, message: '验证码不存在或已过期' }
    }
    
    // 检查是否过期
    if (Date.now() > record.expiresAt) {
      verificationCodes.delete(phoneNumber)
      return { success: false, message: '验证码已过期' }
    }
    
    // 检查尝试次数
    if (record.attempts >= 5) {
      verificationCodes.delete(phoneNumber)
      return { success: false, message: '验证失败次数过多，请重新获取验证码' }
    }
    
    // 验证验证码
    if (record.code !== code) {
      record.attempts++
      return { success: false, message: '验证码错误' }
    }
    
    // 验证成功，删除记录
    verificationCodes.delete(phoneNumber)
    
    return { success: true, message: '验证成功' }
  } catch (error) {
    console.error('验证验证码失败:', error)
    return { success: false, message: '验证失败，请稍后重试' }
  }
}

/**
 * 使用 Twilio 发送短信
 */
async function sendTwilioSMS(phoneNumber, code) {
  const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
  
  const message = await client.messages.create({
    body: `【PersonalMedia】您的验证码是：${code}，${CODE_EXPIRY_MINUTES}分钟内有效。请勿将验证码告知他人。`,
    from: TWILIO_PHONE_NUMBER,
    to: phoneNumber
  })
  
  console.log('Twilio SMS sent:', message.sid)
  return message
}

/**
 * 生成6位验证码
 */
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

/**
 * 验证手机号格式
 */
function isValidPhoneNumber(phoneNumber) {
  // 支持国际格式 +86138xxxxxxxx 或国内格式 138xxxxxxxx
  const regex = /^\+?[1-9]\d{1,14}$/
  return regex.test(phoneNumber)
}

/**
 * 清理过期的验证码（可定时调用）
 */
export function cleanupExpiredCodes() {
  const now = Date.now()
  for (const [key, value] of verificationCodes.entries()) {
    if (value.expiresAt && now > value.expiresAt) {
      verificationCodes.delete(key)
    }
  }
}

// 每小时清理一次过期验证码
setInterval(cleanupExpiredCodes, 60 * 60 * 1000)
