import { StockfishStream, bestMove } from '@lib/stockfish'
import { Chess } from 'chess.ts'

const tablero1: string = '8/8/8/4p1K1/2k1P3/8/8/8 b - - 0 1'
const tablero2: string =
  'r1bqkbnr/pp1pppp1/2n5/2p4p/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 0 1'

async function ejemplo (): Promise<void> {
  const sf = new StockfishStream()
  await sf.init(20, 1000)
  try {
    let mov = await sf.bestMove(tablero1)
    console.log(mov)
    mov = await sf.bestMove(tablero2)
    console.log(mov)
  } catch (error) {
    console.log(error)
  } finally {
    await sf.close()
  }
}

async function ejemplo2 (): Promise<void> {
  let move = await bestMove(tablero1, 20, 3000)
  if (move) console.log(move)
  move = await bestMove(tablero2, 20, 3000)
  if (move) console.log(move)
  const chess = new Chess()
  const moves = [
    'd2d4',
    'g8f6',
    'c1g5',
    'd7d5',
    'b1c3',
    'b8d7',
    'e2e3',
    'e7e6',
    'f1d3',
    'c7c5',
    'd4c5',
    'd7c5',
    'g1f3',
    'g1f3',
    'f8e7',
    'e1g1',
    'e8g8',
    'h2h3',
    'b7b6',
    'f3e5',
    'c8b7',
    'g5f6',
    'e7f6',
    'd1h5',
    'g7g6',
    'e5g6',
    'f7g6',
    'd3g6',
    'h7g6',
    'h5g6',
    'f6g7',
    'h3h4',
    'd8h4',
    'g2g3',
    'h4h8',
    'e3e4',
    'f8f6',
    'g6g5',
    'f6h6',
    'g5h4',
    'h6h4',
    'g3h4',
    'h8h4',
    'e4d5',
    'h4g5',
    'g1h1',
    'g8f7'
    // 'f1g1',
    // 'a8h8'
  ]
  for (move of moves) {
    chess.move(move, { sloppy: true })
  }
  console.log(chess.fen())
}

ejemplo().catch(() => {})
ejemplo2().catch(() => {})
