import CryptoJS from 'crypto-js'

const REMEMBER_KEY = 'remembered_credentials'
const SECRET_KEY = 'your-secret-key-change-in-production'

// 加密凭证
export function encryptCredentials(email, password) {
  const data = JSON.stringify({ email, password })
  return CryptoJS.AES.encrypt(data, SECRET_KEY).toString()
}

// 解密凭证
export function decryptCredentials(encryptedData) {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedData, SECRET_KEY)
    const decrypted = bytes.toString(CryptoJS.enc.Utf8)
    return JSON.parse(decrypted)
  } catch (error) {
    console.error('解密失败:', error)
    return null
  }
}

// 保存记住的凭证
export function saveCredentials(email, password) {
  const encrypted = encryptCredentials(email, password)
  localStorage.setItem(REMEMBER_KEY, encrypted)
}

// 获取记住的凭证
export function getCredentials() {
  const encrypted = localStorage.getItem(REMEMBER_KEY)
  if (!encrypted) return null
  return decryptCredentials(encrypted)
}

// 清除记住的凭证
export function clearCredentials() {
  localStorage.removeItem(REMEMBER_KEY)
}

// 检查是否有记住的凭证
export function hasRememberedCredentials() {
  return !!localStorage.getItem(REMEMBER_KEY)
}
