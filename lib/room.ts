import { client, redlock } from '@config/database'
import { ResourceName, compose, composeLock } from '@lib/namespaces'
import { Socket } from 'socket.io'
import * as logger from '@lib/logger'

/**
 * Generates a random 6-digit room code that is not currently in use.
 *
 * @returns Random and unique room code.
 */
export const generateUniqueRoomCode = async (): Promise<string> => {
  let code: string | undefined
  while (!code) {
    const newCode = Math
      .floor(Math.random() * 1000000)
      .toString()
      .padStart(6, '0')

    if (await reserveRoomCode(newCode)) {
      code = newCode
    }
  }
  return code
}

export const reserveRoomCode = async (code: string): Promise<boolean> => {
  const lockName = composeLock(ResourceName.ROOM, code)
  const resource = compose(ResourceName.ROOM, code)

  let lock = null
  while (!lock) {
    try {
      lock = await redlock.acquire([lockName], 20000) // LOCK
      const record = await client.get(resource)
      lock = await lock.extend(20000) // EXTEND
      if (record === null) { // room code is free
        await client.set(resource, 'locked')
        return true
      }
    } catch (err) {
      logger.error(String(err))
    } finally {
      if (lock) await lock.release() // UNLOCK
    }
  }
  return false
}

export const getGameRoom = (socket: Socket): string | null => {
  for (const roomID of socket.rooms.values()) {
    if (roomID !== socket.id) {
      return roomID
    }
  }
  return null
}
