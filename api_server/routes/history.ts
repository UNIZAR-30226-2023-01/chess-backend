import express from 'express'
import * as historyCtrl from '@controllers/history'
import * as userMiddleware from '@middlewares/user'
import { paginate } from '@middlewares/paginate'
import HistoryModel from '@models/history'

const router = express.Router()

router.get('/', userMiddleware.isAuthenticated, paginate(HistoryModel), historyCtrl.getAll)
router.get('/:id', userMiddleware.isAuthenticated, historyCtrl.getOne)

export default router
