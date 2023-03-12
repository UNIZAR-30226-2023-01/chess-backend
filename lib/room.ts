import { client, redlock } from '../config/database'
const _ = require('lodash')

const roomKeys: string = 'room-keys'

/**
 * Generates a random 6-digit room code that is not currently in use.
 *
 * @returns Random and unique room code.
 */
export async function generateUniqueRoomCode (): Promise<string> {
  let code = ''
  while (!code) {
    const newCode = Math.floor(Math.random() * 1000000).toString().padStart(6, '0')
    let lock = await redlock.acquire(['room-key-lock'], 5000) // LOCK
    try {
      const record = await client.get(roomKeys)
      lock = await lock.extend(5000) // EXTEND
      if (record !== null) {
        const rooms = JSON.parse(record)
        console.log('rooms: ', rooms)
        const index = _.indexOf(rooms, newCode)

        if (index === -1) {
          code = newCode
          rooms.push(newCode)
          await client.set(roomKeys, JSON.stringify(rooms))
        }
      } else {
        code = newCode
        const rooms = [newCode]

        await client.set(roomKeys, JSON.stringify(rooms))
      }
    } finally {
      await lock.release() // UNLOCK
    }
  }
  return code
}

/**
 * Releases a room code to let it be used again.
 */
export async function releaseRoomCode (code: string): Promise<void> {
  let lock = await redlock.acquire(['room-key-lock'], 5000) // LOCK
  const record = await client.get(roomKeys)
  lock = await lock.extend(5000)
  if (record !== null) {
    const parsedData = JSON.parse(record)
    const rooms = _.remove(parsedData[roomKeys], (room: string): boolean => {
      return code === room
    })
    await client.set(roomKeys, JSON.stringify(rooms))
  }
  const a = await lock.release() // UNLOCK
  console.log('Código de sala liberado. Intentos:', a.attempts)
}
