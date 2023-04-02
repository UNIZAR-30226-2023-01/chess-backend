import { Request, Response } from 'express'
import { setStatus } from '@lib/status'
import { TournamentModel } from '@models/tournament'
import jwt from 'jsonwebtoken'
import { parseTournament } from '@lib/parsers'
const { generateMatches } = require('lib/tournament')

export const create = (req: Request, res: Response): void => {
  const token = req.cookies['api-auth']
  const { id: owner } = JSON.parse(JSON.stringify(jwt.verify(token, String(process.env.JWT_SECRET))))

  const today = new Date() // Obtener la fecha de hoy
  today.setHours(0, 0, 0, 0) // Establecer la hora a las 00:00:00 para comparar solo la fecha

  // Realizar la consulta a la base de datos
  TournamentModel.find({ owner, createdAt: { $gte: today } })
    .then(async (tournaments) => {
      if (tournaments.length > 0) {
        return res
          .status(409)
          .json({ status: setStatus(req, 409, 'You have reached the limit of tournaments per day') })
      }

      const { startTime, rounds } = req.body
      return await TournamentModel.create({
        owner,
        startTime,
        rounds,
        participants: [],
        matches: generateMatches(rounds)
      })
        .then((tournament) => {
          return res
            .status(201)
            .json({
              data: parseTournament(tournament),
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

export const getAll = (req: Request, res: Response): void => {
  const { meta, data } = res.locals
  res
    .status(200)
    .json({
      meta,
      data,
      status: setStatus(req, 0, 'Successful')
    })
}

export const updateOne = (req: Request, res: Response): void => {
  TournamentModel.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .then((tournament) => {
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
  TournamentModel.findById(req.params.id)
    .then((tournament) => {
      if (!tournament) {
        return res
          .status(404)
          .json(setStatus(req, 404, 'Not Found'))
      }

      return res
        .status(200)
        .json({
          data: tournament,
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
  TournamentModel.findByIdAndDelete(req.params.id, req.body)
    .then(_ => {
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

  // Busca el modelo de torneos con el id especificado.
  const tournament = await TournamentModel.findById(req.params.id)

  if (!tournament) {
    res
      .status(404)
      .json({ status: setStatus(req, 404, `Could not find the tournament with the id ${req.params.id}.`) })
    return
  }

  // Verifica si el usuario actual ya está en la lista de participantes.
  const isAlreadyJoined = tournament.participants.some(p => p.toString() === id)

  if (isAlreadyJoined) {
    res
      .status(409)
      .json({ status: setStatus(req, 409, `The user ${String(id)} has already joined this tournament.`) })
    return
  }

  // Agrega al usuario actual a la lista de participantes.
  tournament.participants.push(id)

  // Guarda el modelo de torneos actualizado en la base de datos.
  await tournament.save()

  res
    .status(201)
    .json({ status: setStatus(req, 201, `User ${String(id)} has joined the tournament.`) })
}

export const leave = async (req: Request, res: Response): Promise<void> => {
  const token = req.cookies['api-auth']
  const { id } = JSON.parse(JSON.stringify(jwt.verify(token, String(process.env.JWT_SECRET))))

  // Busca el modelo de torneos con el id especificado.
  const tournament = await TournamentModel.findById(req.params.id)

  if (!tournament) {
    res
      .status(404)
      .json({ status: setStatus(req, 404, `Could not find the tournament with the id ${req.params.id}.`) })
    return
  }

  // Verifica si el usuario actual ya está en la lista de participantes.
  const isAlreadyJoined = tournament.participants.some(p => p.toString() === id)

  if (!isAlreadyJoined) {
    res
      .status(409)
      .json({ status: setStatus(req, 409, `The user ${String(id)} does not belong to this tournament.`) })
    return
  }

  // Agrega al usuario actual a la lista de participantes.
  tournament.participants.filter(p => p.toString() !== id) // bug

  // Guarda el modelo de torneos actualizado en la base de datos.
  await tournament.save()

  res
    .status(200)
    .json({ status: setStatus(req, 200, `User ${String(id)} has left the tournament.`) })
}
