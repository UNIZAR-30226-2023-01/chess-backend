/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Request, Response, NextFunction } from 'express'

export const paginate = (model: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 30
    const startIndex = (page - 1) * limit

    const basePath = `${req.protocol}://${req.get('host') ?? req.hostname}${req.baseUrl}`
    const currentPage = new URL(basePath)
    const nextPage = new URL(basePath)
    const previousPage = new URL(basePath)

    const numDocs = await model.countDocuments().exec()
    const data = await model.find().limit(limit).skip(startIndex).exec()

    currentPage.searchParams.set('page', String(page))
    previousPage.searchParams.set('page', String(page - 1))
    nextPage.searchParams.set('page', String(page + 1))

    previousPage.searchParams.set('limit', String(limit))
    currentPage.searchParams.set('limit', String(limit))
    nextPage.searchParams.set('limit', String(limit))

    try {
      res.locals = {
        meta: {
          currentPage: currentPage.toString(),
          previousPage: startIndex > 0 ? previousPage.toString() : null,
          nextPage: page * limit < numDocs ? nextPage.toString() : null,
          perPage: limit,
          pages: Math.ceil(numDocs / limit),
          count: data.length
        },
        data
      }
      next()
    } catch (e: any) {
      res.status(500).json({ message: e.message })
    }
  }
}
