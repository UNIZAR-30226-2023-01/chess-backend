import { Request, Response } from 'express'
import { setStatus } from '@lib/status'
import { GameModel } from '@models/game'
import { parseGame } from '@lib/parsers'
import { ObjectId } from 'mongodb'

export const getAll = (req: Request, res: Response): void => {
  const { meta, data } = res.locals

  res
    .status(200)
    .json({
      meta,
      data: data.map(parseGame),
      status: setStatus(req, 0, 'Successful')
    })
}

export const getOne = (req: Request, res: Response): void => {
  const { id } = req.params
  const filter = ObjectId.isValid(id) ? { _id: new ObjectId(id) } : { roomID: id }
  GameModel.findOne(filter)
    .then((game) => {
      if (!game) {
        return res
          .status(404)
          .json({ status: setStatus(req, 404, 'Not Found') })
      }

      return res
        .status(200)
        .json({
          data: parseGame(game),
          status: setStatus(req, 0, 'Successful')
        })
    })
    .catch(_err => {
      return res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}
