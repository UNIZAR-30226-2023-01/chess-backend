import { setStatus } from '@lib/status'
import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'

export const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  handler: (req, res) => res.status(429).json({ status: setStatus(req, 429, 'Too many requests, please try again later') })
})

export const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: 500,
  onLimitReached: (req, res) => res.status(429).json({ status: setStatus(req, 429, 'Too many requests, please try again later') })
})
