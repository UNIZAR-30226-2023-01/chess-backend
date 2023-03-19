import express from 'express'
import * as indexCtrl from '@controllers/main'
import * as userMiddleware from '@middlewares/user'

const router = express.Router()

router.get('/ping', indexCtrl.pong)
router.get('/secure-ping', userMiddleware.isAuthenticated, indexCtrl.protectedPong)

export default router
