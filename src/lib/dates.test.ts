import { describe, expect, it } from 'vitest'
import { addMonths, buildGrid, keyOf, labelOf, parseKey } from './dates'
import { parseData } from './storage'

describe('buildGrid', () => {
  it('handles leap-year February 2024', () => {
    const grid = buildGrid(2024, 1, false)
    const inMonth = grid.filter((c) => c.inMonth)
    expect(inMonth).toHaveLength(29)
    expect(inMonth[0].key).toBe('2024-02-01')
    expect(inMonth[28].key).toBe('2024-02-29')
    expect(grid.length % 7).toBe(0)
  })

  it('gives non-leap February 28 days', () => {
    const inMonth = buildGrid(2025, 1, false).filter((c) => c.inMonth)
    expect(inMonth).toHaveLength(28)
  })

  it('aligns to Monday week start', () => {
    // June 2026 starts on a Monday → no leading cells
    const grid = buildGrid(2026, 5, true)
    expect(grid[0].key).toBe('2026-06-01')
    expect(grid[0].dow).toBe(1)
    expect(grid).toHaveLength(35)
  })

  it('leads with the previous month for Sunday week start', () => {
    const grid = buildGrid(2026, 5, false)
    expect(grid[0].key).toBe('2026-05-31')
    expect(grid[0].dow).toBe(0)
    expect(grid[0].inMonth).toBe(false)
  })

  it('keeps every grid a whole number of weeks starting on the week start', () => {
    for (const monday of [true, false]) {
      for (let m = 0; m < 12; m++) {
        const grid = buildGrid(2026, m, monday)
        expect(grid.length % 7).toBe(0)
        expect(grid[0].dow).toBe(monday ? 1 : 0)
        expect(grid[grid.length - 1].dow).toBe(monday ? 0 : 6)
      }
    }
  })
})

describe('addMonths', () => {
  it('rolls December over to January', () => {
    expect(addMonths({ y: 2025, m: 11 }, 1)).toEqual({ y: 2026, m: 0 })
  })

  it('rolls January back to December', () => {
    expect(addMonths({ y: 2026, m: 0 }, -1)).toEqual({ y: 2025, m: 11 })
  })

  it('handles jumps across year boundaries', () => {
    expect(addMonths({ y: 2026, m: 10 }, 4)).toEqual({ y: 2027, m: 2 })
    expect(addMonths({ y: 2026, m: 1 }, -14)).toEqual({ y: 2024, m: 11 })
  })
})

describe('date keys', () => {
  it('round-trips through keyOf/parseKey with zero padding', () => {
    expect(keyOf(2026, 0, 3)).toBe('2026-01-03')
    expect(parseKey(keyOf(2026, 5, 10))).toEqual({ y: 2026, m: 5, d: 10 })
  })

  it('formats the detail label', () => {
    expect(labelOf('2026-06-10')).toBe('6/10 (Wed)')
  })
})

describe('parseData (storage backward compatibility)', () => {
  it('keeps legacy {e, n} entries from the prototype', () => {
    const data = parseData('{"2026-06-10":{"e":["🌙","💤"],"n":"night shift"}}')
    expect(data['2026-06-10']).toEqual({ e: ['🌙', '💤'], n: 'night shift' })
  })

  it('preserves gId on synced entries', () => {
    const data = parseData('{"2026-06-11":{"e":[],"n":"x","gId":"abc123"}}')
    expect(data['2026-06-11']).toEqual({ e: [], n: 'x', gId: 'abc123' })
  })

  it('preserves the day color and rejects non-hex values', () => {
    const data = parseData('{"a":{"e":[],"n":"","c":"#8FBA9B"},"b":{"e":[],"n":"","c":"red"}}')
    expect(data.a).toEqual({ e: [], n: '', c: '#8FBA9B' })
    expect(data.b).toEqual({ e: [], n: '' })
  })

  it('sanitizes malformed values instead of crashing', () => {
    const data = parseData('{"a":5,"2026-06-12":{"e":["🌙",3],"n":2}}')
    expect(data.a).toBeUndefined()
    expect(data['2026-06-12']).toEqual({ e: ['🌙'], n: '' })
  })

  it('returns an empty object for garbage input', () => {
    expect(parseData('not json')).toEqual({})
    expect(parseData('[1,2]')).toEqual({})
    expect(parseData(null)).toEqual({})
  })
})
