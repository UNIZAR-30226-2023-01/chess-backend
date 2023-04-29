import { Request, Response } from 'express'
import { setStatus } from '@lib/status'
import { GameModel } from '@models/game'
import { parseGame } from '@lib/parsers'
import { TournamentModel } from '@models/tournament'

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
  GameModel.findById(id).populate(['lightId', 'darkId'])
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

export const notify = (req: Request, res: Response): void => {
  const ahora = new Date()
  const dentroDe10Minutos = new Date(ahora.getTime() + 10 * 60000)

  TournamentModel.aggregate([{
    $lookup: {
      from: 'Tournament',
      localField: 'matches',
      foreignField: '_id',
      as: 'tournament'
    }
  }, {
    $match: {
      'tournament.matches.startTime': {
        $gte: ahora,
        $lt: dentroDe10Minutos
      }
    }
  }, {
    $unwind: '$tournament.matches'
  }, {
    $match: {
      'tournament.matches.startTime': {
        $gte: ahora,
        $lt: dentroDe10Minutos
      }
    }
  }, {
    $lookup: {
      from: 'User',
      localField: 'tournament.matches.participants.email',
      foreignField: '_id',
      as: 'user'
    }
  }, {
    $project: {
      'tournament.matches.startTime': 1,
      'user.email': 1
    }
  }])
    .then(resultados => {
      if (!resultados || resultados.length === 0) {
        return res
          .status(204)
          .json({ status: setStatus(req, 204, 'No Content') })
      }

      return res
        .status(200)
        .json({
          data: resultados,
          status: setStatus(req, 200, 'Succesfull')
        })
    }).catch(() => {
      return res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}
