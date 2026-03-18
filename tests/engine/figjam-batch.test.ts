import { describe, test, expect, beforeAll, setDefaultTimeout } from 'bun:test'

import {
  parseFigFile,
  exportFigFile,
  initCodec,
  SceneGraph,
} from '@open-pencil/core'

setDefaultTimeout(30_000)

beforeAll(async () => {
  await initCodec()
})

describe('FigJam batch operations', () => {
  test('bullet list → 10 sticky notes with grid layout', async () => {
    const ideas = [
      'AIエージェントのタスク自動分解',
      'MCP対応デザインツールの比較記事',
      'ユーザーインタビューの自動文字起こし',
      'プロダクトロードマップの可視化',
      'コード→デザイン変換パイプライン',
      'Figma代替OSSの動向まとめ',
      'LLMのコスト最適化ガイド',
      'CI/CDにAIレビューを組み込む方法',
      'デザイントークンの自動抽出',
      'AIペアプログラミングのベストプラクティス',
    ]
    const colors = ['#FEF3C7', '#D1FAE5', '#DBEAFE', '#FCE7F3', '#EDE9FE']
    const stickySize = 200
    const gap = 30
    const cols = 5

    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    ideas.forEach((text, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      graph.createSticky(
        page.id,
        text,
        col * (stickySize + gap),
        row * (stickySize + gap),
        colors[i % colors.length]
      )
    })

    // Export and re-import
    const exported = await exportFigFile(graph)
    const reimported = await parseFigFile(exported.buffer as ArrayBuffer)

    // Verify all 10 stickies survived
    const stickies = [...reimported.getAllNodes()].filter(n => n.type === 'STICKY')
    expect(stickies).toHaveLength(10)

    // Verify all texts are preserved
    const texts = [...reimported.getAllNodes()].filter(
      n => n.type === 'TEXT' && n.text && ideas.includes(n.text)
    )
    expect(texts).toHaveLength(10)

    // Verify grid layout: 5 columns × 2 rows
    const xs = stickies.map(s => s.x)
    const ys = stickies.map(s => s.y)
    const uniqueXs = [...new Set(xs)].sort((a, b) => a - b)
    const uniqueYs = [...new Set(ys)].sort((a, b) => a - b)
    expect(uniqueXs).toHaveLength(5) // 5 columns
    expect(uniqueYs).toHaveLength(2) // 2 rows

    // Verify colors cycle through 5 colors
    const fillColors = stickies.map(s => s.fills?.[0]?.color)
    expect(fillColors.every(c => c !== undefined)).toBe(true)
  })

  test('mixed board: stickies + shapes + connectors', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    // Create a simple flowchart
    const start = graph.createShapeWithText(page.id, 'ROUNDED_RECTANGLE', 'Start', 0, 0, 150, 80)
    const process1 = graph.createSticky(page.id, 'Process A', 250, 0, '#FEF3C7')
    const decision = graph.createShapeWithText(page.id, 'ELLIPSE', 'OK?', 550, 20, 120, 120)
    const end = graph.createShapeWithText(page.id, 'ROUNDED_RECTANGLE', 'End', 750, 0, 150, 80)

    // Connect them
    graph.createConnector(page.id, 150, 40, 250, 100, 'STRAIGHT')
    graph.createConnector(page.id, 450, 100, 550, 80, 'STRAIGHT')
    graph.createConnector(page.id, 670, 80, 750, 40, 'STRAIGHT')

    const exported = await exportFigFile(graph)
    const reimported = await parseFigFile(exported.buffer as ArrayBuffer)

    const allNodes = [...reimported.getAllNodes()]
    const shapes = allNodes.filter(n => n.type === 'SHAPE_WITH_TEXT')
    const stickies = allNodes.filter(n => n.type === 'STICKY')
    const connectors = allNodes.filter(n => n.type === 'CONNECTOR')

    expect(shapes).toHaveLength(3)
    expect(stickies).toHaveLength(1)
    expect(connectors).toHaveLength(3)
  })

  test('large batch: 50 stickies', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    const cols = 10

    for (let i = 0; i < 50; i++) {
      graph.createSticky(
        page.id,
        `Item ${i + 1}`,
        (i % cols) * 230,
        Math.floor(i / cols) * 230,
        ['#FEF3C7', '#D1FAE5', '#DBEAFE', '#FCE7F3', '#EDE9FE'][i % 5]
      )
    }

    const exported = await exportFigFile(graph)
    const reimported = await parseFigFile(exported.buffer as ArrayBuffer)

    const stickies = [...reimported.getAllNodes()].filter(n => n.type === 'STICKY')
    expect(stickies).toHaveLength(50)
  })
})
