import { client, redlock } from '@config/database'
import { ResourceName, compose, composeLock } from '@lib/namespaces'

export const pushGameID = async (gameID: string): Promise<boolean> => {
  const lockName = composeLock(ResourceName.RESTORE_Q, gameID)
  const resource = compose(ResourceName.RESTORE_Q, gameID)

  let pushed = false

  let lock = await redlock.acquire([lockName], 5000) // LOCK
  try {
    const record = await client.get(resource)
    lock = await lock.extend(5000) // EXTEND
    if (record === null) { // game is not being resumed
      await client.set(resource, 'locked')
      pushed = true
    }
  } finally {
    await lock.release() // UNLOCK
  }

  return pushed
}

export const pullGameID = async (gameID: string): Promise<boolean> => {
  const lockName = composeLock(ResourceName.RESTORE_Q, gameID)
  const resource = compose(ResourceName.RESTORE_Q, gameID)

  let pulled = false

  let lock = await redlock.acquire([lockName], 5000) // LOCK
  try {
    const record = await client.get(resource)
    lock = await lock.extend(5000) // EXTEND
    if (record !== null) { // game has been resumed
      await client.del(resource)
      pulled = true
    }
  } finally {
    await lock.release() // UNLOCK
  }

  return pulled
}
