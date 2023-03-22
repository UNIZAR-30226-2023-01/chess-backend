import express from 'express'
import * as tournamentsCtrl from '@controllers/tournaments'
import * as userMiddleware from '@middlewares/user'
// import { paginate } from '@middlewares/paginate'
// import TournamentModel from '@models/tournaments'

const router = express.Router()

router.post('/', userMiddleware.isAuthenticated, tournamentsCtrl.create)
// router.get('/', userMiddleware.isAuthenticated, paginate(TournamentModel), tournamentsCtrl.getAll)
router.patch('/:id', userMiddleware.isAuthenticated, tournamentsCtrl.updateOne)
router.get('/:id', userMiddleware.isAuthenticated, tournamentsCtrl.getOne)
router.delete('/:id', userMiddleware.isAuthenticated, tournamentsCtrl.deleteOne)
router.get('/join/:id', userMiddleware.isAuthenticated, tournamentsCtrl.join)
router.get('/leave/:id', userMiddleware.isAuthenticated, tournamentsCtrl.leave)

export default router
