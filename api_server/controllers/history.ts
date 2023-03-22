import { Request, Response } from 'express'
import { setStatus } from '@lib/status'
import { GameModel } from '@models/game'

export const getAll = (req: Request, res: Response): void => {
  res
    .status(200)
    .json({
      ...res.locals,
      status: setStatus(req, 0, 'OK')
    })
}

export const getOne = (req: Request, res: Response): void => {
  const { id } = req.params
  GameModel.findById(id)
    .then((game) => {
      if (!game) {
        return res
          .status(404)
          .json(setStatus(req, 404, 'Not Found'))
      }

      return res
        .status(200)
        .json({
          data: game,
          status: setStatus(req, 0, 'OK')
        })
    })
    .catch(_err => {
      return res
        .status(500)
        .json(setStatus(req, 500, 'Internal Server Error'))
    })
}
