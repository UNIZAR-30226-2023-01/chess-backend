import { client, redlock } from '../config/database'

export const roomPrefix: string = 'game-'
export const roomLockPrefix: string = 'game-lock-'

/**
 * Generates a random 6-digit room code that is not currently in use.
 *
 * @returns Random and unique room code.
 */
export async function generateUniqueRoomCode (): Promise<string> {
  let code: string | undefined
  while (!code) {
    const newCode = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
    let lock = await redlock.acquire([roomLockPrefix + newCode], 5000) // LOCK
    try {
      const record = await client.get(roomPrefix + newCode)
      lock = await lock.extend(5000) // EXTEND
      if (record === null) { // libre
        code = newCode
        await client.set(roomPrefix + newCode, JSON.stringify('locked'))
      }
    } finally {
      await lock.release() // UNLOCK
    }
  }
  return code
}
