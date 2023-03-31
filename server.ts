import App from '@app'
import http from 'http'
import { Server, Socket } from 'socket.io'
import * as gameCtl from '@controllers/game/game'
import * as spectatorCtl from '@controllers/game/spectator'
import * as disconnectionCtl from '@controllers/game/disconnection'
import { socketAuth } from '@middlewares/socket_auth'

const server = http.createServer(App)

const io = new Server(server, {
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
  socket.on('join_room', spectatorCtl.joinRoom.bind(null, socket, io))
  socket.on('leave_room', spectatorCtl.leaveRoom.bind(null, socket))

  socket.on('find_room', gameCtl.findRoom.bind(null, socket, io))
  socket.on('move', gameCtl.move.bind(null, socket, io))
  socket.on('surrender', gameCtl.surrender.bind(null, socket, io))
  socket.on('vote_draw', gameCtl.voteDraw.bind(null, socket, io))

  socket.on('disconnect', disconnectionCtl.disconnect.bind(null, socket, io))
  socket.on('heartbeat', () => {})
  socket.onAny(disconnectionCtl.heartbeat.bind(null, socket, io))
  disconnectionCtl.heartbeat.bind(null, socket, io)()
}

io.on('connection', onConnection)

export default server
