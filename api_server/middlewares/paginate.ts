/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { Request, Response, NextFunction } from 'express'
import { MongooseQueryParser } from 'mongoose-query-parser'
import { setStatus } from '@lib/status'

export const paginate = (model: any) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const parser = new MongooseQueryParser({
        skipKey: 'page'
      })
      const resultado = parser.parse(req.query)

      const page = resultado.skip ?? 1
      const limit = resultado.limit ?? 30
      const startIndex = (page - 1) * limit

      const basePath = `${req.protocol}://${req.get('host') ?? req.hostname}${req.baseUrl}`
      const currentPage = new URL(basePath)
      const nextPage = new URL(basePath)
      const previousPage = new URL(basePath)

      const numDocs = await model.countDocuments().exec()
      const data = await model
        .find(resultado.filter)
        .limit(limit).skip(startIndex)
        .sort(resultado.sort)
        .exec()

      currentPage.searchParams.set('page', String(page))
      previousPage.searchParams.set('page', String(page - 1))
      nextPage.searchParams.set('page', String(page + 1))

      previousPage.searchParams.set('limit', String(limit))
      currentPage.searchParams.set('limit', String(limit))
      nextPage.searchParams.set('limit', String(limit))

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
      res
        .status(500)
        .json({ status: setStatus(req, 500, 'Internal Server Error') })
    }
  }
}
