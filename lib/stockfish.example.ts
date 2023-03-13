import { StockfishStream } from './stockfish'

const tablero1: string = '8/8/8/4p1K1/2k1P3/8/8/8 b - - 0 1'
const tablero2: string =
  'r1bqkbnr/pp1pppp1/2n5/2p4p/2B1P3/8/PPPP1PPP/RNBQK1NR b KQkq - 0 1'

async function ejemplo (): Promise<void> {
  const sf = new StockfishStream()
  await sf.init(1, 1000)
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

ejemplo().catch(() => {})
