import { date, number, object } from 'yup'
import { addMinutes, isAfter } from 'date-fns'

export const createTournament = object().shape({
  startTime: date().required()
    .test('is-15-min-later', 'La hora de inicio debe ser al menos 15 minutos después de la hora actual', function (value) {
      const now = new Date()
      const minStartTime = addMinutes(now, 15)
      return isAfter(value, minStartTime)
    }),
  rounds: number().integer().positive().required(),
  matchProps: object().shape({
    time: number().required(),
    increment: number().integer().positive().required()
  })
})
