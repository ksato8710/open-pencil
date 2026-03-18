import type { SceneGraph } from '../scene-graph'

export interface JourneyStage {
  name: string
  actions: string[]
  thoughts: string
  emotion: number       // 1-5 (1=frustrated, 3=neutral, 5=delighted)
  painPoints?: string[]
  opportunities?: string[]
  touchpoints?: string[]
}

export interface JourneyMapOptions {
  title?: string
  personaName?: string
  stages: JourneyStage[]
  x?: number
  y?: number
}

const STAGE_WIDTH = 220
const ROW_HEIGHT = 60
const LABEL_WIDTH = 120
const GAP = 4
const STICKY_SIZE = 200

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  }
}

const STAGE_COLORS = [
  '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#EF4444',
]

const EMOTION_COLORS: Record<number, string> = {
  1: '#EF4444', // red - frustrated
  2: '#F97316', // orange
  3: '#EAB308', // yellow - neutral
  4: '#84CC16', // lime
  5: '#22C55E', // green - delighted
}

const ROW_LABELS = ['Stage', 'Actions', 'Thoughts', 'Emotions', 'Pain Points', 'Opportunities']

function createRowLabel(
  graph: SceneGraph,
  parentId: string,
  text: string,
  x: number,
  y: number
): void {
  graph.createNode('TEXT', parentId, {
    name: `Label: ${text}`,
    text,
    x,
    y: y + (ROW_HEIGHT - 14) / 2,
    width: LABEL_WIDTH - 8,
    fontSize: 12,
    fontWeight: 700,
    fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, opacity: 1, visible: true }],
    textAutoResize: 'HEIGHT',
  })
}

