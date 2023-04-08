import { ObjectId } from 'mongodb'

interface Match {
  id: ObjectId
  nextMatchId: ObjectId | null
}

function generateGames (rondas: number): Match[][] {
  const roundLlist = []
  for (let ronda = 0; ronda < rondas; ronda++) {
    const gameLlist = []
    for (let game = 0; game < 2 ** ronda; game++) {
      const data = {
        id: new ObjectId(),
        nextMatchId: null,
        startTime: getDate(rondas - ronda)
      }
      gameLlist.push(data)
    }
    roundLlist.push([...gameLlist])
    gameLlist.length = 0
  }
  return roundLlist
}

function linkItems (roundLlist: Match[][]): void {
  for (let i = roundLlist.length - 1; i >= 0; i--) {
    if (i === 0) break
    for (let j = 0; j < roundLlist[i].length; j++) {
      if (j % 2 === 0) {
        roundLlist[i][j].nextMatchId = roundLlist[i - 1][j / 2 | 0].id
      } else {
        roundLlist[i][j].nextMatchId = roundLlist[i - 1][j / 2 | 0].id
      }
    }
  }
}

function getDate (n: number): Date {
  const today = new Date()
  const tomorrow = new Date(today)
  tomorrow.setDate(today.getDate() + n)
  return tomorrow
}

export function generateMatches (rounds: number): Match[] {
  const gameList = generateGames(rounds) // game list per rounds
  linkItems(gameList)
  return gameList.flat() // flatten array
}
