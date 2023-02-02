import express from 'express'
import * as indexCtrl from '../controllers/main'
import passport from 'passport'

const router = express.Router()

router.get('/ping', indexCtrl.pong)
router.get('/ping-v2', indexCtrl.protectedPong)
router.get('/ping-v2', passport.authenticate('jwt', { session: false }), indexCtrl.protectedPong)

export default router
