import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
import { Strategy as GitHubStrategy } from 'passport-github2'
import User from '../models/User.js'

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN })
}

// Configure Passport
export function configurePassport() {
  // Serialize user
  passport.serializeUser((user, done) => {
    done(null, user.id)
  })

  // Deserialize user
  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id)
      done(null, user)
    } catch (error) {
      done(error, null)
    }
  })

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
                password: Math.random().toString(36).slice(-16), // Random password
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
                password: Math.random().toString(36).slice(-16), // Random password
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

export { generateToken }
