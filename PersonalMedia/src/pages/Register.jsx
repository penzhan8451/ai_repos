import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../store/authStore'
import './Auth.css'

const registerSchema = z.object({
  username: z
    .string()
    .min(3, '用户名至少需要3个字符')
    .max(30, '用户名最多30个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  email: z
    .string()
    .email('请输入有效的邮箱地址'),
  password: z
    .string()
    .min(8, '密码至少需要8个字符'),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: '两次输入的密码不一致',
  path: ['confirmPassword']
})

function Register() {
  const navigate = useNavigate()
  const { register: registerUser, isLoading, error, clearError } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState(0)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(registerSchema),
    mode: 'onChange'
  })

  const password = watch('password', '')

  // Calculate password strength
  const calculateStrength = (pwd) => {
    let strength = 0
    if (pwd.length >= 8) strength++
    if (pwd.match(/[a-z]/)) strength++
    if (pwd.match(/[A-Z]/)) strength++
    if (pwd.match(/[0-9]/)) strength++
    if (pwd.match(/[^a-zA-Z0-9]/)) strength++
    return strength
  }

  const onPasswordChange = (e) => {
    const pwd = e.target.value
    setPasswordStrength(calculateStrength(pwd))
  }

  const onSubmit = async (data) => {
    clearError()
    const result = await registerUser(data.username, data.email, data.password)
    if (result.success) {
      navigate('/')
    }
  }

  const getStrengthColor = () => {
    if (passwordStrength <= 2) return '#e74c3c'
    if (passwordStrength <= 3) return '#f39c12'
    return '#27ae60'
  }

  const getStrengthText = () => {
    if (passwordStrength <= 2) return '弱'
    if (passwordStrength <= 3) return '中'
    return '强'
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <h1>创建账户</h1>
          <p>开始您的个人媒体库之旅</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">用户名</label>
            <input
              id="username"
              type="text"
              placeholder="请输入用户名"
              {...register('username')}
              className={errors.username ? 'error' : ''}
            />
            {errors.username && (
              <span className="error-message">{errors.username.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="email">邮箱</label>
            <input
              id="email"
              type="email"
              placeholder="请输入邮箱"
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
                placeholder="请输入密码（至少8位）"
                {...register('password', {
                  onChange: onPasswordChange
                })}
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
            {password && (
              <div className="password-strength">
                <div
                  className="strength-bar"
                  style={{
                    width: `${(passwordStrength / 5) * 100}%`,
                    backgroundColor: getStrengthColor()
                  }}
                />
                <span style={{ color: getStrengthColor() }}>
                  密码强度: {getStrengthText()}
                </span>
              </div>
            )}
            {errors.password && (
              <span className="error-message">{errors.password.message}</span>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">确认密码</label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              placeholder="请再次输入密码"
              {...register('confirmPassword')}
              className={errors.confirmPassword ? 'error' : ''}
            />
            {errors.confirmPassword && (
              <span className="error-message">{errors.confirmPassword.message}</span>
            )}
          </div>

          {error && (
            <div className="error-alert">{error}</div>
          )}

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? '注册中...' : '创建账户'}
          </button>
        </form>

        <div className="auth-footer">
          <p>已有账户？ <Link to="/login">立即登录</Link></p>
        </div>
      </div>
    </div>
  )
}

export default Register
