import { Request, Response } from 'express'
import { setStatus } from '@lib/status'
import { TournamentModel } from '@models/tournament'

export const create = (req: Request, res: Response): void => {
  TournamentModel.create({ ...req.body })
    .then((user) => {
      res
        .status(201)
        .json({
          data: user.toJSON(),
          status: setStatus(req, 0, 'Successful')
        })
    })
    .catch((_err: Error) => {
      return res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal server error') })
    })
}

export const getAll = (req: Request, res: Response): void => {
  res
    .status(200)
    .json({
      ...res.locals,
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

export const join = (req: Request, res: Response): void => {
  res
    .status(200)
    .json({ status: setStatus(req, 0, 'pong') })
  // // Busca el modelo de torneos con el id especificado.
  // const tournament = await TournamentModel.findById(req.params.id)

  // if (!tournament) {
  //   return res
  //     .status(500)
  //     .json({ status: setStatus(req, 500, `Could not find the tournament with the id ${req.params.id}.`) })
  // }

  // // Verifica si el usuario actual ya está en la lista de participantes.
  // const isAlreadyJoined = tournament.participants.some(p => p.username === currentUser)

  // if (isAlreadyJoined) {
  //   return res
  //     .status(500)
  //     .json({ status: setStatus(req, 500, `The user ${currentUser} has already joined this tournament.`) })
  // }

  // // Agrega al usuario actual a la lista de participantes.
  // tournament.participants.push({ username: currentUser })

  // // Guarda el modelo de torneos actualizado en la base de datos.
  // await tournament.save()

  // return res
  //   .status(201)
  //   .json({ status: setStatus(req, 201, `User ${currentUser} has joined the tournament.`) })
}

export const leave = (req: Request, res: Response): void => {
  res
    .status(200)
    .json({ status: setStatus(req, 0, 'pong') })
  // // Busca el modelo de torneos con el id especificado.
  // const tournament = await TournamentModel.findById(req.params.id)

  // if (!tournament) {
  //   return res
  //     .status(500)
  //     .json({ status: setStatus(req, 500, `Could not find the tournament with the id ${req.params.id}.`) })
  // }

  // // Verifica si el usuario actual ya está en la lista de participantes.
  // const isAlreadyJoined = tournament.participants.some(p => p.username === currentUser)

  // if (!isAlreadyJoined) {
  //   return res
  //     .status(500)
  //     .json({ status: setStatus(req, 500, `The user ${currentUser} does not belong to this tournament.`) })
  // }

  // // Agrega al usuario actual a la lista de participantes.
  // tournament.participants.filter(p => p.username !== currentUser)

  // // Guarda el modelo de torneos actualizado en la base de datos.
  // await tournament.save()

  // return res
  //   .status(201)
  //   .json({ status: setStatus(req, 201, `User ${currentUser} has joined the tournament.`) })
}
