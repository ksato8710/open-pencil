import type { SceneNode, SceneGraph } from '../scene-graph'
import type { Canvas } from 'canvaskit-wasm'
import type { SkiaRenderer } from './renderer'

export function renderConnector(
  r: SkiaRenderer,
  canvas: Canvas,
  node: SceneNode,
  graph: SceneGraph
): void {
  const startX = (node.connectorStartPosition?.x ?? node.x) - node.x
  const startY = (node.connectorStartPosition?.y ?? node.y) - node.y
  const endX = (node.connectorEndPosition?.x ?? (node.x + node.width)) - node.x
  const endY = (node.connectorEndPosition?.y ?? (node.y + node.height)) - node.y

  const path = new r.ck.Path()
  if (node.connectorLineStyle === 'ELBOWED') {
    path.moveTo(startX, startY)
    path.lineTo(endX, startY)
    path.lineTo(endX, endY)
  } else {
    path.moveTo(startX, startY)
    path.lineTo(endX, endY)
  }

  if (node.strokes.length > 0) {
    const stroke = node.strokes[0]
    const sc = r.resolveStrokeColor(stroke, 0, node, graph)
    r.strokePaint.setColor(r.ck.Color4f(sc.r, sc.g, sc.b, sc.a))
    r.strokePaint.setStrokeWidth(stroke.weight)
    r.strokePaint.setAlphaf(stroke.opacity)
  } else {
    r.strokePaint.setColor(r.ck.Color4f(0, 0, 0, 1))
    r.strokePaint.setStrokeWidth(2)
    r.strokePaint.setAlphaf(1)
  }

  canvas.drawPath(path, r.strokePaint)

  // Arrowhead at end point
  const arrowSize = 8
  let angle: number
  if (node.connectorLineStyle === 'ELBOWED') {
    angle = endY > startY ? Math.PI / 2 : -Math.PI / 2
  } else {
    angle = Math.atan2(endY - startY, endX - startX)
  }
  const a1x = endX - arrowSize * Math.cos(angle - Math.PI / 6)
  const a1y = endY - arrowSize * Math.sin(angle - Math.PI / 6)
  const a2x = endX - arrowSize * Math.cos(angle + Math.PI / 6)
  const a2y = endY - arrowSize * Math.sin(angle + Math.PI / 6)

  const arrowPath = new r.ck.Path()
  arrowPath.moveTo(endX, endY)
  arrowPath.lineTo(a1x, a1y)
  arrowPath.moveTo(endX, endY)
  arrowPath.lineTo(a2x, a2y)
  canvas.drawPath(arrowPath, r.strokePaint)

  arrowPath.delete()
  path.delete()
}
