/* eslint-disable @typescript-eslint/restrict-template-expressions */
import App from './app'
import http from 'http'
import { Server } from 'socket.io'

const server = http.createServer(App)

const io = new Server(server, {
  cors: {
    origin: '*'
  }
})

io.on('connection', (socket: any) => {
  console.log(`User Connected: ${socket.id}`)

  socket.on('join_room', (data: any) => {
    socket.join(data)
  })

  socket.on('send_message', (data: any) => {
    socket.to(data.room).emit('receive_message', data)
  })
})

export default server
