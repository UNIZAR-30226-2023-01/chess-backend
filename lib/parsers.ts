import { GameDocument } from '@models/game'
import { TournamentDocument } from '@models/tournament'
import { UserDocument, UserModel } from '@models/user'
import { EndState, GameType, PlayerColor, State } from '@lib/types/game'

const URI = process.env.NODE_ENV === 'production' ? 'https://api.gracehopper.xyz' : 'http://localhost:4000'

const achievements = [
  {
    imgSrc: '/achievements/1.webp',
    imgAlt: 'first login',
    name: 'FIRST LOGIN'
  }, {
    imgSrc: '/achievements/2.webp',
    imgAlt: 'top 1',
    name: 'TOP 1'
  }, {
    imgSrc: '/achievements/3.webp',
    imgAlt: 'top 100',
    name: 'TOP 100'
  }, {
    imgSrc: '/achievements/4.webp',
    imgAlt: 'play 10 competitive',
    name: 'PLAY 10 COMPETITIVE'
  }, {
    imgSrc: '/achievements/5.webp',
    imgAlt: 'play 10 ai',
    name: 'PLAY 10 AI'
  }, {
    imgSrc: '/achievements/6.webp',
    imgAlt: 'play 10 custom',
    name: 'PLAY 10 CUSTOM'
  }, {
    imgSrc: '/achievements/7.webp',
    imgAlt: 'play 10 tournaments',
    name: 'PLAY 10 TOURNAMENT'
  }, {
    imgSrc: '/achievements/7.webp',
    imgAlt: 'draw 10 games',
    name: 'DRAW 10 GAMES'
  }
]

const skins = [
  {
    type: 'board',
    name: 'wood',
    lightColor: '#E3C16F',
    darkColor: '#B88B4A'
  }, {
    type: 'board',
    name: 'coral',
    lightColor: '#B1E4B9',
    darkColor: '#70A2A3'
  }, {
    type: 'board',
    name: 'dark',
    lightColor: '#CCB7AE',
    darkColor: '#706677'
  }, {
    type: 'board',
    name: 'marine',
    lightColor: '#9DACFF',
    darkColor: '#6F73D2'
  }, {
    type: 'board',
    name: 'wheat',
    lightColor: '#EAF0CE',
    darkColor: '#BBBE64'
  }, {
    type: 'board',
    name: 'emerald',
    lightColor: '#ADBD8F',
    darkColor: '#6F8F72'
  }, {
    type: 'pieces',
    src: '/pieces/medieval',
    name: 'medieval'
  }, {
    type: 'pieces',
    src: '/pieces/moroccans',
    name: 'moroccans'
  }, {
    type: 'pieces',
    src: '/pieces/maya',
    name: 'maya'
  }, {
    type: 'pieces',
    src: '/pieces/arab',
    name: 'arab'
  }
]

interface User {
  id: string
  username: string
  email: string
  avatar: string
  google: Boolean
  verified: boolean
  elo?: number
  ranking: number
  skins?: object
  availableSkins?: object[]
  stats?: object
  games?: string
  createdAt?: Date
  updatedAt?: Date
  achievements?: object[]
}

const getRanking = async (user: UserDocument): Promise<number> => {
  const top = await UserModel.countDocuments({ elo: { $gt: user.elo } })
  return top + 1
}

export const parseUser = async (user: UserDocument): Promise<User> => {
  return {
    id: user._id,
    avatar: user.avatar,
    username: user.username,
    email: user.email,
    google: !!user.googleId,
    verified: user.verified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ranking: await getRanking(user)
  }
}

export const parseExtendedUser = async (user: UserDocument): Promise<User> => {
  const filter = {
    $or: [
      { darkId: String(user._id) },
      { lightId: String(user._id) }
    ]
  }

  return {
    id: user._id,
    avatar: user.avatar,
    username: user.username,
    email: user.email,
    google: !!user.googleId,
    verified: user.verified,
    games: `${URI}/v1/games?sort=-createdAt&filter=${encodeURIComponent(JSON.stringify(filter))}`,
    elo: user.elo,
    ranking: await getRanking(user),
    skins: skins.map((skin) => {
      if (skin.type === 'board') return { ...skin, active: user.board === skin.name }
      return { ...skin, activeWhite: skin?.name === user.lightPieces, activeBlack: skin?.name === user.darkPieces }
    }),
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
    achievements: achievements.map((achievement) => {
      return { ...achievement, achieved: user.achievements.includes(achievement.name) }
    }),
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
    lightPlayer: Games.lightId ? `${URI}/v1/users/${String(Games.lightId)}` : null,
    darkPlayer: Games.darkId ? `${URI}/v1/users/${String(Games.darkId)}` : null,
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
  participants: any[]
  matches: Match[]
  matchProps: {
    time: number
    increment: number
  }
  createdAt: Date
  updatedAt: Date
}

export const parseTournament = async (Tournament: TournamentDocument): Promise<Tournament> => {
  return {
    id: Tournament._id,
    join: `${URI}/v1/tournaments/join/${String(Tournament._id)}`,
    leave: `${URI}/v1/tournaments/leave/${String(Tournament._id)}`,
    owner: `${URI}/v1/users/${String(Tournament.owner)}`,
    startTime: Tournament.startTime,
    rounds: Number(Tournament.rounds),
    participants: Tournament.participants,
    matches: await Promise.all(Tournament.matches.map(async (match) => {
      const matchJSON = JSON.parse(JSON.stringify(match))
      return {
        id: matchJSON._id,
        game: `${URI}/v1/games/${String(matchJSON._id)}`,
        nextMatchId: matchJSON.nextMatchId,
        tournamentRoundText: matchJSON.tournamentRoundText,
        startTime: matchJSON.startTime,
        state: 'NO_SHOW',
        participants: await Promise.all(matchJSON.participants.map(async (participant: any) => {
          try {
            return await parseExtendedUser(participant)
          } catch (e) {
            return participant
          }
        }))
      }
    })),
    matchProps: {
      time: Tournament.matchProps.time,
      increment: Tournament.matchProps.increment
    },
    createdAt: Tournament.createdAt,
    updatedAt: Tournament.updatedAt
  }
}
