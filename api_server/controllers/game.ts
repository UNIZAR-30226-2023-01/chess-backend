import { Chess } from 'chess.js'

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

export function createRoom (socket: any, data: any): any {
  const chess = new Chess()
  console.log('create_room', chess)
  console.log('create_room', JSON.stringify(data))
  socket.join(data.roomID)
}

export const joinRoom = (socket: any, io: any, data: any): any => {
  if (io.sockets.adapter.rooms.get(data.roomID) === undefined) return

  console.log('join_room', data.roomID)
  socket.join(data.roomID)
}

export const leaveRoom = (socket: any, data: any): any => {
  console.log('leave_room', data.roomID)
  socket.leave(data.roomID)
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

export const move = (socket: any, data: Message): any => {
  console.log('move', data)

  const { jugador, roomID, move } = data

  if (game.light !== jugador && game.dark !== jugador) socket.emit('error', 'No eres jugador de esta partida')
  if (game.dark === jugador && game.turn === PlayerColor.LIGHT) socket.emit('error', 'No es tu turno')
  if (game.light === jugador && game.turn === PlayerColor.DARK) socket.emit('error', 'No es tu turno')

  const chess = new Chess(game.board)
  try {
    chess.move(move)
  } catch (err: any) {
    socket.emit('error', err?.message)
  }

  let flag: GameFlag | undefined
  if (chess.isCheckmate()) flag = GameFlag.CHECKMATE
  else if (chess.isDraw()) flag = GameFlag.DRAW
  else if (chess.isCheck()) flag = GameFlag.CHECK

  let winner: PlayerColor | undefined
  if (chess.isCheckmate()) winner = game.turn

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
}
