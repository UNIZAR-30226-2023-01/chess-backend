import { model, Schema, Document } from 'mongoose'

export interface TournamentDocument extends Document {
  name: string
}

const TournamentSchema = new Schema<TournamentDocument>({
  name: {
    type: String,
    unique: true,
    required: true
  }
}, {
  timestamps: true
})

export const TournamentModel = model<TournamentDocument>('Tournament', TournamentSchema)
