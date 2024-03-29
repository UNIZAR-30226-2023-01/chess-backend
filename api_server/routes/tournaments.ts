import express from 'express'
import * as tournamentsCtrl from '@controllers/tournaments'
import * as userMiddleware from '@middlewares/user'
import { paginate } from '@middlewares/paginate'
import { TournamentModel } from '@models/tournament'
import { validateBody } from '@middlewares/parser'
import { createTournament } from '@schemas/tournaments'

const router = express.Router()

router.post('/', validateBody(createTournament), userMiddleware.isAuthenticated, tournamentsCtrl.create)
router.get('/', userMiddleware.isAuthenticated, paginate(TournamentModel, undefined, 'owner'), tournamentsCtrl.getAll)
router.patch('/:id', userMiddleware.isAuthenticated, tournamentsCtrl.updateOne)
router.get('/:id', userMiddleware.isAuthenticated, tournamentsCtrl.getOne)
router.delete('/:id', userMiddleware.isAuthenticated, tournamentsCtrl.deleteOne)
router.get('/join/:id', userMiddleware.isAuthenticated, tournamentsCtrl.join)
router.get('/leave/:id', userMiddleware.isAuthenticated, tournamentsCtrl.leave)

export default router
