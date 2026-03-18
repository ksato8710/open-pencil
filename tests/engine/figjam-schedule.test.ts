import { describe, test, expect, beforeAll, setDefaultTimeout } from 'bun:test'

import {
  parseFigFile,
  exportFigFile,
  initCodec,
  SceneGraph,
} from '@open-pencil/core'

import { createSchedule } from '../../packages/core/src/figjam/schedule'

setDefaultTimeout(30_000)

beforeAll(async () => {
  await initCodec()
})

describe('FigJam schedule / Gantt chart', () => {
  test('basic schedule: 3 activities over 2 months', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    const ids = createSchedule(graph, page.id, {
      startDate: '2026-04-01',
      endDate: '2026-05-31',
      title: 'Q2 Plan',
      activities: [
        { name: 'Design', startDate: '2026-04-01', endDate: '2026-04-20' },
        { name: 'Develop', startDate: '2026-04-15', endDate: '2026-05-15' },
        { name: 'Test', startDate: '2026-05-10', endDate: '2026-05-30' },
      ],
    })

    expect(ids.length).toBeGreaterThan(0)

    // Should have: title + 2 month headers + week headers + 3 activity bars
    // Title = 1, months (4月, 5月) = 2, activity bars = 3, plus week headers
    const allNodes = [...graph.getAllNodes()]
    const frames = allNodes.filter(n => n.type === 'FRAME')
    const bars = allNodes.filter(n => n.type === 'ROUNDED_RECTANGLE')
    const texts = allNodes.filter(n => n.type === 'TEXT')

    // 3 activity bars
    expect(bars).toHaveLength(3)

    // Text nodes for labels: title + months + weeks + activities
    expect(texts.length).toBeGreaterThanOrEqual(6) // at minimum: title + 2 months + 3 bars

    // Activity bar names
    const barNames = bars.map(b => b.name)
    expect(barNames).toContain('Design')
    expect(barNames).toContain('Develop')
    expect(barNames).toContain('Test')
  })

  test('full project schedule: 2026-03-18 to 2026-09-30', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    const activities = [
      { name: 'リサーチ・要件定義', startDate: '2026-03-18', endDate: '2026-04-15' },
      { name: 'UIデザイン', startDate: '2026-04-01', endDate: '2026-05-15' },
      { name: 'プロトタイプ', startDate: '2026-05-01', endDate: '2026-06-15' },
      { name: 'フロントエンド開発', startDate: '2026-06-01', endDate: '2026-07-31' },
      { name: 'バックエンド開発', startDate: '2026-06-15', endDate: '2026-08-15' },
      { name: 'テスト・QA', startDate: '2026-08-01', endDate: '2026-09-15' },
      { name: 'リリース準備', startDate: '2026-09-01', endDate: '2026-09-30' },
    ]

    const ids = createSchedule(graph, page.id, {
      startDate: '2026-03-18',
      endDate: '2026-09-30',
      title: 'プロジェクトスケジュール',
      activities,
    })

    expect(ids.length).toBeGreaterThan(0)

    const allNodes = [...graph.getAllNodes()]
    const bars = allNodes.filter(n => n.type === 'ROUNDED_RECTANGLE')

    // 7 activity bars
    expect(bars).toHaveLength(7)

    // Verify all activity names present
    const barNames = bars.map(b => b.name)
    for (const act of activities) {
      expect(barNames).toContain(act.name)
    }

    // Verify title exists
    const titleFrame = allNodes.find(n => n.name === 'プロジェクトスケジュール' && n.type === 'FRAME')
    expect(titleFrame).toBeDefined()
  })

  test('month headers span correct widths', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    // April has 30 days, May has 31 days
    createSchedule(graph, page.id, {
      startDate: '2026-04-01',
      endDate: '2026-06-01',
      activities: [
        { name: 'Task', startDate: '2026-04-01', endDate: '2026-04-10' },
      ],
    })

    const allNodes = [...graph.getAllNodes()]
    const frames = allNodes.filter(n => n.type === 'FRAME')

    // Find month headers by name
    const april = frames.find(f => f.name === '4月')
    const may = frames.find(f => f.name === '5月')

    expect(april).toBeDefined()
    expect(may).toBeDefined()

    // DAY_WIDTH = 20
    expect(april!.width).toBe(30 * 20) // April = 30 days
    expect(may!.width).toBe(31 * 20)   // May = 31 days
  })

  test('activity bars positioned correctly based on dates', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    createSchedule(graph, page.id, {
      startDate: '2026-04-01',
      endDate: '2026-05-01',
      activities: [
        { name: 'First', startDate: '2026-04-01', endDate: '2026-04-11' },
        { name: 'Second', startDate: '2026-04-11', endDate: '2026-04-21' },
      ],
    })

    const allNodes = [...graph.getAllNodes()]
    const bars = allNodes.filter(n => n.type === 'ROUNDED_RECTANGLE')

    const first = bars.find(b => b.name === 'First')!
    const second = bars.find(b => b.name === 'Second')!

    // DAY_WIDTH = 20
    // First starts at day 0 → x = 0
    expect(first.x).toBe(0)
    expect(first.width).toBe(10 * 20) // 10 days

    // Second starts at day 10 → x = 200
    expect(second.x).toBe(10 * 20)
    expect(second.width).toBe(10 * 20) // 10 days
  })

  test('roundtrip: export → re-import preserves all nodes', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    createSchedule(graph, page.id, {
      startDate: '2026-04-01',
      endDate: '2026-05-31',
      title: 'Roundtrip Test',
      activities: [
        { name: 'Alpha', startDate: '2026-04-01', endDate: '2026-04-15' },
        { name: 'Beta', startDate: '2026-04-15', endDate: '2026-05-01' },
        { name: 'Gamma', startDate: '2026-05-01', endDate: '2026-05-20' },
      ],
    })

    const exported = await exportFigFile(graph)
    const reimported = await parseFigFile(exported.buffer as ArrayBuffer)

    const origNodes = [...graph.getAllNodes()]
    const reimNodes = [...reimported.getAllNodes()]

    // Count by type
    const origFrames = origNodes.filter(n => n.type === 'FRAME').length
    const reimFrames = reimNodes.filter(n => n.type === 'FRAME').length
    expect(reimFrames).toBe(origFrames)

    const origBars = origNodes.filter(n => n.type === 'ROUNDED_RECTANGLE').length
    const reimBars = reimNodes.filter(n => n.type === 'ROUNDED_RECTANGLE').length
    expect(reimBars).toBe(origBars)

    const origTexts = origNodes.filter(n => n.type === 'TEXT').length
    const reimTexts = reimNodes.filter(n => n.type === 'TEXT').length
    expect(reimTexts).toBe(origTexts)

    // Verify activity bar names survived
    const barNames = reimNodes.filter(n => n.type === 'ROUNDED_RECTANGLE').map(n => n.name)
    expect(barNames).toContain('Alpha')
    expect(barNames).toContain('Beta')
    expect(barNames).toContain('Gamma')

    // Verify text content survived
    const textContents = reimNodes.filter(n => n.type === 'TEXT').map(n => n.text)
    expect(textContents).toContain('Alpha')
    expect(textContents).toContain('Beta')
    expect(textContents).toContain('Gamma')
    expect(textContents).toContain('Roundtrip Test')
  })

  test('custom colors and row override', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    createSchedule(graph, page.id, {
      startDate: '2026-04-01',
      endDate: '2026-05-01',
      activities: [
        { name: 'A', startDate: '2026-04-01', endDate: '2026-04-10', color: '#FF0000', row: 0 },
        { name: 'B', startDate: '2026-04-05', endDate: '2026-04-15', color: '#00FF00', row: 0 },
      ],
    })

    const allNodes = [...graph.getAllNodes()]
    const bars = allNodes.filter(n => n.type === 'ROUNDED_RECTANGLE')

    expect(bars).toHaveLength(2)

    // Both on same row (row override = 0), so same Y
    const a = bars.find(b => b.name === 'A')!
    const b = bars.find(b => b.name === 'B')!
    expect(a.y).toBe(b.y)

    // Custom colors applied
    expect(a.fills?.[0]?.color?.r).toBeCloseTo(1, 1)
    expect(a.fills?.[0]?.color?.g).toBeCloseTo(0, 1)
  })
})
