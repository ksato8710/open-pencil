import { describe, test, expect } from 'bun:test'

import {
  SceneGraph,
} from '@open-pencil/core'

function makeGraph(): { graph: SceneGraph; pageId: string } {
  const graph = new SceneGraph()
  const page = graph.getPages()[0]
  return { graph, pageId: page.id }
}

describe('FigJam support', () => {
  describe('SceneGraph.createSticky', () => {
    test('creates a sticky node with text child', () => {
      const { graph, pageId } = makeGraph()
      const sticky = graph.createSticky(pageId, 'Hello FigJam', 100, 200)

      expect(sticky.type).toBe('STICKY')
      expect(sticky.name).toBe('Sticky')
      expect(sticky.x).toBe(100)
      expect(sticky.y).toBe(200)
      expect(sticky.width).toBe(200)
      expect(sticky.height).toBe(200)
      expect(sticky.cornerRadius).toBe(8)
      expect(sticky.fills).toHaveLength(1)
      expect(sticky.fills![0].type).toBe('SOLID')

      // Check text child
      const children = graph.getChildren(sticky.id)
      expect(children).toHaveLength(1)
      expect(children[0].type).toBe('TEXT')
      expect(children[0].text).toBe('Hello FigJam')
      expect(children[0].textAlignHorizontal).toBe('CENTER')
    })

    test('uses default yellow color', () => {
      const { graph, pageId } = makeGraph()
      const sticky = graph.createSticky(pageId, 'Test')

      const fill = sticky.fills![0]
      expect(fill.color!.r).toBeCloseTo(254 / 255, 2)
      expect(fill.color!.g).toBeCloseTo(243 / 255, 2)
      expect(fill.color!.b).toBeCloseTo(199 / 255, 2)
    })

    test('accepts custom color', () => {
      const { graph, pageId } = makeGraph()
      const sticky = graph.createSticky(pageId, 'Green', 0, 0, '#D1FAE5')

      const fill = sticky.fills![0]
      expect(fill.color!.r).toBeCloseTo(209 / 255, 2)
      expect(fill.color!.g).toBeCloseTo(250 / 255, 2)
      expect(fill.color!.b).toBeCloseTo(229 / 255, 2)
    })
  })

  describe('SceneGraph.createShapeWithText', () => {
    test('creates a shape with text child', () => {
      const { graph, pageId } = makeGraph()
      const shape = graph.createShapeWithText(pageId, 'ELLIPSE', 'Decision', 300, 400)

      expect(shape.type).toBe('SHAPE_WITH_TEXT')
      expect(shape.x).toBe(300)
      expect(shape.y).toBe(400)
      expect(shape.width).toBe(200)
      expect(shape.height).toBe(200)
      // Ellipse has no corner radius
      expect(shape.cornerRadius).toBe(0)

      const children = graph.getChildren(shape.id)
      expect(children).toHaveLength(1)
      expect(children[0].type).toBe('TEXT')
      expect(children[0].text).toBe('Decision')
    })

    test('creates rounded rectangle with corner radius', () => {
      const { graph, pageId } = makeGraph()
      const shape = graph.createShapeWithText(pageId, 'ROUNDED_RECTANGLE', 'Step 1', 0, 0, 300, 150)

      expect(shape.cornerRadius).toBe(12)
      expect(shape.width).toBe(300)
      expect(shape.height).toBe(150)
    })
  })

  describe('NodeType includes STICKY', () => {
    test('STICKY is a valid container type', () => {
      const { graph, pageId } = makeGraph()
      // Should not throw — STICKY should be a valid node type
      const node = graph.createSticky(pageId, 'Test')
      expect(node).toBeDefined()
      expect(node.id).toBeTruthy()
    })
  })
})
