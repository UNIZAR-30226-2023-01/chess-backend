import express from 'express'
import * as authCtrl from '../controllers/auth'
import * as userMiddleware from '../middlewares/user'
import passport from 'passport'

const router = express.Router()

const SUCCESS_REDIRECT = process.env.SUCCESS_REDIRECT ?? 'http://localhost:3000/login?success=true'
const FAILURE_REDIRECT = process.env.FAILURE_REDIRECT ?? 'http://localhost:3000/login?success=false'

router.post('/sign-in', authCtrl.signIn)
router.post('/sign-up', userMiddleware.userExists, authCtrl.signUp)
// eslint-disable-next-line @typescript-eslint/no-misused-promises
router.post('/sign-out', userMiddleware.isAuthenticated, authCtrl.signOut)
router.post('/verify', userMiddleware.isAuthenticated, authCtrl.verify)

router.get('/sign-in/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/auth/google/callback', passport.authenticate('google', {
  failureMessage: 'Invalid credentials',
  failureRedirect: FAILURE_REDIRECT,
  successRedirect: SUCCESS_REDIRECT
}))

export default router
