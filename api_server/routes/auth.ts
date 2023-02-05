import express from 'express'
import * as authCtrl from '../controllers/auth'
import * as userMiddleware from '../middlewares/user'
// import jwt from 'jsonwebtoken'
// import dayjs from 'dayjs'
import passport from 'passport'

const router = express.Router()

const SUCCESS_REDIRECT = process.env.SUCCESS_REDIRECT ?? 'http://localhost:3000?success=true'
const FAILURE_REDIRECT = process.env.FAILURE_REDIRECT ?? 'http://localhost:3000?success=false'

router.post('/sign-in', userMiddleware.userPassExists, authCtrl.signIn)
router.post('/sign-up', userMiddleware.userBlockExists, authCtrl.signUp)
router.post('/sign-out', passport.authenticate('jwt', { session: false }), authCtrl.signOut)

router.get('/sign-in/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/auth/google/callback', passport.authenticate('google', {
  failureMessage: 'Invalid credentials',
  failureRedirect: FAILURE_REDIRECT,
  successRedirect: SUCCESS_REDIRECT,
  session: false
}), (req, res) => {
  console.log('req.user', req.user)

  res.send('thanks for logging in!')
})

export default router
