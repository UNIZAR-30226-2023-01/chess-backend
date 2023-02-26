/* eslint-disable @typescript-eslint/restrict-template-expressions */
import App from './app'
import http from 'http'
import { Server } from 'socket.io'
import * as gameCtrl from './api_server/controllers/game'

const server = http.createServer(App)

const io = new Server(server, {
  cors: {
    origin: '*'
  },
  connectionStateRecovery: {
    // the backup duration of the sessions and the packets
    maxDisconnectionDuration: 2 * 60 * 1000,
    // whether to skip middlewares upon successful recovery
    skipMiddlewares: true
  }
})

const onConnection = (socket: any): any => {
  socket.on('create_room', gameCtrl.createRoom)
  socket.on('join_room', gameCtrl.joinRoom)
  socket.on('leave_room', gameCtrl.leaveRoom)
  socket.on('move', gameCtrl.move)
}

io.on('connection', onConnection)

export default server
