import { Socket } from 'socket.io'
import { ExtendedError } from 'socket.io/dist/namespace'
import jwt from 'jsonwebtoken'
import { validateToken } from '@lib/token-blacklist'
import { UserModel } from '@models/user'

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
      const userData = await UserModel.findOne({ username: user.username })
      if (status === 0 && userData !== null) {
        socket.data.authenticated = true
        socket.data.userID = userData._id
      } else {
        return next(new Error('Invalid token'))
      }
    } catch (err) {
      return next(new Error('Invalid token'))
    }
  } else {
    socket.data.authenticated = false
  }

  return next()
}
