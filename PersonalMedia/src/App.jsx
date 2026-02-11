import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom'
import Home from './pages/Home'
import Photos from './pages/Photos'
import Videos from './pages/Videos'
import Favorites from './pages/Favorites'
import './App.css'

function App() {
  return (
    <Router>
      <div className="app">
        <header className="header">
          <h1>个人媒体库</h1>
          <nav className="nav">
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
          </nav>
        </header>
        
        <main className="main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/photos" element={<Photos />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/favorites" element={<Favorites />} />
          </Routes>
        </main>
        
        <footer className="footer">
          <p>&copy; 2025 个人媒体库 - TraeFirst</p>
        </footer>
      </div>
    </Router>
  )
}

export default App
