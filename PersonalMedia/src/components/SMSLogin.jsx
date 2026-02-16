import { useState, useEffect } from 'react'
import useAuthStore from '../store/authStore'

function SMSLogin({ onSuccess }) {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [countdown, setCountdown] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState('phone') // 'phone' 或 'code'
  
  const { setToken, setUser } = useAuthStore()

  // 倒计时
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // 发送验证码
  const sendCode = async () => {
    if (!phoneNumber) {
      setError('请输入手机号')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('http://localhost:3001/api/auth/sms/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setStep('code')
        setCountdown(60)
        setError('')
      } else {
        setError(data.error || '发送失败')
      }
    } catch (err) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  // 登录
  const handleLogin = async () => {
    if (!verificationCode) {
      setError('请输入验证码')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('http://localhost:3001/api/auth/sms/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ phoneNumber, code: verificationCode })
      })
      
      const data = await response.json()
      
      if (response.ok) {
        setToken(data.token)
        setUser(data.user)
        onSuccess && onSuccess()
      } else {
        setError(data.error || '登录失败')
      }
    } catch (err) {
      setError('网络错误，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sms-login">
      <h3>短信验证码登录</h3>
      
      {error && <div className="error-message">{error}</div>}
      
      {step === 'phone' ? (
        <div className="sms-step">
          <div className="form-group">
            <label>手机号</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="请输入手机号"
              disabled={loading}
            />
          </div>
          <button 
            className="sms-btn"
            onClick={sendCode}
            disabled={loading || !phoneNumber}
          >
            {loading ? '发送中...' : '获取验证码'}
          </button>
        </div>
      ) : (
        <div className="sms-step">
          <div className="form-group">
            <label>验证码</label>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="请输入6位验证码"
              maxLength={6}
              disabled={loading}
            />
          </div>
          <button 
            className="sms-btn"
            onClick={handleLogin}
            disabled={loading || verificationCode.length !== 6}
          >
            {loading ? '登录中...' : '登录'}
          </button>
          <div className="sms-actions">
            {countdown > 0 ? (
              <span className="countdown">{countdown}秒后重新发送</span>
            ) : (
              <button 
                className="resend-btn"
                onClick={sendCode}
                disabled={loading}
              >
                重新发送
              </button>
            )}
            <button 
              className="back-btn"
              onClick={() => setStep('phone')}
            >
              更换手机号
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default SMSLogin
