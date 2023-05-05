import { UserModel } from '@models/user'
import { EndState, GameType, State } from '@lib/types/game'
import { Types } from 'mongoose'
import { GameModel } from '@models/game'
import { TournamentModel } from '@models/tournament'

export enum Achievements {
  FIRST_LOGIN = 'FIRST LOGIN',

  TOP_1 = 'TOP 1',
  TOP_100 = 'TOP 100',

  PLAY_10_COMPETITIVE = 'PLAY 10 COMPETITIVE',
  PLAY_10_AI = 'PLAY 10 AI',
  PLAY_10_CUSTOM = 'PLAY 10 CUSTOM',
  PLAY_10_TOURNAMENT = 'PLAY 10 TOURNAMENT',

  DRAW_10_GAMES = 'DRAW 10 GAMES'
}

const checkAndUpdateGamesPlayed = async (
  userId: Types.ObjectId,
  gameType: GameType,
  numGames: number,
  achievement: Achievements
): Promise<void> => {
  try {
    const numGamesPlayed = await GameModel.countDocuments({
      $and: [
        { $or: [{ darkId: userId }, { lightId: userId }] },
        { gameType }
      ]
    })
    if (numGamesPlayed >= numGames) {
      await UserModel.updateOne(
        { _id: userId },
        { $addToSet: { achievements: achievement } }
      )
    }
  } catch (err: any) {
    console.error(err)
  }
}

const checkAndUpdateTournamentsPlayed = async (
  userId: Types.ObjectId,
  numTournaments: number,
  achievement: Achievements
): Promise<void> => {
  TournamentModel.aggregate([
    { $match: { participants: { $in: [userId] } } },
    { $count: 'total' }
  ]).exec(async (err, result) => {
    if (err) {
      console.error(err)
      return
    }
    const count: number = result.length > 0 ? result[0].total : 0

    if (count >= numTournaments) {
      await UserModel.updateOne(
        { _id: userId },
        { $addToSet: { achievements: achievement } }
      )
    }
  })
}

const checkAndUpdateDraws = async (
  userId: Types.ObjectId,
  numGames: number,
  achievement: Achievements
): Promise<void> => {
  try {
    const numGamesDrawed = await GameModel.countDocuments({
      $and: [
        { $or: [{ darkId: userId }, { lightId: userId }] },
        { state: State.ENDED },
        { endState: EndState.DRAW }
      ]
    })
    if (numGamesDrawed >= numGames) {
      await UserModel.updateOne(
        { _id: userId },
        { $addToSet: { achievements: achievement } }
      )
    }
  } catch (err: any) {
    console.error(err)
  }
}

export const afterGameAchievementsCheck = async (
  userId: Types.ObjectId,
  gameType: GameType
): Promise<void> => {
  switch (gameType) {
    case GameType.AI:
      void checkAndUpdateGamesPlayed(
        userId, gameType, 10, Achievements.PLAY_10_AI)
      break
    case GameType.CUSTOM:
      void checkAndUpdateGamesPlayed(
        userId, gameType, 10, Achievements.PLAY_10_CUSTOM)
      break
    case GameType.COMPETITIVE:
      void checkAndUpdateGamesPlayed(
        userId, gameType, 10, Achievements.PLAY_10_COMPETITIVE)
      break
    case GameType.TOURNAMENT:
      void checkAndUpdateTournamentsPlayed(
        userId, 10, Achievements.PLAY_10_TOURNAMENT)
      break
  }
  void checkAndUpdateDraws(userId, 10, Achievements.DRAW_10_GAMES)
}

const updateTopRankingAchievement = async (
  topUsers: number,
  achievement: Achievements
): Promise<void> => {
  UserModel.find().sort({ elo: -1 }).limit(topUsers).exec((err, users) => {
    if (err) {
      console.error(err)
      return
    }
    users.map(async user => await UserModel.updateMany(
      { _id: user._id },
      { $addToSet: { achievements: achievement } }
    ))
  })
}

export const updateRankingAchievements = async (): Promise<void> => {
  void updateTopRankingAchievement(1, Achievements.TOP_1)
  void updateTopRankingAchievement(100, Achievements.TOP_100)
}

export const setFirstLoginAchievement = async (
  userId: Types.ObjectId
): Promise<void> => {
  await UserModel.updateOne(
    { _id: userId },
    { $addToSet: { achievements: Achievements.FIRST_LOGIN } }
  )
}
