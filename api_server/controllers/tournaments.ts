import { Request, Response } from 'express'
import { setStatus } from '@lib/status'

export const create = (req: Request, res: Response): void => {
  res
    .status(200)
    .json(setStatus(req, 0, 'pong'))
}

export const getAll = (req: Request, res: Response): void => {
  res
    .status(200)
    .json(setStatus(req, 0, 'pong'))
}

export const updateOne = (req: Request, res: Response): void => {
  res
    .status(200)
    .json(setStatus(req, 0, 'pong'))
}

export const getOne = (req: Request, res: Response): void => {
  res
    .status(200)
    .json(setStatus(req, 0, 'pong'))
}

export const deleteOne = (req: Request, res: Response): void => {
  res
    .status(200)
    .json(setStatus(req, 0, 'pong'))
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
