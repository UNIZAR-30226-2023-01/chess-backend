import * as chai from 'chai'
import chaiHttp from 'chai-http'
import { io } from 'socket.io-client'
import '@app'

chai.use(chaiHttp)

const socket = io('http://localhost:4001', {
  transports: ['websocket'],
  autoConnect: false
})

describe('Sockets', () => {
  it('conexión', done => {
    socket.connect()

    socket.on('connect', () => {
      socket.disconnect()
      done()
    })
  })
})
