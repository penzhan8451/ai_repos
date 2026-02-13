import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import { 
  saveCredentials, 
  getCredentials, 
  clearCredentials,
  hasRememberedCredentials 
} from '../utils/rememberMe'
import './Auth.css'

const loginSchema = z.object({
  email: z
    .string()
    .email({ message: '请输入有效的邮箱地址' }),

  password: z
    .string()
    .min(1, '请输入密码'),
    
  rememberMe: z.boolean().optional()
})

function Login() {
  const navigate = useNavigate()
  const { login, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [hasRemembered, setHasRemembered] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
    defaultValues: {
      rememberMe: false
    }
  })

  // 检查是否有记住的凭证
  useEffect(() => {
    if (hasRememberedCredentials()) {
      setHasRemembered(true)
      const credentials = getCredentials()
      if (credentials) {
        setValue('email', credentials.email)
        setValue('password', credentials.password)
        setValue('rememberMe', true)
      }
    }
  }, [setValue])

  const onSubmit = async (data) => {
    clearError()
    
    // 处理记住密码
    if (data.rememberMe) {
      saveCredentials(data.email, data.password)
    } else {
      clearCredentials()
    }
    
    const result = await login(data.email, data.password)
    if (result.success) {
      navigate('/')
    }
  }

  // 社交登录处理
  const handleSocialLogin = (provider) => {
    // 构建 OAuth URL
    const redirectUri = encodeURIComponent(`${window.location.origin}/auth/callback`)
    let authUrl = ''
    
    switch (provider) {
      case 'google':
        authUrl = `http://localhost:3001/api/auth/google?redirect_uri=${redirectUri}`
        break
      case 'github':
        authUrl = `http://localhost:3001/api/auth/github?redirect_uri=${redirectUri}`
        break
      default:
        return
    }
    
    // 打开 OAuth 窗口
    window.location.href = authUrl
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>欢迎回来</h1>
          <p>登录您的个人账户</p>
        </div>

        {/* 社交登录按钮 */}
        <div className="social-login">
          <button 
            type="button" 
            className="social-btn google"
            onClick={() => handleSocialLogin('google')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            使用 Google 登录
          </button>
          
          <button 
            type="button" 
            className="social-btn github"
            onClick={() => handleSocialLogin('github')}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            使用 GitHub 登录
          </button>
        </div>

        <div className="divider">
          <span>或使用邮箱登录</span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              placeholder="请输入邮箱"
              autoComplete="email"
              {...register('email')}
              className={errors.email ? 'error' : ''}
            />
            {errors.email && (
              <span className="error-message">{errors.email.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <div className="password-input">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="请输入密码"
                autoComplete="current-password"
                {...register('password')}
                className={errors.password ? 'error' : ''}
              />
              <button
                type="button"
                className="toggle-password"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
            {errors.password && (
              <span className="error-message">{errors.password.message}</span>
            )}
          </div>

          {/* 记住密码选项 */}
          <div className="form-options">
            <label className="remember-me">
              <input
                type="checkbox"
                {...register('rememberMe')}
              />
              <span>记住密码</span>
            </label>
            <Link to="/forgot-password" className="forgot-password">
              忘记密码？
            </Link>
          </div>

          {error && (
            <div className="error-alert">{error}</div>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            还没有账户？ <Link to="/register">立即注册</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
