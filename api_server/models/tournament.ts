import { model, Schema, Document } from 'mongoose'
import { UserModel } from '@models/user'

export interface TournamentDocument extends Document {
  name: string
  participants: [typeof UserModel]
}

const TournamentSchema = new Schema<TournamentDocument>({
  name: {
    type: String,
    unique: true,
    required: true
  },
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
})

export const TournamentModel = model<TournamentDocument>('Tournament', TournamentSchema)
