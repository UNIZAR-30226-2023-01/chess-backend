export enum ResourceName {
  LOCK = 'lock',
  ROOM = 'room',
  TOKEN_BL = 'token-blacklist',
  PLAYER_Q = 'player-queue',
  RESTORE_Q = 'restore-game-queue'
}

export const compose = (prefix: string, ...sufix: string[]): string => {
  let res = prefix
  for (const s of sufix) {
    res = res + ':' + s
  }
  return res
}

export const composeLock = (prefix: string, ...sufix: string[]): string => {
  return compose(prefix, ...sufix) + ResourceName.LOCK
}
