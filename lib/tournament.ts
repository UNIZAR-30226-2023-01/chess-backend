import { TournamentDocument, TournamentModel } from '@models/tournament'
import { ObjectId } from 'mongodb'
import _ from 'lodash'
import { Types } from 'mongoose'
import { startMatch } from '@controllers/game/tournament'
import { GameState, PlayerColor } from './types/game'
// import sgMail from '@sendgrid/mail'
import { UserModel } from '@models/user'
import * as logger from '@lib/logger'

interface Match {
  _id: ObjectId
  nextMatchId: ObjectId | null
}

function generateGames (rondas: number, start: Date): Match[][] {
  const roundLlist = []
  for (let ronda = 0; ronda < rondas; ronda++) {
    const gameLlist = []
    for (let game = 0; game < 2 ** ronda; game++) {
      const data = {
        _id: new ObjectId(),
        nextMatchId: null,
        tournamentRoundText: `Ronda ${ronda + 1}`,
        startTime: getDate(rondas - ronda, start)
      }
      gameLlist.push(data)
    }
    roundLlist.push([...gameLlist])
    gameLlist.length = 0
  }
  return roundLlist
}

function linkItems (roundLlist: Match[][]): void {
  for (let i = roundLlist.length - 1; i >= 0; i--) {
    if (i === 0) break
    for (let j = 0; j < roundLlist[i].length; j++) {
      if (j % 2 === 0) { // bug
        roundLlist[i][j].nextMatchId = roundLlist[i - 1][j / 2 | 0]._id
      } else {
        roundLlist[i][j].nextMatchId = roundLlist[i - 1][j / 2 | 0]._id
      }
    }
  }
}

function getDate (n: number, start: Date): Date {
  const tomorrow = new Date(start)
  tomorrow.setDate(start.getDate() + n)
  return tomorrow
}

export function generateMatches (rounds: number, start: Date): Match[] {
  const gameList = generateGames(rounds, start) // game list per rounds
  linkItems(gameList)
  return gameList.flat() // flatten array
}

export async function prepareTournament (
  id: string
): Promise<(TournamentDocument & { _id: Types.ObjectId }) | null> {
  // Find and set hasStarted to true, to block setup operations
  const tournament = await TournamentModel.findByIdAndUpdate(
    id, { $set: { hasStarted: true } }
  )

  if (!tournament || tournament.hasStarted) return tournament

  // Shuffle
  const playerList = _.shuffle(tournament.participants)

  // Reallocate matches
  const players: number = tournament.participants.length
  const rounds: bigint = BigInt(tournament.rounds.valueOf()) - BigInt(1)
  const slots: number = Number(BigInt(1) << (rounds)).valueOf() // 2^(rounds - 1)

  // - Empty player array of every match
  for (let i = 0; i < slots; i++) {
    const index = slots + i - 1
    _.remove(tournament.matches[index].participants)
  }

  // - Push in new order
  for (let i = 0; i < players; i++) {
    if (i < slots) {
      const index = slots + i - 1
      tournament.matches[index].participants.push(playerList[i])
    } else {
      const index = i - 1
      tournament.matches[index].participants.push(playerList[i])
    }
  }

  return tournament
}

export async function startNextRound (id: string): Promise<void> {
  const tournament = await prepareTournament(id)

  if (!tournament) return

  // Reallocate matches
  const rounds: bigint = BigInt(tournament.rounds.valueOf()) - BigInt(1)

  for (let round = rounds; round >= 0; round--) {
    const slots: number = Number(BigInt(1) << BigInt(round)).valueOf() // 2^(round - 1)

    // If round has been played skip
    if (tournament.matches[slots - 1].played) continue

    await TournamentModel.findByIdAndUpdate(tournament._id, {
      $set: { matches: tournament.matches }
    })

    // Start all matches in this round
    for (let i = 0; i < slots; i++) {
      const match = tournament.matches[slots + i - 1]
      await TournamentModel.findOneAndUpdate(
        { 'matches._id': new Types.ObjectId(match._id) },
        { $set: { 'matches.$.played': true } }
      )
      if (match.participants.length > 0) {
        const gameId = await startMatch(match._id, match)
        if (gameId) match.gameId = gameId
      }
    }

    break
  }
}

export async function endProtocol (
  matchId: string,
  game: GameState
): Promise<void> {
  const tournament = await TournamentModel.findOne({ 'matches._id': matchId })

  if (!tournament || !game.timerDark || !game.timerLight) return

  const index = _.findIndex(tournament.matches, m => {
    return m._id.equals(matchId)
  })

  const match = tournament.matches[index]

  if (!match.nextMatchId) return

  let winnerId: Types.ObjectId | undefined

  // If victory move to the next game
  if (game.winner === PlayerColor.LIGHT) winnerId = game.lightId
  else if (game.winner === PlayerColor.DARK) winnerId = game.darkId
  // If draw first check timers
  else if (game.timerDark < game.timerLight) winnerId = game.lightId
  else if (game.timerDark > game.timerLight) winnerId = game.darkId
  else {
    // if equal choose randomly
    if (Math.random() >= 0.5) winnerId = game.lightId
    else winnerId = game.darkId
  }

  await TournamentModel.findOneAndUpdate(
    { 'matches._id': new Types.ObjectId(match.nextMatchId) },
    { $addToSet: { 'matches.$.participants': winnerId } }
  )
}

export const notify = async (): Promise<void> => {
  logger.log('TASK', 'Notify task awakens')

  const tournaments = await TournamentModel.find()
  const now = new Date()
  const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000)
  const pairs = tournaments
    .map(tournament => [tournament.id, tournament.matches])
    .filter(([_id, matches]) => {
      for (const match of matches) {
        // To not notify twice...
        if (match.played) return false

        const matchStart = new Date(match.startTime)
        if (matchStart >= now && matchStart <= tenMinutesLater) {
          return true
        }
      }
      return false
    })

  for (const [id, matches] of pairs) {
    startNextRound(id).then(_ => {
      for (const match of matches) {
        for (const id of match.participants) {
          UserModel.findById(id).then(async user => {
            const msg = {
              to: user?.email,
              from: 'hi@gracehopper.xyz',
              templateId: 'd-47913d1561644ab4aa8e7e3dc053f8a1',
              dynamicTemplateData: {
                subject: 'Tu rival espera'
              }
            }

            logger.log('INFO', `Sending email to ${String(user?.email)}`)
            console.log(msg)

            // sgMail.setApiKey(String(process.env.SENDGRID_API_KEY))
            // await sgMail.send(msg)
          }).catch(_err => {
            console.error('Cannot access to user:', id)
          })
        }
      }
    }).catch(_err => { })
  }
}

// Every 7 minutes check tournaments
setInterval(notify, 7 * 60 * 1000)
