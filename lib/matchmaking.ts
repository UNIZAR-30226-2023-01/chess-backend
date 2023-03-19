import { Socket } from 'socket.io'
import { client, redlock } from '@config/database'
import * as roomGen from '@lib/room'
import { ResourceName, compose, composeLock } from '@lib/namespaces'

interface QueuePlayer {
  roomID: string
  player1: string | undefined
  socket1: string | undefined
}

export interface Match extends QueuePlayer {
  player2: string | undefined
  socket2: string | undefined
}

export async function findCompetitiveGame (
  player: string, time: number, socket: Socket
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
        roomID: parsedData.roomID
      }
      await client.del(resource)
    } else {
      const roomID = await roomGen.generateUniqueRoomCode()
      const queuePlayer = { socket1: socket.id, player1: player, roomID }
      match = {
        socket1: socket.id,
        socket2: undefined,
        player1: player,
        player2: undefined,
        roomID
      }
      await client.set(resource, JSON.stringify(queuePlayer))
    }
  } finally {
    await lock.release() // UNLOCK
  }

  console.log('Game matched roomID: ', match.roomID)

  return match
}
