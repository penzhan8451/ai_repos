import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import './Auth.css'

function OAuthCallback() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { setUser, setToken } = useAuthStore()

  useEffect(() => {
    const token = searchParams.get('token')
    const userStr = searchParams.get('user')

    if (token && userStr) {
      try {
        const user = JSON.parse(decodeURIComponent(userStr))
        
        // 更新认证状态
        setToken(token)
        setUser(user)
        
        // 跳转到首页
        navigate('/')
      } catch (error) {
        console.error('OAuth callback error:', error)
        navigate('/login?error=oauth_failed')
      }
    } else {
      navigate('/login?error=oauth_failed')
    }
  }, [searchParams, navigate, setUser, setToken])

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>登录中...</h1>
          <p>正在处理 OAuth 登录，请稍候</p>
        </div>
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      </div>
    </div>
  )
}

export default OAuthCallback
