import { GameDocument } from '@models/game'
import { TournamentDocument } from '@models/tournament'
import { UserDocument } from '@models/user'
import { EndState, GameType, PlayerColor, State } from '@lib/types/game'

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
  stats?: object
  games?: string
  createdAt?: Date
  updatedAt?: Date
  achievements?: string[]
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
    stats: {
      bulletWins: user.stats.bulletWins,
      bulletDraws: user.stats.bulletDraws,
      bulletDefeats: user.stats.bulletDefeats,
      blitzWins: user.stats.blitzWins,
      blitzDraws: user.stats.blitzDraws,
      blitzDefeats: user.stats.blitzDefeats,
      fastWins: user.stats.fastWins,
      fastDraws: user.stats.fastDraws,
      fastDefeats: user.stats.fastDefeats
    },
    achievements: user.achievements,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  }
}

interface Game {
  id: string
  lightPlayer: string | null
  darkPlayer: string | null
  board: string
  moves: string[]
  times?: {
    initial?: number
    increment?: number
    lightTimer?: number
    darkTimer?: number
  }
  winner?: PlayerColor
  gameType?: GameType
  endState?: EndState
  state: State
  createdAt: Date
  updatedAt: Date
}

export const parseGame = (Games: GameDocument): Game => {
  return {
    id: Games._id,
    lightPlayer: Games.lightId ? `https://api.gracehopper.xyz/v1/users/${String(Games.lightId)}` : null,
    darkPlayer: Games.darkId ? `https://api.gracehopper.xyz/v1/users/${String(Games.darkId)}` : null,
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
    state: Games.state,
    createdAt: Games.createdAt,
    updatedAt: Games.updatedAt
  }
}

interface Match {
  id: string
  game: string
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
    rounds: Number(Tournament.rounds),
    participants: Tournament.participants.length,
    matches: Tournament.matches.map((match) => {
      const matchJSON = JSON.parse(JSON.stringify(match))
      return {
        id: matchJSON._id,
        game: `https://api.gracehopper.xyz/v1/games/${String(matchJSON._id)}`,
        nextMatchId: matchJSON.nextMatchId,
        tournamentRoundText: matchJSON.tournamentRoundText,
        startTime: matchJSON.startTime,
        state: 'NO_SHOW',
        participants: []
      }
    }),
    createdAt: Tournament.createdAt,
    updatedAt: Tournament.updatedAt
  }
}
