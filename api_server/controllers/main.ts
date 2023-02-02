import { Request, Response } from 'express'
import { setStatus } from '../../lib/status'

export const pong = (req: Request, res: Response): void => {
  res
    .status(200)
    .json(setStatus(req, 0, 'pong'))
}

export const protectedPong = (req: Request, res: Response): void => {
  res
    .status(200)
    .json(setStatus(req, 0, 'pong (protected)'))
}
