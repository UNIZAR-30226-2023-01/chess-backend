import { Request, Response } from 'express'
import { setStatus } from '@lib/status'
import { GameModel } from '@models/game'
import { parseGame } from '@lib/parsers'
import { TournamentModel } from '@models/tournament'
import { ObjectId } from 'mongodb'
// import sgMail from '@sendgrid/mail'

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

      console.log(game)

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
  TournamentModel.find()
    .then((Tournaments: any) => {
      const now = new Date()
      const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000)
      const matches = Tournaments
        .flatMap((tournament: any) => tournament.matches)
        .filter((match: any) => {
          const matchStart = new Date(match.startTime)
          return matchStart >= now && matchStart <= tenMinutesLater
        })

      return res
        .status(200)
        .json({
          data: matches,
          status: setStatus(req, 200, 'Successful')
        })

      // const msg = {
      //   to: email,
      //   from: 'hi@gracehopper.xyz',
      //   templateId: 'd-47913d1561644ab4aa8e7e3dc053f8a1',
      //   dynamicTemplateData: {
      //     subject: 'Tu rival espera'
      //   }
      // }

      // sgMail.setApiKey(String(process.env.SENDGRID_API_KEY))
      // sgMail.send(msg)
      //   .then(() => {
      //     return res
      //       .status(200)
      //       .json({
      //         data: [],
      //         status: setStatus(req, 0, 'Successful')
      //       })
      //   })
      //   .catch(() => {
      //     return res
      //       .status(500)
      //       .json({
      //         status: setStatus(req, 500, 'Internal Server Error')
      //       })
      //   })
    }).catch(() => {
      res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}
