import { describe, expect, test } from 'vitest'
import locations from '@/stores/locations.json'
import { distance, project, unproject } from '@/projection'

// Map plane: x from -512 to 512, y from -256 to 256 (see Map.vue)
const toMapPosition = ({ x, y }) => ({ x: x - 512, y: 256 - y })

describe('project and unproject', () => {
  test('give back every location of the map', () => {
    const placed = locations.filter(location => location.coordinates !== undefined)
    expect(placed.length).toBeGreaterThan(50)

    for (const location of placed) {
      const position = toMapPosition(location.coordinates)
      const back = project(unproject(position))

      expect(back.x, location.id).toBeCloseTo(position.x, 6)
      expect(back.y, location.id).toBeCloseTo(position.y, 6)
    }
  })

  test('give back every point of the graticule', () => {
    // Same latitude and longitude range as layers/Graticule.js, in hundredths of pi
    for (let latD = -40; latD < 22; latD += 3) {
      for (let lngD = -55; lngD < 55; lngD += 5) {
        if (latD === -16 && lngD === 0) {
          continue // the centre itself, see below
        }

        const geo = { lat: Math.PI * 0.01 * latD, lng: Math.PI * 0.01 * lngD }
        const back = unproject(project(geo))

        expect(back.lat).toBeCloseTo(geo.lat, 9)
        expect(back.lng).toBeCloseTo(geo.lng, 9)
      }
    }
  })

  // Known bug: unproject divides by zero at the exact centre of the projection (16 degrees South)
  test.fails('give back the centre of the projection', () => {
    const centre = { lat: -Math.PI * 0.16, lng: 0 }
    const back = unproject(project(centre))

    expect(back.lat).toBeCloseTo(centre.lat, 9)
    expect(back.lng).toBeCloseTo(centre.lng, 9)
  })

  test('keep a step north pointing north', () => {
    // Map.vue finds north this way to orient the compass
    const geo = unproject({ x: 100, y: -50 })
    const north = project({ lat: geo.lat + 0.01, lng: geo.lng })

    expect(north.y).toBeGreaterThan(-50)
  })
})

describe('distance', () => {
  const a = { lat: 0.2, lng: -0.4 }
  const b = { lat: -0.3, lng: 0.9 }

  test('is zero from a point to itself and the same both ways', () => {
    expect(distance(a, a)).toBeCloseTo(0, 3)
    expect(distance(a, b)).toBeCloseTo(distance(b, a), 9)
  })

  test('is half the circumference of Roshar between opposite points', () => {
    // Radius of 5663.146 km, derived from a Brandon Sanderson answer at JordanCon 2018
    expect(distance({ lat: 0, lng: 0 }, { lat: 0, lng: Math.PI })).toBeCloseTo(Math.PI * 5663.146, 3)
  })

  test('follows the equator when both points are on it', () => {
    expect(distance({ lat: 0, lng: 0 }, { lat: 0, lng: 1 })).toBeCloseTo(5663.146, 3)
  })
})
