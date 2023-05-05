import { GameType, START_BOARD, State } from '@lib/types/game'
import { GameModel } from '@models/game'
import { ReservedUsernames, UserModel } from '@models/user'
import { pbkdf2Sync, randomBytes } from 'crypto'

// ----- Fake User ----- //

export const newClient = {
  username: ReservedUsernames.DEV_USER_1,
  email: ReservedUsernames.DEV_USER_1 + '@example.fake',
  password: 'qwerty123'
}

export const client = {
  username: ReservedUsernames.DEV_USER_1,
  password: 'qwerty123'
}

export const setClient = async (): Promise<void> => {
  try {
    const salt = randomBytes(16)
    const key = pbkdf2Sync(newClient.password, salt, 310000, 64, 'sha512')
    await UserModel.create({
      username: newClient.username,
      email: newClient.email,
      password: key,
      salt,
      verified: true
      // ...
    })
  } catch (err: any) {}
}

export const clearClient = async (username?: string): Promise<void> => {
  try {
    await UserModel.deleteOne({ username: username ?? client.username })
  } catch (err: any) {}
}

export const clearClientWithCallback = (callback: CallableFunction): void => {
  UserModel.deleteOne({ username: client.username })
    .then(_ => { callback() })
    .catch(err => {
      console.error(err.message)
      callback()
    })
}

// ----- Fake Game ----- //

let gameId = '000000000000000000000000'

export const getGameId = (): string => { return gameId }

export const setGame = async (): Promise<void> => {
  try {
    const game = await GameModel.create({
      gameType: GameType.CUSTOM,
      state: State.ENDED,
      board: START_BOARD
    })
    gameId = game._id.toString()
  } catch (err: any) {
    console.error(err)
  }
}

export const clearGame = async (): Promise<void> => {
  try {
    await GameModel.findByIdAndDelete(gameId)
  } catch (err: any) {
    console.error(err)
  }
}
