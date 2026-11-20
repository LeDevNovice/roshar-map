import { beforeAll, describe, expect, test } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import baseEvents from '@/stores/events.json'
import { useMainStore } from '@/stores/main'

let store

beforeAll(() => {
  setActivePinia(createPinia())
  store = useMainStore()
})

describe('timeline', () => {
  test('contains every event once, numbered in order', () => {
    const ids = store.events.map(event => event.id)

    expect(new Set(ids).size).toBe(baseEvents.length)
    expect(ids.sort()).toEqual(baseEvents.map(event => event.id).sort())
    store.events.forEach((event, index) => expect(event.index).toBe(index))
  })

  test('places events from left to right in order', () => {
    for (let i = 1; i < store.events.length; i++) {
      const previous = store.events[i - 1]
      const event = store.events[i]

      expect(event.offset, `${previous.id} / ${event.id}`).toBeGreaterThanOrEqual(previous.offset)
    }
  })

  test('has one entry per year, in order, without overlaps', () => {
    const years = store.years.map(year => year.year)

    expect(new Set(years).size).toBe(years.length)
    for (let i = 1; i < store.years.length; i++) {
      const previous = store.years[i - 1]
      const year = store.years[i]

      expect(year.year).toBeGreaterThan(previous.year)
      expect(year.offset, `${previous.year} / ${year.year}`).toBeGreaterThanOrEqual(previous.offset + previous.size)
    }
  })

  test('covers the first and last years of the events', () => {
    const eventYears = baseEvents.map(event => event.date[0])

    expect(store.years[0].year).toBe(Math.min(...eventYears))
    expect(store.years[store.years.length - 1].year).toBe(Math.max(...eventYears))
  })

  const expectInsideItsYear = (event) => {
    const year = store.years.find(year => year.year === event.date[0])

    expect(year, event.id).toBeDefined()
    expect(event.offset, event.id).toBeGreaterThanOrEqual(year.offset)
    expect(event.offset, event.id).toBeLessThan(year.offset + year.size)
  }

  test('puts each event inside its year', () => {
    expect(store.events.map(event => event.id)).toContain('adolin-is-born')
    store.events.filter(event => event.id !== 'adolin-is-born').forEach(expectInsideItsYear)
  })

  // Known bug: the only event of 1150 is placed after the end of that year, so while scrolling
  // towards it the scrubber shows 1151 and 1152 before showing 1150.3.8.3
  test.fails('puts the birth of Adolin inside 1150', () => {
    expectInsideItsYear(store.events.find(event => event.id === 'adolin-is-born'))
  })

  test('splits every year with events into ten months', () => {
    const eventYears = new Set(baseEvents.map(event => event.date[0]))

    for (const year of store.years.filter(year => eventYears.has(year.year))) {
      expect(year.months.map(month => month.month), String(year.year)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    }
  })
})
