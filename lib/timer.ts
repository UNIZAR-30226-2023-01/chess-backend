import { PlayerColor } from '@models/game'

export class ChessTimer {
  private lastTimestamp: number
  private timeDark: number
  private timeLight: number
  private turn: PlayerColor = PlayerColor.LIGHT

  private readonly increment: number
  private readonly timeoutAction: (winner: PlayerColor) => void

  private timeout: NodeJS.Timeout

  constructor (
    time: number,
    increment: number,
    timeoutAction: (winner: PlayerColor) => void
  ) {
    const timestamp = Date.now()
    this.lastTimestamp = timestamp
    this.timeDark = time
    this.timeLight = time
    this.increment = increment
    this.timeoutAction = timeoutAction
    this.timeout = setTimeout(this.timeoutAction, this.timeLight, PlayerColor.DARK)
  }

  switchCountDown (): void {
    clearTimeout(this.timeout)
    const timestamp = Date.now()
    const elapsedTime = timestamp - this.lastTimestamp
    this.lastTimestamp = timestamp
    if (this.turn === PlayerColor.LIGHT) {
      this.turn = PlayerColor.DARK
      this.timeLight = this.timeLight - elapsedTime + this.increment
      this.timeout = setTimeout(this.timeoutAction, this.timeDark, PlayerColor.LIGHT)
    } else {
      this.turn = PlayerColor.LIGHT
      this.timeDark = this.timeDark - elapsedTime + this.increment
      this.timeout = setTimeout(this.timeoutAction, this.timeLight, PlayerColor.DARK)
    }
  }

  stop (): void {
    clearTimeout(this.timeout)
  }

  getTimeDark (): number {
    if (this.turn === PlayerColor.DARK) {
      const timestamp = Date.now()
      const elapsedTime = timestamp - this.lastTimestamp
      return this.timeDark - elapsedTime
    } else {
      return this.timeDark
    }
  }

  getTimeLight (): number {
    if (this.turn === PlayerColor.LIGHT) {
      const timestamp = Date.now()
      const elapsedTime = timestamp - this.lastTimestamp
      return this.timeLight - elapsedTime
    } else {
      return this.timeLight
    }
  }
}

/**
 * Collection of all the active chess timers.
 * The keys should be the roomID of each game.
 */
export const chessTimers: Map<string, ChessTimer> = new Map<string, ChessTimer>()
