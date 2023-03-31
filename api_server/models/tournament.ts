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
    required: true,
    ref: 'Game'
  },
  tournamentRoundText: {
    type: String,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  }
}, {
  timestamps: true
})

export interface TournamentDocument extends Document {
  startTime: Date
  rounds: Number
  participants: [typeof UserModel]
  matches: [typeof MatchSchema]
  createdAt: Date
  updatedAt: Date
}

const TournamentSchema = new Schema<TournamentDocument>({
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
  matches: [MatchSchema]
}, {
  timestamps: true
})

export const MatchModel = model<MatchDocument>('Match', MatchSchema)
export const TournamentModel = model<TournamentDocument>('Tournament', TournamentSchema)
