import { model, Schema, Document, Types } from 'mongoose'
import { UserModel } from '@models/user'

export interface MatchDocument extends Document {
  gameId: Types.ObjectId
  nextMatchId: Types.ObjectId
  tournamentRoundText: String
  startTime: Date
  state: 'NO_SHOW' | 'WALK_OVER' | 'NO_PARTY' | 'DONE' | 'SCORE_DONE'
  participants: any[]
  played: boolean
}

const MatchSchema = new Schema<MatchDocument>({
  gameId: {
    type: Schema.Types.ObjectId,
    ref: 'Game'
  },
  nextMatchId: {
    type: Schema.Types.ObjectId,
    ref: 'Match'
  },
  tournamentRoundText: {
    type: String
  },
  startTime: {
    type: Date
  },
  state: {
    type: String,
    default: 'NO_SHOW'
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  played: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

export interface TournamentDocument extends Document {
  owner: typeof UserModel
  startTime: Date
  rounds: Number
  participants: [typeof UserModel]
  matches: [MatchDocument]
  createdAt: Date
  updatedAt: Date
  hasStarted: Boolean
  matchProps: {
    time: number
    increment: number
  }
}

const TournamentSchema = new Schema<TournamentDocument>({
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  startTime: {
    type: Date,
    required: true
  },
  rounds: {
    type: Number,
    required: true
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  matches: [MatchSchema],
  hasStarted: {
    type: Boolean,
    default: false
  },
  matchProps: {
    type: new Schema({
      time: {
        type: Number,
        default: 300
      },
      increment: {
        type: Number,
        default: 5
      }
    }),
    default: {
      time: 300,
      increment: 5
    }
  }
}, {
  timestamps: true
})

export const MatchModel = model<MatchDocument>('Match', MatchSchema)
export const TournamentModel = model<TournamentDocument>('Tournament', TournamentSchema)
