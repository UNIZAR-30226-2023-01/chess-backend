import express from 'express'
import * as authCtrl from '@controllers/auth'
import * as userMiddleware from '@middlewares/user'
import passport from 'passport'
import { validateBody } from '@middlewares/parser'
import { signIn, signUp, forgotPassword, resetPassword } from '@schemas/auth'

const router = express.Router()

const SUCCESS_REDIRECT = process.env.SUCCESS_REDIRECT ?? 'http://localhost:3000/login?success=true'
const FAILURE_REDIRECT = process.env.FAILURE_REDIRECT ?? 'http://localhost:3000/login?success=false'

router.post('/sign-in', validateBody(signIn), authCtrl.signIn)
router.post('/sign-up', validateBody(signUp), authCtrl.signUp)
router.post('/sign-out', userMiddleware.isAuthenticated, authCtrl.signOut)
router.get('/verify/:id/:token', authCtrl.verify)
router.post('/authenticate', userMiddleware.isAuthenticated, authCtrl.authenticate)

router.post('/forgot-password', validateBody(forgotPassword), authCtrl.forgotPassword)
router.get('/reset-password/:id/:token', authCtrl.resetPassword)
router.post('/reset-password/:id/:token', validateBody(resetPassword), authCtrl.changePassword)

router.get('/sign-in/google', passport.authenticate('google', { scope: ['profile', 'email'] }))
router.get('/google/callback', passport.authenticate('google', {
  failureMessage: 'Invalid credentials',
  failureRedirect: FAILURE_REDIRECT,
  successRedirect: SUCCESS_REDIRECT
}))

export default router
