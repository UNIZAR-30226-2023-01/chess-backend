import { client, redlock } from '../config/database'

export const invalidateToken = async (
  username: string,
  token: any
): Promise<void> => {
  const blacklist = 'token-blacklist-' + username
  const expTime = 60 * 60 * 5 // segundos de expiracion

  let lock = await redlock.acquire([blacklist + '-lock'], 5000) // LOCK
  try {
    const record = await client.get(blacklist)
    lock = await lock.extend(5000) // EXTEND
    console.log('Record: ', record)

    if (record !== null) {
      const parsedData = JSON.parse(record)
      parsedData.push(token)
      await client.setex(blacklist, expTime, JSON.stringify(parsedData))

      console.log('Data: ', parsedData)
    } else {
      const blacklistedData = [token]

      await client.setex(blacklist, expTime, JSON.stringify(blacklistedData))
    }
  } finally {
    await lock.release() // UNLOCK
  }
}

export const validateToken = async (
  username: string,
  token: any
): Promise<number> => {
  const blacklist = 'token-blacklist-' + username

  let record: string | null = null
  const lock = await redlock.acquire([blacklist + '-lock'], 5000) // LOCK
  try {
    record = await client.get(blacklist)
  } catch (err) {
    return 500
  } finally {
    await lock.release() // UNLOCK
  }
  let parsedUserData
  if (record !== null) {
    parsedUserData = JSON.parse(record)
  }
  if (parsedUserData?.includes(token)) {
    return 401
  } else {
    return 0
  }
}
