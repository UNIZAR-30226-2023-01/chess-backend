import App from '@app'
import http from 'http'
import { Server, Socket } from 'socket.io'
import * as game from '@controllers/game/game'
import * as spectator from '@controllers/game/spectator'
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
  socket.on('join_room', spectator.joinRoom.bind(null, socket, io))
  socket.on('leave_room', spectator.leaveRoom.bind(null, socket, io))

  socket.on('find_room', game.findRoom.bind(null, socket, io))
  socket.on('move', game.move.bind(null, socket, io))
  socket.on('surrender', game.surrender.bind(null, socket, io))
  socket.on('vote_draw', game.voteDraw.bind(null, socket, io))
}

io.on('connection', onConnection)

export default server
