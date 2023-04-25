import { Socket } from 'socket.io'
import { client, redlock } from '@config/database'
import * as roomGen from '@lib/room'
import { ResourceName, compose, composeLock } from '@lib/namespaces'
import { Types } from 'mongoose'

interface QueuePlayer {
  roomID: string
  player1: Types.ObjectId
  socket1: string
}

export interface Match extends QueuePlayer {
  player2?: Types.ObjectId
  socket2?: string
  abort: boolean
}

export async function findCompetitiveGame (
  player: Types.ObjectId, time: number, socket: Socket
): Promise<Match> {
  const lockName = composeLock(ResourceName.PLAYER_Q, time.toString())
  const resource = compose(ResourceName.PLAYER_Q, time.toString())

  let match: Match
  let lock = await redlock.acquire([lockName], 5000) // LOCK
  try {
    const awaiting = await client.get(resource)
    lock = await lock.extend(5000) // EXTEND

    if (awaiting !== null) { // match
      const parsedData: QueuePlayer = JSON.parse(awaiting)
      match = {
        socket1: parsedData.socket1,
        socket2: socket.id,
        player1: parsedData.player1,
        player2: player,
        roomID: parsedData.roomID,
        abort: false
      }
      if (match.player2?.equals(match.player1)) {
        match.abort = true
      } else {
        await client.del(resource)
      }
    } else {
      const roomID = await roomGen.generateUniqueRoomCode()
      const queuePlayer = { socket1: socket.id, player1: player, roomID }
      match = {
        socket1: socket.id,
        socket2: undefined,
        player1: player,
        player2: undefined,
        roomID,
        abort: false
      }
      await client.set(resource, JSON.stringify(queuePlayer))
    }
  } finally {
    await lock.release() // UNLOCK
  }

  console.log('Game matched roomID: ', match.roomID)

  return match
}

export async function cancelSearch (roomID: string): Promise<boolean> {
  let cancelled = false

  const pattern = compose(ResourceName.PLAYER_Q, '*')
  let i = 0
  let query: any
  do {
    query = await client.call('scan', i++, 'MATCH', pattern)
    console.log('query: ', query)
    for (const k of query[1]) {
      const key: string = k
      const lockName = composeLock(key)
      let lock = await redlock.acquire([lockName], 5000) // LOCK
      try {
        const awaiting = await client.get(key)
        lock = await lock.extend(5000) // EXTEND

        if (awaiting !== null) {
          const parsedData: QueuePlayer = JSON.parse(awaiting)

          // Remove from Queue
          if (roomID === parsedData.roomID) {
            cancelled = true
            await client.del(key)
          }
        }
      } finally {
        await lock.release() // UNLOCK
      }
    }
  } while (query[0] !== '0')

  return cancelled
}
