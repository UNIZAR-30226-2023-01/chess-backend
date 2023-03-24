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
          status: setStatus(req, 0, 'Tournament created successfully')
        })
    })
    .catch((err: Error) => {
      if (err.message.includes('duplicate key')) {
        return res
          .status(409)
          .json({ status: setStatus(req, 409, 'Tournament already exists') })
      }
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
      status: setStatus(req, 0, 'OK')
    })
}

export const updateOne = (req: Request, res: Response): void => {
  TournamentModel.findByIdAndUpdate(req.params.id, req.body, { new: true })
    .then((tournament) => {
      res
        .status(200)
        .json({
          data: tournament,
          status: setStatus(req, 0, 'OK')
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
          status: setStatus(req, 0, 'OK')
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
          status: setStatus(req, 0, 'OK')
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
    .json(setStatus(req, 0, 'pong'))
}

export const leave = (req: Request, res: Response): void => {
  res
    .status(200)
    .json(setStatus(req, 0, 'pong'))
}
