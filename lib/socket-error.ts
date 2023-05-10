
export interface SocketError {
  code: number
  error: string
  message: string
}

// ---- 500 Internal Server Error ---- //

export const internalServerError = (message?: string): SocketError => {
  return {
    code: 500,
    error: 'INTERNAL_SERVER_ERROR',
    message: message ?? 'Internal server error.'
  }
}

// ---- 400 Bad Request ---- //

export const invalidParams = (message?: string): SocketError => {
  return {
    code: 400,
    error: 'INVALID_PARAMETER',
    message: message ?? 'Invalid parameters.'
  }
}

export const notYourTurn = (message?: string): SocketError => {
  return {
    code: 400,
    error: 'NOT_YOUR_TURN',
    message: message ?? 'It is not your turn to move.'
  }
}

export const illegalMove = (message?: string): SocketError => {
  return {
    code: 400,
    error: 'ILLEGAL_MOVE',
    message: message ?? 'Illegal move.'
  }
}

// ---- 401 Authorization Required ---- //

export const mustBeAuthenticated = (message?: string): SocketError => {
  return {
    code: 401,
    error: 'MUST_BE_AUTHENTICATED',
    message: message ?? 'This action requires an authenticated socket.'
  }
}

// ---- 403 Forbidden ---- //

export const notPlayerOfThisGame = (message?: string): SocketError => {
  return {
    code: 403,
    error: 'NOT_PLAYER_OF_THIS_GAME',
    message: message ?? 'This socket is not player of this game.'
  }
}

// ---- 405 Method Not Allowed ---- //

export const notSupportedAction = (message?: string): SocketError => {
  return {
    code: 405,
    error: 'NOT_SUPPORTED_ACTION',
    message: message ?? 'This action is not supported by the game type.'
  }
}

// ---- 409 Conflict ---- //

export const gameNotReady = (message?: string): SocketError => {
  return {
    code: 409,
    error: 'GAME_NOT_READY',
    message: message ?? 'This game is not ready yet.'
  }
}

export const gameAlreadyStarted = (message?: string): SocketError => {
  return {
    code: 409,
    error: 'GAME_ALREADY_STARTED',
    message: message ?? 'This game has already been started.'
  }
}

export const gameNotPaused = (message?: string): SocketError => {
  return {
    code: 409,
    error: 'GAME_NOT_PAUSED',
    message: message ?? 'This game is not paused.'
  }
}

export const gameAlreadyFinished = (message?: string): SocketError => {
  return {
    code: 409,
    error: 'GAME_ALREADY_FINISHED',
    message: message ?? 'This game has already been finished.'
  }
}

export const notPlaying = (message?: string): SocketError => {
  return {
    code: 409,
    error: 'NOT_PLAYING_ANY_GAME',
    message: message ?? 'This socket is not playing any game.'
  }
}

export const notWatching = (message?: string): SocketError => {
  return {
    code: 409,
    error: 'NOT_WATCHING_ANY_GAME',
    message: message ?? 'This socket is not watching any game.'
  }
}

export const alreadyJoined = (message?: string): SocketError => {
  return {
    code: 409,
    error: 'ALREADY_JOINED',
    message: message ?? 'This socket has already joined a room.'
  }
}

export const alreadyPlaying = (message?: string): SocketError => {
  return {
    code: 409,
    error: 'ALREADY_PLAYING',
    message: message ?? 'This socket is already playing or in queue.'
  }
}
