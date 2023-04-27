import { Socket } from 'socket.io'
import { client, redlock } from '@config/database'

import { ResourceName, compose, composeLock } from '@lib/namespaces'
import { Types } from 'mongoose'
import { getElo } from '@lib/elo'
const _ = require('lodash')

const K_BASE = 35
const K_INC = 35
const K_MAX = 400
const TIME_TO_WAIT = 5 * 1000
// const NUM_TRIES = 250

export interface Match {
  player1: Types.ObjectId
  socket1: string
  player2: Types.ObjectId
  socket2: string

  // Flag to select which location where this function was called is
  // responsible of creating the game room and
  baton: boolean

  // true if the user has cancelled the search
  cancelled: boolean
}

interface AwaitingPlayer {
  id: Types.ObjectId
  socket: string
  elo: number
  courtesy: number // +- K
  timeout?: NodeJS.Timeout
}

interface PlayerQueue {
  queue: AwaitingPlayer[]
  awakened: Match[]
  cancelled: AwaitingPlayer[]
}

const checkEloCompatibility = (
  player1: AwaitingPlayer,
  player2: AwaitingPlayer
): boolean => {
  const eloDiff = Math.abs(player1.elo - player2.elo)
  return player1.courtesy >= eloDiff || player2.courtesy >= eloDiff
}

const checkQueueOrAwakenOrCancelled = async (
  queueName: string,
  player: AwaitingPlayer
): Promise<Match | undefined> => {
  let match: Match | undefined

  const lockName = composeLock(queueName)
  let lock = await redlock.acquire([lockName], 5000) // LOCK
  try {
    const awaiting = await client.get(queueName)
    lock = await lock.extend(5000) // EXTEND

    if (awaiting !== null) {
      const { queue, awakened, cancelled }: PlayerQueue = JSON.parse(awaiting)

      // Check if the player has cancelled the search
      const isCancelled = _.find(cancelled, (q: AwaitingPlayer) => {
        return q.socket === player.socket
      })
      if (isCancelled) {
        _.remove(cancelled, (q: AwaitingPlayer) => {
          return q.socket === player.socket
        })
        match = {
          player1: player.id,
          socket1: player.socket,
          player2: player.id,
          socket2: player.socket,
          baton: false,
          cancelled: true
        }
      } else {
        // Check if the player has been awakened
        match = _.find(awakened, (m: Match) => {
          return m.socket1 === player.socket ||
                 m.socket2 === player.socket
        })

        if (match) {
          // I've been awakened
          _.remove(awakened, (m: Match) => {
            return m.socket1 === player.socket ||
                   m.socket2 === player.socket
          })

          match.baton = true
        } else {
          // I'm looking for some opponent
          for (const opponent of queue) {
            if (!player.id.equals(opponent.id) &&
                checkEloCompatibility(player, opponent)) {
              match = {
                player1: player.id,
                socket1: player.socket,
                player2: opponent.id,
                socket2: opponent.socket,
                baton: false,
                cancelled: false
              }

              clearTimeout(opponent.timeout)
              awakened.push(match)
              _.remove(queue, (q: AwaitingPlayer) => {
                return q.socket === opponent.socket ||
                       q.socket === player.socket
              })

              break
            }
          }
        }
      }
      await client.set(queueName, JSON.stringify({ queue, awakened, cancelled }))
    }
  } finally {
    await lock.release() // UNLOCK
  }
  return match
}

const addToQueue = async (
  queueName: string,
  player: AwaitingPlayer
): Promise<void> => {
  const lockName = composeLock(queueName)
  let lock = await redlock.acquire([lockName], 5000) // LOCK
  try {
    const awaiting = await client.get(queueName)
    lock = await lock.extend(5000) // EXTEND

    if (awaiting !== null) {
      const { queue, awakened, cancelled }: PlayerQueue = JSON.parse(awaiting)

      // Check if the player is in queue
      const index: number = _.findIndex(queue, (q: AwaitingPlayer) => {
        return q.socket === player.socket
      })

      if (index === -1) {
        queue.push(player)
      } else {
        queue[index] = player
      }

      await client.set(queueName, JSON.stringify({ queue, awakened, cancelled }))
    } else {
      const playerQueue: PlayerQueue = {
        queue: [player],
        awakened: [],
        cancelled: []
      }
      await client.set(queueName, JSON.stringify(playerQueue))
    }
  } finally {
    await lock.release() // UNLOCK
  }
}

export const findCompetitiveGame = async (
  id: Types.ObjectId, time: number, socket: Socket
): Promise<Match> => {
  const queueName = compose(ResourceName.PLAYER_Q, time.toString())
  const player: AwaitingPlayer = {
    id,
    socket: socket.id,
    elo: await getElo(id),
    courtesy: K_BASE
  }

  let DEBUG = 0

  let match: Match | undefined
  while (!match) {
    match = await checkQueueOrAwakenOrCancelled(queueName, player)
    if (!match) {
      // SITUACION PELIAGUDA
      console.log('timeout(', DEBUG, ') ', player.timeout)

      await addToQueue(queueName, player)
      await new Promise(resolve => {
        setTimeout(resolve, TIME_TO_WAIT)
      }) // SLEEP
      player.timeout = undefined
      player.courtesy += K_INC
      if (player.courtesy >= K_MAX) {
        player.courtesy = K_MAX
      }
    }
    DEBUG++
  }

  return match
}

export const cancelSearch = async (
  socket: Socket
): Promise<boolean> => {
  let hasBeenCancelled = false

  const pattern = compose(ResourceName.PLAYER_Q, '*')
  let i = 0
  let query: any
  do {
    query = await client.call('scan', i++, 'MATCH', pattern)
    console.log('query: ', query)
    for (const key of query[1]) {
      const queueName: string = key
      const lockName = composeLock(queueName)
      let lock = await redlock.acquire([lockName], 5000) // LOCK
      try {
        const awaiting = await client.get(queueName)
        lock = await lock.extend(5000) // EXTEND

        if (awaiting !== null) {
          const { queue, awakened, cancelled }: PlayerQueue = JSON.parse(awaiting)
          console.log('Cancelling...\n queue:', queue)

          // Check if the player is in queue
          const inQueue = _.find(queue, (q: AwaitingPlayer) => {
            return q.socket === socket.id
          })

          if (inQueue) {
            hasBeenCancelled = true
            // Remove from Queue
            _.remove(queue, (q: AwaitingPlayer) => {
              if (q.socket === socket.id) {
                cancelled.push(q)
                return true
              }
              return false
            })
            await client.set(queueName, JSON.stringify({ queue, awakened, cancelled }))
          }
          console.log('new queue:', queue)
        }
      } finally {
        await lock.release() // UNLOCK
      }
    }
  } while (query[0] !== '0')

  return hasBeenCancelled
}
