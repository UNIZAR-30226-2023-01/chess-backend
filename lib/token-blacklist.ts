import { client, redlock } from '@config/database'
import { composeLock, ResourceName, compose } from '@lib/namespaces'
import * as logger from '@lib/logger'

export enum TokenValidationResult {
  OK = 0,
  INVALID_TOKEN = 1,
  ERROR = 2
}

export const invalidateToken = async (
  username: string,
  token: any
): Promise<void> => {
  const expTime = 60 * 60 * 24 // segundos de expiracion

  const lockName = composeLock(ResourceName.TOKEN_BL, username)
  const resource = compose(ResourceName.TOKEN_BL, username)

  let lock = null
  while (!lock) {
    try {
      lock = await redlock.acquire([lockName], 20000) // LOCK
      const record = await client.get(resource)
      lock = await lock.extend(20000) // EXTEND

      if (record !== null) {
        const parsedData = JSON.parse(record)
        parsedData.push(token)
        await client.setex(resource, expTime, JSON.stringify(parsedData))
      } else {
        const blacklistedData = [token]
        await client.setex(resource, expTime, JSON.stringify(blacklistedData))
      }
    } catch (err) {
      logger.error(String(err))
    } finally {
      if (lock) await lock.release() // UNLOCK
    }
  }
}

export const validateToken = async (
  username: string,
  token: any
): Promise<number> => {
  const lockName = composeLock(ResourceName.TOKEN_BL, username)
  const resource = compose(ResourceName.TOKEN_BL, username)

  let record: string | null = null
  let lock = null
  while (!lock) {
    try {
      lock = await redlock.acquire([lockName], 20000) // LOCK
      try {
        record = await client.get(resource)
      } catch (err) {
        return TokenValidationResult.ERROR
      }
    } catch (err) {
      logger.error(String(err))
    } finally {
      if (lock) await lock.release() // UNLOCK
    }
  }
  let parsedUserData
  if (record !== null) {
    parsedUserData = JSON.parse(record)
  }
  if (parsedUserData?.includes(token)) {
    return TokenValidationResult.INVALID_TOKEN
  } else {
    return 0
  }
}
