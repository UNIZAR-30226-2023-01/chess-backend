import { Socket } from 'socket.io'
import { ExtendedError } from 'socket.io/dist/namespace'
import jwt from 'jsonwebtoken'
import { guestUser } from '@models/user'
import { validateToken } from '@lib/token_blacklist'

export const socketAuth = async (
  socket: Socket,
  next: (err?: ExtendedError | undefined) => void
): Promise<void> => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET variable not defined in .env')
  }
  if (socket.handshake.headers?.token) {
    const token = String(socket.handshake.headers.token)
    try {
      const user: any = jwt.verify(token, process.env.JWT_SECRET)
      const status = await validateToken(user.username, token)
      if (status === 0) {
        socket.data.authenticated = true
        socket.data.username = user.username
      } else {
        return next(new Error('Invalid token'))
      }
    } catch (err) {
      return next(new Error('Invalid token'))
    }
  } else {
    socket.data.authenticated = false
    socket.data.username = guestUser
  }
  console.log('user connected using socket: ', socket.data.username)
  return next()
}
