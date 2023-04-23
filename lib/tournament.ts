import { ObjectId } from 'mongodb'

interface Match {
  _id: ObjectId
  nextMatchId: ObjectId | null
}

function generateGames (rondas: number): Match[][] {
  const roundLlist = []
  for (let ronda = 0; ronda < rondas; ronda++) {
    const gameLlist = []
    for (let game = 0; game < 2 ** ronda; game++) {
      const data = {
        _id: new ObjectId(),
        nextMatchId: null,
        tournamentRoundText: `Ronda ${ronda + 1}`,
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
      if (j % 2 === 0) { // bug
        roundLlist[i][j].nextMatchId = roundLlist[i - 1][j / 2 | 0]._id
      } else {
        roundLlist[i][j].nextMatchId = roundLlist[i - 1][j / 2 | 0]._id
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
