import { describe, expect, test } from 'vitest'
import events from '@/stores/events.json'
import {
  clamp01,
  compareEvents,
  formatDate,
  getTimestampInYear,
  inverseLerp,
  lerp,
  smootherstep
} from '@/utils'

describe('formatDate', () => {
  test('joins the known date components with dots', () => {
    expect(formatDate([1173, 7, 9, 3])).toBe('1173.7.9.3')
    expect(formatDate([1167, 10])).toBe('1167.10')
    expect(formatDate([-20000])).toBe('-20000')
  })

  test('leaves out unknown components', () => {
    expect(formatDate([1174, Number.NaN, Number.NaN])).toBe('1174')
  })
})

describe('getTimestampInYear', () => {
  // A Rosharan year has 10 months of 10 weeks, each week has 5 days
  test('counts days from the start of the year', () => {
    expect(getTimestampInYear([0, 0, 0])).toBe(0)
    expect(getTimestampInYear([0, 0, 4])).toBe(4)
    expect(getTimestampInYear([0, 1, 0])).toBe(5)
    expect(getTimestampInYear([1, 0, 0])).toBe(50)
    expect(getTimestampInYear([9, 9, 4])).toBe(499)
  })
})

describe('interpolation', () => {
  test('lerp moves from a to b', () => {
    expect(lerp(10, 20, 0)).toBe(10)
    expect(lerp(10, 20, 0.25)).toBe(12.5)
    expect(lerp(10, 20, 1)).toBe(20)
  })

  test('inverseLerp undoes lerp and stays between 0 and 1', () => {
    for (const t of [0, 0.1, 0.5, 0.9, 1]) {
      expect(inverseLerp(1120, 1130, lerp(1120, 1130, t))).toBeCloseTo(t)
    }
    expect(inverseLerp(1120, 1130, 1100)).toBe(0)
    expect(inverseLerp(1120, 1130, 1150)).toBe(1)
  })

  test('clamp01 keeps values between 0 and 1', () => {
    expect(clamp01(-2)).toBe(0)
    expect(clamp01(0.3)).toBe(0.3)
    expect(clamp01(7)).toBe(1)
  })

  test('smootherstep eases from 0 to 1', () => {
    expect(smootherstep(-1)).toBe(0)
    expect(smootherstep(0)).toBe(0)
    expect(smootherstep(0.5)).toBe(0.5)
    expect(smootherstep(1)).toBe(1)
    expect(smootherstep(2)).toBe(1)
    expect(smootherstep(0.25) + smootherstep(0.75)).toBeCloseTo(1)
    expect(smootherstep(0.05)).toBeLessThan(0.01)

    let previous = 0
    for (let t = 0.05; t <= 1; t += 0.05) {
      expect(smootherstep(t)).toBeGreaterThan(previous)
      previous = smootherstep(t)
    }
  })
})

describe('compareEvents', () => {
  const sorted = [...events].sort(compareEvents)

  // A missing component means the date is less precise, so it comes before any value
  const isNotAfter = (a, b) => {
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      if (a[i] === b[i]) {
        continue
      }
      if (a[i] === undefined) {
        return true
      }
      if (b[i] === undefined) {
        return false
      }
      return a[i] < b[i]
    }
    return true
  }

  test('sorts the timeline events chronologically', () => {
    for (let i = 1; i < sorted.length; i++) {
      expect(isNotAfter(sorted[i - 1].date, sorted[i].date), `${sorted[i - 1].id} / ${sorted[i].id}`).toBe(true)
    }
    expect(sorted[0].id).toBe('roshars-creation')
  })

  test('orders events of the same date by tie breaker', () => {
    const position = Object.fromEntries(sorted.map((event, index) => [event.id, index]))
    const tied = events.filter(event => event.tieBreaker !== undefined)

    for (const a of tied) {
      for (const b of tied) {
        if (a.date.join('.') === b.date.join('.') && a.tieBreaker < b.tieBreaker) {
          expect(position[a.id], `${a.id} / ${b.id}`).toBeLessThan(position[b.id])
        }
      }
    }
  })

  test('puts a month-only date before a more precise date in that month', () => {
    const ids = sorted.map(event => event.id)
    expect(ids).toContain('szeths-killing-spree-begins')
    expect(ids).toContain('kaladin-joins-bridge-four')
    expect(ids.indexOf('szeths-killing-spree-begins')).toBeLessThan(ids.indexOf('kaladin-joins-bridge-four'))
  })

  // Known bug: a date that extends another one compares as NaN
  test.fails('never returns NaN', () => {
    for (const a of events) {
      for (const b of events) {
        expect(Number.isNaN(compareEvents(a, b)), `${a.id} / ${b.id}`).toBe(false)
      }
    }
  })

  // Known bug: equal dates without tie breaker are both "before" each other
  // (pairs giving NaN are left to the test above)
  test.fails('gives opposite answers when the arguments are swapped', () => {
    for (const a of events) {
      for (const b of events) {
        const ab = compareEvents(a, b)
        const ba = compareEvents(b, a)

        if (a !== b && !Number.isNaN(ab) && !Number.isNaN(ba)) {
          expect(Math.sign(ab) + Math.sign(ba), `${a.id} / ${b.id}`).toBe(0)
        }
      }
    }
  })
})
