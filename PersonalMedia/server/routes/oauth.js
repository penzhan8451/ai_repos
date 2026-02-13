import express from 'express'
import passport from 'passport'
import jwt from 'jsonwebtoken'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import User from '../models/User.js'

const router = express.Router()

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// Frontend URL
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000'

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// Configure Passport Strategies
function configureOAuth() {
  // Google OAuth Strategy
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: '/api/auth/google/callback',
          scope: ['profile', 'email']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            // Check if user exists
            let user = await User.findOne({ email: profile.emails[0].value })
            
            if (!user) {
              // Create new user
              user = new User({
                username: profile.displayName || profile.emails[0].value.split('@')[0],
                email: profile.emails[0].value,
                password: Math.random().toString(36).slice(-16),
                avatar: profile.photos[0]?.value,
                provider: 'google',
                providerId: profile.id
              })
              await user.save()
            }
            
            done(null, user)
          } catch (error) {
            done(error, null)
          }
        }
      )
    )
  }

  // GitHub OAuth Strategy
  if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: process.env.GITHUB_CLIENT_ID,
          clientSecret: process.env.GITHUB_CLIENT_SECRET,
          callbackURL: '/api/auth/github/callback',
          scope: ['user:email']
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value || `${profile.username}@github.com`
            
            // Check if user exists
            let user = await User.findOne({ email })
            
            if (!user) {
              // Create new user
              user = new User({
                username: profile.username || profile.displayName,
                email: email,
                password: Math.random().toString(36).slice(-16),
                avatar: profile.photos[0]?.value,
                provider: 'github',
                providerId: profile.id
              })
              await user.save()
            }
            
            done(null, user)
          } catch (error) {
            done(error, null)
          }
        }
      )
    )
  }
}

// Google OAuth Routes
router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  (req, res) => {
    const token = generateToken(req.user._id)
    const redirectUrl = req.query.redirect_uri || FRONTEND_URL
    
    // Redirect to frontend with token
    res.redirect(`${redirectUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`)
  }
)

// GitHub OAuth Routes
router.get('/github',
  passport.authenticate('github', { scope: ['user:email'] })
)

router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login?error=oauth_failed' }),
  (req, res) => {
    const token = generateToken(req.user._id)
    const redirectUrl = req.query.redirect_uri || FRONTEND_URL
    
    // Redirect to frontend with token
    res.redirect(`${redirectUrl}/auth/callback?token=${token}&user=${encodeURIComponent(JSON.stringify(req.user))}`)
  }
)

export default router
export { configureOAuth }
