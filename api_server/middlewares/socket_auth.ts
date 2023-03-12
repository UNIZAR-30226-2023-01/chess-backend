import { Socket } from 'socket.io'
import { ExtendedError } from 'socket.io/dist/namespace'
import jwt from 'jsonwebtoken'
import { guestUser } from '../models/user'

export const socketAuth = (
  socket: Socket,
  next: (err?: ExtendedError | undefined) => void
): void => {
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET variable not defined in .env')
  }
  if (socket.handshake.headers?.token) {
    jwt.verify(String(socket.handshake.headers.token), process.env.JWT_SECRET,
      (err, user: any) => {
        if (err) {
          socket.data.authenticated = false
          socket.data.user = guestUser
          return next()
        }
        socket.data.authenticated = true
        socket.data.user = user.username
      })
  } else {
    socket.data.authenticated = false
    socket.data.user = guestUser
    return next()
  }
  console.log('user connected using socket: ', socket.data.user)
  return next()
}
