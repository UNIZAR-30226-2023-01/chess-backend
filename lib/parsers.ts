import { GameDocument } from '@models/game'
import { TournamentDocument } from '@models/tournament'
import { UserDocument } from '@models/user'

interface User {
  id: string
  username: string
  email: string
  avatar: string
  google: Boolean
  verified: boolean
  elo?: number
  skins?: object
  availableSkins?: object[]
  games?: string
  createdAt?: Date
  updatedAt?: Date
}

export const parseUser = (user: UserDocument): User => {
  return {
    id: user._id,
    avatar: `https://api.gracehopper.xyz/assets/${user.avatar}`,
    username: user.username,
    email: user.email,
    google: !!user.googleId,
    verified: user.verified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}

export const parseExtendedUser = (user: UserDocument): User => {
  return {
    id: user._id,
    avatar: `https://api.gracehopper.xyz/assets/${user.avatar}`,
    username: user.username,
    email: user.email,
    google: !!user.googleId,
    verified: user.verified,
    games: `https://api.gracehopper.xyz/v1/history?userId=${String(user._id)}`,
    elo: user.elo,
    skins: {
      board: user.board,
      lightPieces: user.lightPieces,
      darkPieces: user.darkPieces
    },
    availableSkins: [],
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}

interface Game {
  id: string
  lightPlayer?: string
  darkPlayer?: string
  board: string
  moves: string[]
  times?: {
    initial?: number
    increment?: number
    lightTimer?: number
    darkTimer?: number
  }
  winner?: 'LIGHT' | 'DARK'
  gameType?: 'AI' | 'COMPETITIVE' | 'CUSTOM'
  endState?: 'CHECKMATE' | 'DRAW' | 'TIMEOUT' | 'SURRENDER'
  state: 'GETTING_STARTED' | 'IN_PROGRESS' | 'CANCELLED' | 'FINISHED'
  createdAt: Date
  updatedAt: Date
}

export const parseGame = (Games: GameDocument): Game => {
  return {
    id: Games._id,
    lightPlayer: `https://api.gracehopper.xyz/v1/users/${String(Games.lightId)}`,
    darkPlayer: `https://api.gracehopper.xyz/v1/users/${String(Games.darkId)}`,
    board: Games.board,
    moves: Games.moves,
    times: {
      initial: Games.initialTimer,
      increment: Games.timerIncrement,
      lightTimer: Games.timerDark,
      darkTimer: Games.timerLight
    },
    winner: Games.winner,
    gameType: Games.gameType,
    endState: Games.endState,
    state: Games.finished ? 'FINISHED' : 'IN_PROGRESS',
    createdAt: Games.createdAt,
    updatedAt: Games.updatedAt
  }
}

interface Match {
  id: string
  game: string
  name: string
  nextMatchId: string | null
  tournamentRoundText: string
  startTime: string
  state: 'NO_SHOW' | 'WALK_OVER' | 'NO_PARTY' | 'DONE' | 'SCORE_DONE'
  participants: any[]
}

interface Tournament {
  id: string
  join: string
  leave: string
  owner: string
  startTime: Date
  rounds: number
  participants: number
  matches: Match[]
  // matches: any[]
  createdAt: Date
  updatedAt: Date
}

export const parseTournament = (Tournament: TournamentDocument): Tournament => {
  return {
    id: Tournament._id,
    join: `https://api.gracehopper.xyz/v1/tournaments/join/${String(Tournament._id)}`,
    leave: `https://api.gracehopper.xyz/v1/tournaments/leave/${String(Tournament._id)}`,
    owner: `https://api.gracehopper.xyz/v1/users/${String(Tournament.owner)}`,
    startTime: Tournament.startTime,
    rounds: Math.pow(2, Number(Tournament.rounds)),
    participants: 0,
    matches: Tournament.matches.map((match) => {
      const matchJSON = JSON.parse(JSON.stringify(match))
      return {
        id: matchJSON._id,
        game: `https://api.gracehopper.xyz/v1/games/${String(matchJSON._id)}`,
        name: '',
        nextMatchId: matchJSON.nextMatchId,
        tournamentRoundText: '',
        startTime: matchJSON.startTime,
        state: 'NO_SHOW',
        participants: []
      }
    }),
    createdAt: Tournament.createdAt,
    updatedAt: Tournament.updatedAt
  }
}
