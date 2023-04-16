import App from '@app'
import http from 'http'
import { Server, Socket } from 'socket.io'
import * as gameCtl from '@controllers/game/game'
import * as spectatorCtl from '@controllers/game/spectator'
import { socketAuth } from '@middlewares/socket_auth'

export const server = http.createServer(App)

export const io = new Server(server, {
  cors: {
    origin: '*'
  },
  connectionStateRecovery: {
    // the backup duration of the sessions and the packets
    maxDisconnectionDuration: 2 * 60 * 1000,
    // whether to skip middlewares upon successful recovery
    skipMiddlewares: false
  }
})

io.use(socketAuth)

function onConnection (socket: Socket): void {
  socket.on('join_room', spectatorCtl.joinRoom.bind(null, socket))
  socket.on('leave_room', spectatorCtl.leaveRoom.bind(null, socket))

  socket.on('find_room', gameCtl.findRoom.bind(null, socket))
  socket.on('move', gameCtl.move.bind(null, socket))
  socket.on('surrender', gameCtl.surrender.bind(null, socket))
  socket.on('vote_draw', gameCtl.voteDraw.bind(null, socket))
  socket.on('vote_save', gameCtl.voteSave.bind(null, socket))
  socket.on('resume', gameCtl.resumeGame.bind(null, socket))
}

io.on('connection', onConnection)
