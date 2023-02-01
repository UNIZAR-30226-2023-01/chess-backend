import express from 'express'
import * as authCtrl from '../controllers/auth'
import * as userMiddleware from '../middlewares/user'
import passport from 'passport'

const router = express.Router()

router.post('/sign-in', userMiddleware.userPassExists, authCtrl.signIn)
router.post('/sign-up', userMiddleware.userBlockExists, authCtrl.signUp)
router.post('/sign-out', passport.authenticate('jwt', { session: false }), authCtrl.signOut)

export default router
