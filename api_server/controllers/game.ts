import { Chess } from 'chess.ts'
import { Server, Socket } from 'socket.io'

enum PlayerColor {
  LIGHT = 'LIGHT',
  DARK = 'DARK'
}

interface GameRoom {
  roomID: string
  light: string
  dark: string
  turn: PlayerColor
  moves: string[]
  board: string // fen notation
}
const startBoard = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

const game: GameRoom = {
  roomID: 'pistacho',
  light: 'Hector',
  dark: 'Fernando',
  turn: PlayerColor.LIGHT,
  moves: [],
  board: startBoard
}

interface Message {
  jugador: string // socket.jugador (temporal para testing)
  roomID: string
  move: string
}

enum GameFlag {
  DRAW = 'DRAW',
  CHECKMATE = 'CHECKMATE',
  CHECK = 'CHECK'
}

interface ReturnMessage {
  board: string
  turn: PlayerColor
  flag: undefined | GameFlag
  winner: undefined | PlayerColor
}

export const createRoom = async (socket: Socket, data: Message): Promise<void> => {
  const chess = new Chess()
  console.log('create_room', chess)
  console.log('create_room', JSON.stringify(data))
  await socket.join(data.roomID)
}

export const joinRoom = async (socket: Socket, io: Server, data: Message): Promise<void> => {
  console.log(io.sockets.adapter.rooms)
  if (io.sockets.adapter.rooms.get(data.roomID) === undefined) return

  console.log('join_room', data.roomID)
  await socket.join(data.roomID)
}

export const leaveRoom = async (socket: Socket, data: Message): Promise<void> => {
  console.log('leave_room', data.roomID)
  await socket.leave(data.roomID)
}

export const move = (socket: Socket, data: Message): void => {
  console.log('move', data)

  const { jugador, roomID, move } = data

  if (game.light !== jugador && game.dark !== jugador) {
    socket.emit('error', 'No eres jugador de esta partida')
    return
  }
  if ((game.dark === jugador && game.turn === PlayerColor.LIGHT) ||
      (game.light === jugador && game.turn === PlayerColor.DARK)) {
    socket.emit('error', 'No es tu turno')
    return
  }

  const chess = new Chess(game.board)
  const moveRes = chess.move(move, { sloppy: true })
  if (moveRes === null) {
    socket.emit('error', 'Movimiento ilegal')
    return
  }

  let flag: GameFlag | undefined
  if (chess.inCheckmate()) flag = GameFlag.CHECKMATE
  else if (chess.inDraw()) flag = GameFlag.DRAW
  else if (chess.inCheck()) flag = GameFlag.CHECK

  let winner: PlayerColor | undefined
  if (chess.inCheckmate()) winner = game.turn

  game.board = chess.fen()
  game.turn = game.turn === PlayerColor.DARK ? PlayerColor.LIGHT : PlayerColor.DARK
  game.moves.push(move)

  const returnMessage: ReturnMessage = {
    board: game.board,
    turn: game.turn,
    flag,
    winner
  }

  socket.to(roomID).emit('move', returnMessage)
  console.log('room', socket.rooms.has(roomID))
  console.log('rooms', socket.rooms)
}
