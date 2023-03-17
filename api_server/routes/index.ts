import express from 'express'
import * as indexCtrl from '@controllers/main'
import * as userMiddleware from '@middlewares/user'

const router = express.Router()

router.get('/ping', indexCtrl.pong)
router.get('/ping-v2', userMiddleware.isAuthenticated, indexCtrl.protectedPong)

export default router
