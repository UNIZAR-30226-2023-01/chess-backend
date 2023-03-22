import express from 'express'
import * as userCtrl from '@controllers/users'
import * as userMiddleware from '@middlewares/user'
import { paginate } from '@middlewares/paginate'
import { UserModel } from '@models/user'

const router = express.Router()

router.get('/', userMiddleware.isAuthenticated, paginate(UserModel), userCtrl.getAll)
router.get('/:id', userMiddleware.isAuthenticated, userCtrl.getOne)
router.patch('/:id', userMiddleware.isAuthenticated, userCtrl.updateOne)
router.delete('/:id', userMiddleware.isAuthenticated, userCtrl.deleteOne)

export default router
