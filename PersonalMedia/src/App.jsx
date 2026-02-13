import { BrowserRouter as Router, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import Home from './pages/Home'
import Photos from './pages/Photos'
import Videos from './pages/Videos'
import Favorites from './pages/Favorites'
import Login from './pages/Login'
import Register from './pages/Register'
import OAuthCallback from './pages/OAuthCallback'
import useAuthStore from './store/authStore'
import './App.css'

// Protected Route Component
function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

// Public Route Component (redirect if authenticated)
function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore()
  return !isAuthenticated ? children : <Navigate to="/" replace />
}

function Navigation() {
  const { user, isAuthenticated, logout } = useAuthStore()

  return (
    <header className="header">
      <h1>个人媒体库</h1>
      <nav className="nav">
        {isAuthenticated ? (
          <>
            <NavLink to="/" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'} end>
              首页
            </NavLink>
            <NavLink to="/photos" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
              照片
            </NavLink>
            <NavLink to="/videos" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
              视频
            </NavLink>
            <NavLink to="/favorites" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
              收藏
            </NavLink>
            <div className="user-menu">
              <span className="user-name">{user?.username}</span>
              <button onClick={logout} className="logout-btn">
                退出
              </button>
            </div>
          </>
        ) : (
          <>
            <NavLink to="/login" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
              登录
            </NavLink>
            <NavLink to="/register" className={({isActive}) => isActive ? 'nav-link active' : 'nav-link'}>
              注册
            </NavLink>
          </>
        )}
      </nav>
    </header>
  )
}

function App() {
  const { fetchUser } = useAuthStore()

  useEffect(() => {
    fetchUser()
  }, [])

  return (
    <Router>
      <div className="app">
        <Navigation />
        
        <main className="main">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />
            <Route path="/auth/callback" element={<OAuthCallback />} />

            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            } />
            <Route path="/photos" element={
              <ProtectedRoute>
                <Photos />
              </ProtectedRoute>
            } />
            <Route path="/videos" element={
              <ProtectedRoute>
                <Videos />
              </ProtectedRoute>
            } />
            <Route path="/favorites" element={
              <ProtectedRoute>
                <Favorites />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
        
        <footer className="footer">
          <p>&copy; 2025 个人媒体库 - PersonalMedia</p>
        </footer>
      </div>
    </Router>
  )
}

export default App