export function createJourneyMap(
  graph: SceneGraph,
  parentId: string,
  options: JourneyMapOptions
): string[] {
  const ids: string[] = []
  const originX = options.x ?? 0
  const originY = options.y ?? 0
  const stages = options.stages
  const stageCount = stages.length

  let currentY = originY

  // --- Title ---
  if (options.title || options.personaName) {
    const titleText = [options.title, options.personaName ? `Persona: ${options.personaName}` : '']
      .filter(Boolean)
      .join(' — ')
    const titleRgb = hexToRgb('#374151')
    const titleFrame = graph.createNode('FRAME', parentId, {
      name: titleText,
      x: originX,
      y: currentY,
      width: LABEL_WIDTH + stageCount * (STAGE_WIDTH + GAP),
      height: 36,
      cornerRadius: 4,
      topLeftRadius: 4,
      topRightRadius: 4,
      bottomRightRadius: 4,
      bottomLeftRadius: 4,
      fills: [{ type: 'SOLID', color: { ...titleRgb, a: 1 }, opacity: 1, visible: true }],
      layoutMode: 'VERTICAL',
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
    })
    graph.createNode('TEXT', titleFrame.id, {
      name: 'TitleText',
      text: titleText,
      fontSize: 16,
      fontWeight: 700,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
      textAutoResize: 'HEIGHT',
      layoutAlignSelf: 'STRETCH',
      textAlignHorizontal: 'CENTER',
    })
    ids.push(titleFrame.id)
    currentY += 36 + GAP
  }

  const contentStartX = originX + LABEL_WIDTH

  // Row 0: Stage headers
  const row0Y = currentY
  createRowLabel(graph, parentId, ROW_LABELS[0], originX, row0Y)
  for (let i = 0; i < stageCount; i++) {
    const stage = stages[i]
    const color = STAGE_COLORS[i % STAGE_COLORS.length]
    const rgb = hexToRgb(color)
    const frame = graph.createNode('FRAME', parentId, {
      name: `Stage: ${stage.name}`,
      x: contentStartX + i * (STAGE_WIDTH + GAP),
      y: row0Y,
      width: STAGE_WIDTH,
      height: ROW_HEIGHT,
      cornerRadius: 6,
      topLeftRadius: 6,
      topRightRadius: 6,
      bottomRightRadius: 6,
      bottomLeftRadius: 6,
      fills: [{ type: 'SOLID', color: { ...rgb, a: 1 }, opacity: 1, visible: true }],
      layoutMode: 'VERTICAL',
      primaryAxisAlign: 'CENTER',
      counterAxisAlign: 'CENTER',
    })
    graph.createNode('TEXT', frame.id, {
      name: 'StageName',
      text: stage.name,
      fontSize: 14,
      fontWeight: 700,
      fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
      textAutoResize: 'HEIGHT',
      textAlignHorizontal: 'CENTER',
      layoutAlignSelf: 'STRETCH',
    })
    ids.push(frame.id)
  }
  currentY = row0Y + ROW_HEIGHT + GAP

  // Row 1: Actions
  const row1Y = currentY
  createRowLabel(graph, parentId, ROW_LABELS[1], originX, row1Y)
  for (let i = 0; i < stageCount; i++) {
    const stage = stages[i]
    const actionText = stage.actions.map(a => `• ${a}`).join('\n')
    graph.createNode('TEXT', parentId, {
      name: `Actions: ${stage.name}`,
      text: actionText || '—',
      x: contentStartX + i * (STAGE_WIDTH + GAP),
      y: row1Y + 4,
      width: STAGE_WIDTH,
      fontSize: 11,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, opacity: 1, visible: true }],
      textAutoResize: 'HEIGHT',
    })
    ids.push(stage.name) // placeholder; actual id tracked via stage headers
  }
  currentY = row1Y + ROW_HEIGHT + GAP

  // Row 2: Thoughts (yellow stickies)
  const row2Y = currentY
  createRowLabel(graph, parentId, ROW_LABELS[2], originX, row2Y)
  for (let i = 0; i < stageCount; i++) {
    const stage = stages[i]
    const sticky = graph.createSticky(
      parentId,
      stage.thoughts,
      contentStartX + i * (STAGE_WIDTH + GAP) + (STAGE_WIDTH - STICKY_SIZE) / 2,
      row2Y,
      '#FEF3C7' // yellow
    )
    ids.push(sticky.id)
  }
  currentY = row2Y + STICKY_SIZE + GAP

  // Row 3: Emotions (colored circles with connectors)
  const row3Y = currentY
  createRowLabel(graph, parentId, ROW_LABELS[3], originX, row3Y)
  const emotionNodeIds: string[] = []
  const MARKER_SIZE = 36
  for (let i = 0; i < stageCount; i++) {
    const stage = stages[i]
    const emotionColor = EMOTION_COLORS[stage.emotion] ?? EMOTION_COLORS[3]
    const rgb = hexToRgb(emotionColor)
    const cx = contentStartX + i * (STAGE_WIDTH + GAP) + STAGE_WIDTH / 2 - MARKER_SIZE / 2
    const cy = row3Y + (ROW_HEIGHT - MARKER_SIZE) / 2
    const marker = graph.createNode('ELLIPSE', parentId, {
      name: `Emotion: ${stage.emotion}`,
      x: cx,
      y: cy,
      width: MARKER_SIZE,
      height: MARKER_SIZE,
      fills: [{ type: 'SOLID', color: { ...rgb, a: 1 }, opacity: 1, visible: true }],
    })
    ids.push(marker.id)
    emotionNodeIds.push(marker.id)
  }

  // Connect emotion markers with lines
  for (let i = 0; i < emotionNodeIds.length - 1; i++) {
    const startX = contentStartX + i * (STAGE_WIDTH + GAP) + STAGE_WIDTH / 2 + MARKER_SIZE / 2
    const startY = row3Y + ROW_HEIGHT / 2
    const endX = contentStartX + (i + 1) * (STAGE_WIDTH + GAP) + STAGE_WIDTH / 2 - MARKER_SIZE / 2
    const endY = row3Y + ROW_HEIGHT / 2
    const connector = graph.createConnector(parentId, startX, startY, endX, endY, 'STRAIGHT')
    graph.updateNode(connector.id, {
      connectorStartNodeId: emotionNodeIds[i],
      connectorEndNodeId: emotionNodeIds[i + 1],
    })
    ids.push(connector.id)
  }
  currentY = row3Y + ROW_HEIGHT + GAP

  // Row 4: Pain Points (pink stickies)
  const row4Y = currentY
  createRowLabel(graph, parentId, ROW_LABELS[4], originX, row4Y)
  for (let i = 0; i < stageCount; i++) {
    const stage = stages[i]
    const painText = stage.painPoints?.map(p => `• ${p}`).join('\n') || '—'
    const sticky = graph.createSticky(
      parentId,
      painText,
      contentStartX + i * (STAGE_WIDTH + GAP) + (STAGE_WIDTH - STICKY_SIZE) / 2,
      row4Y,
      '#FCE7F3' // pink
    )
    ids.push(sticky.id)
  }
  currentY = row4Y + STICKY_SIZE + GAP

  // Row 5: Opportunities (green stickies)
  const row5Y = currentY
  createRowLabel(graph, parentId, ROW_LABELS[5], originX, row5Y)
  for (let i = 0; i < stageCount; i++) {
    const stage = stages[i]
    const oppText = stage.opportunities?.map(o => `• ${o}`).join('\n') || '—'
    const sticky = graph.createSticky(
      parentId,
      oppText,
      contentStartX + i * (STAGE_WIDTH + GAP) + (STAGE_WIDTH - STICKY_SIZE) / 2,
      row5Y,
      '#D1FAE5' // green
    )
    ids.push(sticky.id)
  }

  return ids
}
