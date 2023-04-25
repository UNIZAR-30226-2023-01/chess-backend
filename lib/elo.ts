import { UserModel } from '@models/user'
import { Types } from 'mongoose'

const K_VALUE = 32
const DIFF_RATIO = 400

interface ProbabilitiesToWin {
  probabilityPlayerA: number
  probabilityPlayerB: number
}

export interface MatchNewElo {
  newEloPlayerA: number
  newEloPlayerB: number
  eloDiffA: number
  eloDiffB: number
}

export enum MatchResult {
  VICTORY = 1,
  DRAW = 0.5,
  DEFEAT = 0
}

const getProbabilityToWin = (
  eloPlayerA: number,
  eloPlayerB: number
): ProbabilitiesToWin => {
  const probabilityPlayerA = 1 / (1 + Math.pow(10, ((eloPlayerB - eloPlayerA) / DIFF_RATIO)))
  const probabilityPlayerB = 1 - probabilityPlayerA
  return { probabilityPlayerA, probabilityPlayerB }
}

const getNewElo = (
  eloPlayerA: number,
  eloPlayerB: number,
  resultForA: MatchResult
): MatchNewElo => {
  if (resultForA === MatchResult.DRAW) {
    return {
      newEloPlayerA: eloPlayerA,
      newEloPlayerB: eloPlayerB,
      eloDiffA: 0,
      eloDiffB: 0
    }
  }

  const p = getProbabilityToWin(eloPlayerA, eloPlayerB)
  const { probabilityPlayerA, probabilityPlayerB } = p

  const eloDiffA = Math.round(K_VALUE * (resultForA - probabilityPlayerA))
  const eloDiffB = Math.round(K_VALUE * ((1 - resultForA) - probabilityPlayerB))

  const newEloPlayerA = eloPlayerA + eloDiffA
  const newEloPlayerB = eloPlayerB + eloDiffB

  return { newEloPlayerA, newEloPlayerB, eloDiffA, eloDiffB }
}

export const updateEloOfUsers = async (
  idPlayerA: Types.ObjectId,
  idPlayerB: Types.ObjectId,
  resultForA: MatchResult
): Promise<MatchNewElo | undefined> => {
  const playerA = await UserModel.findById(idPlayerA)
  const playerB = await UserModel.findById(idPlayerB)

  if (!playerA || !playerB) return

  const newElo = getNewElo(playerA.elo, playerB.elo, resultForA)

  await UserModel.updateOne(
    { _id: idPlayerA },
    { $set: { elo: newElo.newEloPlayerA } }
  )
  await UserModel.updateOne(
    { _id: idPlayerB },
    { $set: { elo: newElo.newEloPlayerB } }
  )
  return newElo
}
