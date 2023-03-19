import { Request, Response } from 'express'
import { setStatus } from '@lib/status'

export const getAll = (req: Request, res: Response): void => {
  res
    .status(200)
    .json(setStatus(req, 0, 'pong'))
}

export const getOne = (req: Request, res: Response): void => {
  res
    .status(200)
    .json(setStatus(req, 0, 'pong'))
}
