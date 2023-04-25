import express from 'express'
import * as gamesCtrl from '@controllers/games'
import * as userMiddleware from '@middlewares/user'
import { paginate } from '@middlewares/paginate'
import { GameModel } from '@models/game'

const router = express.Router()

router.get('/', userMiddleware.isAuthenticated, paginate(GameModel), gamesCtrl.getAll)
router.get('/:id', userMiddleware.isAuthenticated, gamesCtrl.getOne)
router.get('/notify', userMiddleware.isAuthenticated, gamesCtrl.getOne)

export default router
