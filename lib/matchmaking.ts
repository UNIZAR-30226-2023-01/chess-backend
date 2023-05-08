import { Socket } from 'socket.io'
import { client, redlock } from '@config/database'
import { io } from '@server'
import { ResourceName, compose, composeLock } from '@lib/namespaces'
import { Types } from 'mongoose'
import { getElo } from '@lib/elo'
import _ from 'lodash'

const K_BASE = 32
const K_INC = 32
const K_MAX = 250
const TIME_TO_WAIT = 5 * 1000
const NUM_TRIES = 24 // 2 min timeout

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

const removeDisconnectedSockets = (playerQueue: PlayerQueue): PlayerQueue => {
  const { queue, awakened, cancelled } = playerQueue
  _.remove(queue, (q: AwaitingPlayer) => {
    if (!io.sockets.sockets.has(q.socket)) {
      cancelled.push(q)
      return true
    }
    return false
  })
  return { queue, awakened, cancelled }
}

const getQueue = async (
  queueName: string,
  action?: (playerQueue?: PlayerQueue) => Promise<PlayerQueue | undefined>
): Promise<PlayerQueue | undefined> => {
  let queue: PlayerQueue | undefined

  const lockName = composeLock(queueName)
  let lock = await redlock.acquire([lockName], 5000) // LOCK
  try {
    const awaiting = await client.get(queueName)
    lock = await lock.extend(5000) // EXTEND

    if (!awaiting) queue = undefined
    else queue = JSON.parse(awaiting)

    lock = await lock.extend(5000) // EXTEND
    if (action) {
      if (queue) queue = removeDisconnectedSockets(queue)
      queue = await action(queue)
    }
  } catch (err) {
    queue = undefined
  } finally {
    // This block executes even if a return statement is called
    await lock.release() // UNLOCK
  }
  return queue
}

const checkQueueOrAwakenOrCancelled = async (
  queueName: string,
  player: AwaitingPlayer
): Promise<Match | undefined> => {
  let match: Match | undefined

  await getQueue(queueName, async (playerQueue?: PlayerQueue) => {
    if (!playerQueue) return
    const { queue, awakened, cancelled } = playerQueue

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

        match.baton = false
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
              baton: true,
              cancelled: false
            }

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
    return { queue, awakened, cancelled }
  })

  return match
}

const addToQueue = async (
  queueName: string,
  player: AwaitingPlayer
): Promise<void> => {
  await getQueue(queueName, async (playerQueue?: PlayerQueue) => {
    if (playerQueue) {
      const { queue, awakened, cancelled } = playerQueue

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
      return { queue, awakened, cancelled }
    } else {
      const playerQueue: PlayerQueue = {
        queue: [player],
        awakened: [],
        cancelled: []
      }
      await client.set(queueName, JSON.stringify(playerQueue))
      return playerQueue
    }
  })
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

  let match: Match | undefined
  for (let i = 0; !match; i++) {
    if (i >= NUM_TRIES) await cancelSearch(socket)

    match = await checkQueueOrAwakenOrCancelled(queueName, player)
    if (!match) {
      // SITUACION PELIAGUDA
      console.log('timeout(', i, ') ')

      await addToQueue(queueName, player)
      await new Promise(resolve => {
        setTimeout(resolve, TIME_TO_WAIT)
      }) // SLEEP
      player.courtesy += K_INC
      if (player.courtesy >= K_MAX) {
        player.courtesy = K_MAX
      }
    }
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
    for (const queueName of query[1]) {
      await getQueue(queueName, async (playerQueue?: PlayerQueue) => {
        if (!playerQueue) return
        const { queue, awakened, cancelled } = playerQueue

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

        return { queue, awakened, cancelled }
      })
    }
  } while (query[0] !== '0')

  return hasBeenCancelled
}
