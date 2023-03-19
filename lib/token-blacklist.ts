import { client, redlock } from '@config/database'
import { composeLock, ResourceName, compose } from '@lib/namespaces'

export enum TokenValidationResult {
  OK = 0,
  INVALID_TOKEN = 1,
  ERROR = 2
}

export const invalidateToken = async (
  username: string,
  token: any
): Promise<void> => {
  const expTime = 60 * 60 * 5 // segundos de expiracion

  const lockName = composeLock(ResourceName.TOKEN_BL, username)
  const resource = compose(ResourceName.TOKEN_BL, username)

  let lock = await redlock.acquire([lockName], 5000) // LOCK
  try {
    const record = await client.get(resource)
    lock = await lock.extend(5000) // EXTEND
    console.log('Record: ', record)

    if (record !== null) {
      const parsedData = JSON.parse(record)
      parsedData.push(token)
      await client.setex(resource, expTime, JSON.stringify(parsedData))

      console.log('Data: ', parsedData)
    } else {
      const blacklistedData = [token]

      await client.setex(resource, expTime, JSON.stringify(blacklistedData))
    }
  } finally {
    await lock.release() // UNLOCK
  }
}

export const validateToken = async (
  username: string,
  token: any
): Promise<number> => {
  const lockName = composeLock(ResourceName.TOKEN_BL, username)
  const resource = compose(ResourceName.TOKEN_BL, username)

  let record: string | null = null
  const lock = await redlock.acquire([lockName], 5000) // LOCK
  try {
    record = await client.get(resource)
  } catch (err) {
    return TokenValidationResult.ERROR
  } finally {
    await lock.release() // UNLOCK
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
