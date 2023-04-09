import { model, Schema, Document } from 'mongoose'
import { UserModel } from '@models/user'

export interface MatchDocument extends Document {
  nextMatchId: Schema.Types.ObjectId
  tournamentRoundText: String
  startTime: Date
}

const MatchSchema = new Schema<MatchDocument>({
  nextMatchId: {
    type: Schema.Types.ObjectId,
    ref: 'Game'
  },
  startTime: {
    type: Date
  }
}, {
  timestamps: true
})

export interface TournamentDocument extends Document {
  owner: typeof UserModel
  startTime: Date
  rounds: Number
  participants: [typeof UserModel]
  matches: [typeof MatchSchema]
  createdAt: Date
  updatedAt: Date
}

const TournamentSchema = new Schema<TournamentDocument>({
  owner: {
    type: Schema.Types.ObjectId,
    ref: 'UserModel'
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
    ref: 'UserModel'
  }],
  matches: [MatchSchema]
}, {
  timestamps: true
})

export const MatchModel = model<MatchDocument>('Match', MatchSchema)
export const TournamentModel = model<TournamentDocument>('Tournament', TournamentSchema)
