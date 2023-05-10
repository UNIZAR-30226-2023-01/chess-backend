import * as chai from 'chai'
import chaiHttp from 'chai-http'
import { io } from 'socket.io-client'
import { SocketError } from '@lib/socket-error'
import { EndState, GameType, PlayerColor } from '@lib/types/game'
import '@app'
import { alternativeColor } from '@lib/game'

chai.use(chaiHttp)

describe('Non-authenticated AI player', () => {
  it('create game, expect move and surrender', function (done) {
    const socket = io('http://localhost:4001', {
      transports: ['websocket'],
      autoConnect: false
    })

    const options = {
      gameType: GameType.AI,
      time: 300,
      increment: 5,
      hostColor: PlayerColor.DARK,
      difficulty: 3
    }

    socket.on('connect', () => {
      socket.emit('find_room', options)
    })

    socket.on('room', (res: any) => {
      chai.expect(res.turn).to.be.equal('LIGHT')
      chai.expect(res.color).to.be.equal(options.hostColor)
      chai.expect(res.initialTimer).to.be.equal(options.time)
      chai.expect(res.timerIncrement).to.be.equal(options.increment)
      chai.expect(res.difficulty).to.be.equal(options.difficulty)
      chai.expect(res.gameType).to.be.equal(options.gameType)
    })

    socket.on('moved', (res: any) => {
      chai.expect(res).to.have.property('move')
      chai.expect(res).to.have.property('turn')
      chai.expect(res).to.have.property('timerDark')
      chai.expect(res).to.have.property('timerLight')
      socket.emit('surrender')
    })

    socket.on('game_over', (res: any) => {
      chai.expect(res.winner).to.be.equal(alternativeColor(options.hostColor))
      chai.expect(res.endState).to.be.equal(EndState.SURRENDER)
      socket.disconnect()
      done() // Success
    })

    socket.on('error', (res: SocketError) => {
      throw new Error('Received error event from server: \n\t' + res.message)
    })

    socket.connect()
  })

  it('check errors', function (done) {
    const socket = io('http://localhost:4001', {
      transports: ['websocket'],
      autoConnect: false
    })

    const options = {
      gameType: GameType.AI,
      time: 300,
      increment: 5,
      hostColor: PlayerColor.LIGHT,
      difficulty: 3
    }

    // const moves = [
    //   'd2d4', 'g8f6', 'c1g5', 'd7d5', 'b1c3', 'b8d7', 'e2e3', 'e7e6', 'f1d3',
    //   'c7c5', 'd4c5', 'd7c5', 'g1f3', 'g1f3', 'f8e7', 'e1g1', 'e8g8', 'h2h3',
    //   'b7b6', 'f3e5', 'c8b7', 'g5f6', 'e7f6', 'd1h5', 'g7g6', 'e5g6', 'f7g6',
    //   'd3g6', 'h7g6', 'h5g6', 'f6g7', 'h3h4', 'd8h4', 'g2g3', 'h4h8', 'e3e4',
    //   'f8f6', 'g6g5', 'f6h6', 'g5h4', 'h6h4', 'g3h4', 'h8h4', 'e4d5', 'h4g5',
    //   'g1h1', 'g8f7', 'f1g1', 'a8h8'
    // ]

    let numErrors = 0

    socket.on('connect', () => {
      socket.emit('find_room', options)
    })

    socket.on('room', (res: any) => {
      chai.expect(res.turn).to.be.equal('LIGHT')
      chai.expect(res.color).to.be.equal(options.hostColor)
      chai.expect(res.initialTimer).to.be.equal(options.time)
      chai.expect(res.timerIncrement).to.be.equal(options.increment)
      chai.expect(res.difficulty).to.be.equal(options.difficulty)
      chai.expect(res.gameType).to.be.equal(options.gameType)

      socket.emit('vote_draw') // Not supported action
      socket.emit('vote_save') // Not authenticated
      socket.emit('find_room', options) // Already playing
      socket.emit('move', { move: 'e7e6' }) // Illegal move
      socket.emit('move', { move: 'a2a4' })
      socket.emit('move', { move: 'b2b4' }) // Not your turn
    })

    socket.on('moved', (res: any) => {
      if (res.turn === options.hostColor) socket.emit('surrender')
    })

    socket.on('game_over', (res: any) => {
      chai.expect(res.winner).to.be.equal(alternativeColor(options.hostColor))
      chai.expect(res.endState).to.be.equal(EndState.SURRENDER)
      setTimeout(() => {
        socket.disconnect()
        chai.expect(numErrors).to.be.equal(5)
        done()
      }, 100)
    })

    socket.on('error', () => { numErrors++ })

    socket.connect()
  })
})
