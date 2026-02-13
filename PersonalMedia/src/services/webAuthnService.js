// WebAuthn 生物识别服务
// 支持指纹和面部识别登录

/**
 * 检查浏览器是否支持 WebAuthn
 */
export function isWebAuthnSupported() {
  return window.PublicKeyCredential !== undefined
}

/**
 * 检查设备是否支持生物识别
 */
export async function isBiometricAvailable() {
  if (!isWebAuthnSupported()) {
    return false
  }
  
  try {
    // 检查是否有可用的认证器
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
    return available
  } catch (error) {
    console.error('检查生物识别可用性失败:', error)
    return false
  }
}

/**
 * 注册生物识别凭证
 * @param {string} userId - 用户ID
 * @param {string} username - 用户名
 * @param {string} displayName - 显示名称
 */
export async function registerBiometric(userId, username, displayName) {
  if (!isWebAuthnSupported()) {
    throw new Error('您的浏览器不支持生物识别功能')
  }
  
  try {
    // 从服务器获取注册选项
    const response = await fetch('/api/auth/webauthn/register-options', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ userId, username, displayName })
    })
    
    if (!response.ok) {
      throw new Error('获取注册选项失败')
    }
    
    const options = await response.json()
    
    // 转换 base64url 为 ArrayBuffer
    options.user.id = base64URLToBuffer(options.user.id)
    options.challenge = base64URLToBuffer(options.challenge)
    
    if (options.excludeCredentials) {
      options.excludeCredentials = options.excludeCredentials.map(cred => ({
        ...cred,
        id: base64URLToBuffer(cred.id)
      }))
    }
    
    // 创建凭证
    const credential = await navigator.credentials.create({ publicKey: options })
    
    // 发送凭证到服务器验证
    const registrationData = {
      id: credential.id,
      rawId: bufferToBase64URL(credential.rawId),
      type: credential.type,
      response: {
        clientDataJSON: bufferToBase64URL(credential.response.clientDataJSON),
        attestationObject: bufferToBase64URL(credential.response.attestationObject)
      }
    }
    
    const verifyResponse = await fetch('/api/auth/webauthn/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registrationData)
    })
    
    if (!verifyResponse.ok) {
      const error = await verifyResponse.json()
      throw new Error(error.message || '注册生物识别失败')
    }
    
    // 保存凭证ID到本地存储
    saveCredentialId(credential.id)
    
    return { success: true }
  } catch (error) {
    console.error('生物识别注册失败:', error)
    throw error
  }
}

/**
 * 使用生物识别登录
 */
export async function loginWithBiometric() {
  if (!isWebAuthnSupported()) {
    throw new Error('您的浏览器不支持生物识别功能')
  }
  
  try {
    // 从服务器获取认证选项
    const response = await fetch('/api/auth/webauthn/login-options', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error('获取登录选项失败')
    }
    
    const options = await response.json()
    
    // 转换 base64url 为 ArrayBuffer
    options.challenge = base64URLToBuffer(options.challenge)
    
    if (options.allowCredentials) {
      options.allowCredentials = options.allowCredentials.map(cred => ({
        ...cred,
        id: base64URLToBuffer(cred.id)
      }))
    }
    
    // 获取凭证
    const assertion = await navigator.credentials.get({ publicKey: options })
    
    // 发送凭证到服务器验证
    const authData = {
      id: assertion.id,
      rawId: bufferToBase64URL(assertion.rawId),
      type: assertion.type,
      response: {
        authenticatorData: bufferToBase64URL(assertion.response.authenticatorData),
        clientDataJSON: bufferToBase64URL(assertion.response.clientDataJSON),
        signature: bufferToBase64URL(assertion.response.signature),
        userHandle: assertion.response.userHandle 
          ? bufferToBase64URL(assertion.response.userHandle)
          : null
      }
    }
    
    const verifyResponse = await fetch('/api/auth/webauthn/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(authData)
    })
    
    if (!verifyResponse.ok) {
      const error = await verifyResponse.json()
      throw new Error(error.message || '生物识别登录失败')
    }
    
    const result = await verifyResponse.json()
    return { success: true, token: result.token, user: result.user }
  } catch (error) {
    console.error('生物识别登录失败:', error)
    throw error
  }
}

/**
 * 检查是否已注册生物识别
 */
export function hasBiometricRegistered() {
  return !!getCredentialId()
}

/**
 * 保存凭证ID
 */
function saveCredentialId(credentialId) {
  localStorage.setItem('biometric_credential_id', credentialId)
}

/**
 * 获取凭证ID
 */
function getCredentialId() {
  return localStorage.getItem('biometric_credential_id')
}

/**
 * 清除生物识别凭证
 */
export function clearBiometricCredential() {
  localStorage.removeItem('biometric_credential_id')
}

/**
 * Base64URL 转 ArrayBuffer
 */
function base64URLToBuffer(base64URL) {
  const base64 = base64URL.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - base64.length % 4) % 4
  const padded = base64 + '='.repeat(padLen)
  const binary = atob(padded)
  const buffer = new ArrayBuffer(binary.length)
  const view = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) {
    view[i] = binary.charCodeAt(i)
  }
  return buffer
}

/**
 * ArrayBuffer 转 Base64URL
 */
function bufferToBase64URL(buffer) {
  const binary = String.fromCharCode(...new Uint8Array(buffer))
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}
