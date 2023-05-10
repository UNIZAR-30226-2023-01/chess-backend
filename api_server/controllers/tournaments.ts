import { Request, Response } from 'express'
import { setStatus } from '@lib/status'
import { TournamentModel } from '@models/tournament'
import jwt from 'jsonwebtoken'
import { parseTournament } from '@lib/parsers'
import { Types } from 'mongoose'
import { generateMatches } from '@lib/tournament'

export const create = (req: Request, res: Response): void => {
  const token = req.cookies['api-auth']
  const { id: owner } = JSON.parse(JSON.stringify(jwt.verify(token, String(process.env.JWT_SECRET))))

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  TournamentModel.find({ owner, createdAt: { $gte: today } })
    .then(async (tournaments) => {
      if (tournaments.length > 0) {
        return res
          .status(409)
          .json({ status: setStatus(req, 409, 'Conflict') })
      }

      const { startTime, rounds } = req.body
      return await TournamentModel.create({
        owner,
        startTime,
        rounds,
        participants: [],
        matches: generateMatches(rounds, new Date(startTime))
      })
        .then(async (tournament) => {
          return res
            .status(201)
            .json({
              data: await parseTournament(tournament),
              status: setStatus(req, 0, 'Successful')
            })
        })
        .catch(() => {
          return res
            .status(500)
            .json({ status: setStatus(req, 500, 'Internal server error') })
        })
    })
    .catch(() => {
      return res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal server error') })
    })
}

export const getAll = async (req: Request, res: Response): Promise<void> => {
  const { meta, data } = res.locals
  res
    .status(200)
    .json({
      meta,
      data: await Promise.all(data.map(parseTournament)),
      status: setStatus(req, 0, 'Successful')
    })
}

export const updateOne = (req: Request, res: Response): void => {
  TournamentModel.findOneAndUpdate({
    _id: new Types.ObjectId(req.params.id),
    hasStarted: false
  }, req.body, { new: true })
    .then(tournament => {
      res
        .status(200)
        .json({
          data: tournament,
          status: setStatus(req, 0, 'Successful')
        })
    })
    .catch(_err => {
      res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}

export const getOne = (req: Request, res: Response): void => {
  TournamentModel.findById(req.params.id).populate({
    path: 'matches',
    populate: {
      path: 'participants'
    }
  })
    .then(async (tournament) => {
      if (!tournament) {
        return res
          .status(404)
          .json(setStatus(req, 404, 'Not Found'))
      }

      return res
        .status(200)
        .json({
          data: await parseTournament(tournament),
          status: setStatus(req, 0, 'Successful')
        })
    })
    .catch(_err => {
      return res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}

export const deleteOne = (req: Request, res: Response): void => {
  TournamentModel.findOneAndDelete({
    _id: new Types.ObjectId(req.params.id),
    hasStarted: false // Delete only if hasn't started
  }, req.body)
    .then(tournament => {
      if (!tournament) {
        res
          .status(404)
          .json(setStatus(req, 404, 'Not Found'))
        return
      }

      res
        .status(200)
        .json({
          status: setStatus(req, 0, 'Successful')
        })
    })
    .catch(_err => {
      res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}

export const join = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies['api-auth']
  const { id } = JSON.parse(JSON.stringify(jwt.verify(token, String(process.env.JWT_SECRET))))

  const tournament = await TournamentModel.findById(req.params.id).populate('matches')

  if (!tournament) {
    res
      .status(404)
      .json({ status: setStatus(req, 404, 'Not Found') })
    return
  }

  // Verifica si el usuario actual ya está en la lista de participantes.
  const isAlreadyJoined = tournament.participants.some(p => p.toString() === id)

  if (isAlreadyJoined) {
    res
      .status(409)
      .json({ status: setStatus(req, 409, 'Conflict') })
    return
  }

  const matches: any = tournament.matches.filter((m: any) => {
    const firstRound = Number(m.tournamentRoundText.split(' ')[1]) === tournament.rounds
    const notFull = m.participants.length < 2
    return firstRound && notFull
  })

  // No place for the user to join
  if (!matches[0]) {
    res
      .status(409)
      .json({ status: setStatus(req, 409, 'Conflict') })
    return
  }

  tournament.participants.push(id)
  matches[0].participants.push(id)

  // Only replace if hasn't started yet
  await TournamentModel.findOneAndUpdate({
    _id: tournament._id,
    hasStarted: false
  }, { $set: tournament })

  res
    .status(200)
    .json({ status: setStatus(req, 200, 'Successful') })
}

export const leave = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies['api-auth']
  const { id } = JSON.parse(JSON.stringify(jwt.verify(token, String(process.env.JWT_SECRET))))

  TournamentModel.updateOne({
    _id: new Types.ObjectId(req.params.id),
    hasStarted: false
  }, {
    $pull: {
      participants: id,
      'matches.$[].participants': id
    }
  }, { new: true })
    .then(() => {
      res
        .status(200)
        .json({ status: setStatus(req, 0, 'Successful') })
    })
    .catch(() => {
      res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    })
}
