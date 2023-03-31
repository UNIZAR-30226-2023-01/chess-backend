import express from 'express'
import * as userCtrl from '@controllers/users'
import * as userMiddleware from '@middlewares/user'
import { paginate } from '@middlewares/paginate'
import { UserModel } from '@models/user'
import { updateUser } from '@schemas/users'
import { validateBody } from '@middlewares/parser'

const router = express.Router()

router.get('/', userMiddleware.isAuthenticated, paginate(UserModel), userCtrl.getAll)
router.get('/:id', userMiddleware.isAuthenticated, userCtrl.getOne)
router.patch('/:id', userMiddleware.isAuthenticated, validateBody(updateUser), userCtrl.updateOne)
router.delete('/:id', userMiddleware.isAuthenticated, userCtrl.deleteOne)

export default router
