import { client, redlock } from '@config/database'
import { ResourceName, compose, composeLock } from '@lib/namespaces'
import { Socket } from 'socket.io'

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

    const lockName = composeLock(ResourceName.ROOM, newCode)
    const resource = compose(ResourceName.ROOM, newCode)

    let lock = await redlock.acquire([lockName], 5000) // LOCK
    try {
      const record = await client.get(resource)
      lock = await lock.extend(5000) // EXTEND
      if (record === null) { // room code is free
        code = newCode
        await client.set(resource, 'locked')
      }
    } finally {
      await lock.release() // UNLOCK
    }
  }
  return code
}

export const getGameRoom = (socket: Socket): string | null => {
  for (const roomID of socket.rooms.values()) {
    if (roomID !== socket.id) {
      return roomID
    }
  }
  return null
}
