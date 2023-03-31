import { setStatus } from '@lib/status'
import rateLimit from 'express-rate-limit'
import slowDown from 'express-slow-down'

// 500 requests per minute = 500 / 60 = 8.33 requests per second
export const Limiter = rateLimit({
  max: 500,
  statusCode: 429,
  handler: (req, res) => res.status(429).json({ status: setStatus(req, 429, 'Too Many Request, try again later.') })
})

// time = (number of requests - delayAfter) * delayMs = (500 - 50) * 500 = 450 * 500 = 225000ms = 3.75 minutes << 5 minutes
// time(max = 15000) = 4225000ms = 70.42 minutes
export const SpeedLimiter = slowDown({
  delayAfter: 50,
  delayMs: 500,
  maxDelayMs: 5 * 60 * 1000,
  onLimitReached: (req, res) => res.status(429).json({ status: setStatus(req, 429, 'Too Many Request, try again later.') })
})
