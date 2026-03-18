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

describe('FigJam roundtrip', () => {
  test('sticky node survives export → re-import', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createSticky(page.id, 'Roundtrip Test', 50, 75, '#D1FAE5')

    const exported = await exportFigFile(graph)
    const reimported = await parseFigFile(exported.buffer as ArrayBuffer)

    const allNodes = [...reimported.getAllNodes()]
    const sticky = allNodes.find((n) => n.type === 'STICKY')
    expect(sticky).toBeDefined()
    expect(sticky!.name).toBe('Sticky')
    expect(sticky!.x).toBe(50)
    expect(sticky!.y).toBe(75)

    // Check text child survived
    const children = reimported.getChildren(sticky!.id)
    const textChild = children.find((c) => c.type === 'TEXT')
    expect(textChild).toBeDefined()
    expect(textChild!.text).toBe('Roundtrip Test')
  })

  test('shape_with_text node survives export → re-import', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createShapeWithText(page.id, 'ROUNDED_RECTANGLE', 'Process Step', 100, 200, 300, 150)

    const exported = await exportFigFile(graph)
    const reimported = await parseFigFile(exported.buffer as ArrayBuffer)

    const allNodes = [...reimported.getAllNodes()]
    const shape = allNodes.find((n) => n.type === 'SHAPE_WITH_TEXT')
    expect(shape).toBeDefined()
    expect(shape!.width).toBe(300)
    expect(shape!.height).toBe(150)
  })

  test('connector node survives export → re-import', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createConnector(page.id, 50, 100, 350, 400, 'ELBOWED')

    const exported = await exportFigFile(graph)
    const reimported = await parseFigFile(exported.buffer as ArrayBuffer)

    const allNodes = [...reimported.getAllNodes()]
    const connector = allNodes.find((n) => n.type === 'CONNECTOR')
    expect(connector).toBeDefined()
    expect(connector!.name).toBe('Connector')
    expect(connector!.connectorStartPosition).toEqual({ x: 50, y: 100 })
    expect(connector!.connectorEndPosition).toEqual({ x: 350, y: 400 })
    expect(connector!.connectorLineStyle).toBe('ELBOWED')
  })

  test('multiple stickies with different colors', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]
    graph.createSticky(page.id, 'Yellow', 0, 0, '#FEF3C7')
    graph.createSticky(page.id, 'Green', 250, 0, '#D1FAE5')
    graph.createSticky(page.id, 'Blue', 500, 0, '#DBEAFE')

    const exported = await exportFigFile(graph)
    const reimported = await parseFigFile(exported.buffer as ArrayBuffer)

    const allNodes = [...reimported.getAllNodes()]
    const stickies = allNodes.filter((n) => n.type === 'STICKY')
    expect(stickies).toHaveLength(3)
  })
})
