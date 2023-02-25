import { Readable, Writable } from 'node:stream'
import { spawn } from 'node:child_process'
import * as dotenv from 'dotenv'
const lodash = require('lodash')
dotenv.config()

export class StockfishStream {
  private writer: WritableStreamDefaultWriter<any> | null = null
  private reader: ReadableStreamDefaultReader<any> | null = null
  private timeout: number = 0

  async init (skillLevel: number, timeout: number): Promise<void> {
    this.timeout = timeout

    const childProcess = spawn(String(process.env.STOCKFISH_PATH), {
      stdio: ['pipe', 'pipe', 'inherit']
    })
    const stdin = Writable.toWeb(childProcess.stdin)
    this.writer = stdin.getWriter()
    const stdout = Readable.toWeb(childProcess.stdout.setEncoding('utf-8'))
    this.reader = stdout.getReader()

    await this.writer.write(
      'uci\n' + `setoption name Skill Level value ${skillLevel}\n`
    )

    let chunk
    while (!(chunk = await this.reader.read()).done) {
      const words: string[] = lodash.split(chunk.value, / |\n/)
      const index = lodash.indexOf(words, 'uciok')
      if (index !== -1) return
    }

    throw new Error('It is not posible to communicate with stockfish process')
  }

  async bestMove (board: string): Promise<string> {
    if (this.writer === null || this.reader === null) {
      throw new Error('StockfishStream was not initialized')
    }

    const writer = this.writer
    const reader = this.reader

    await writer.write(`position fen ${board}\n` + 'go\n')

    const timeout = setTimeout(function () {
      writer.write('stop\n').catch(() => {})
    }, this.timeout)

    let chunk
    while (!(chunk = await reader.read()).done) {
      const words: string[] = lodash.split(chunk.value, / |\n/)
      const index: number = lodash.indexOf(words, 'bestmove')
      if (index !== -1) {
        clearTimeout(timeout)
        return words[index + 1]
      }
    }
    // error
    return 'error'
  }

  async close (): Promise<void> {
    if (this.writer === null) return
    try {
      await this.writer.write('quit\n')
    } finally {
      await this.writer.close()
    }
  }
}
