import type { SceneGraph } from '../scene-graph'

export interface PersonaData {
  name: string
  role: string
  age?: number
  location?: string
  bio?: string
  quote?: string
  goals?: string[]
  frustrations?: string[]
  avatarColor?: string
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  }
}

const CARD_WIDTH = 400
const CARD_HEIGHT = 500
const AVATAR_SIZE = 60
const PADDING = 16
const SECTION_GAP = 8

function createBioSection(graph: SceneGraph, cardId: string, data: PersonaData): void {
  if (!data.bio && !data.quote) return

  const bioSection = graph.createNode('FRAME', cardId, {
    name: 'Bio',
    width: CARD_WIDTH - PADDING * 2,
    fills: [],
    layoutMode: 'VERTICAL',
    primaryAxisAlign: 'MIN',
    counterAxisAlign: 'MIN',
    itemSpacing: 6,
    layoutAlignSelf: 'STRETCH',
  })

  if (data.bio) {
    graph.createNode('TEXT', bioSection.id, {
      name: 'BioText',
      text: data.bio,
      fontSize: 13,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, opacity: 1, visible: true }],
      textAutoResize: 'HEIGHT',
      layoutAlignSelf: 'STRETCH',
    })
  }

  if (data.quote) {
    graph.createNode('TEXT', bioSection.id, {
      name: 'Quote',
      text: `「${data.quote}」`,
      fontSize: 13,
      fills: [{ type: 'SOLID', color: { r: 0.35, g: 0.35, b: 0.35, a: 1 }, opacity: 1, visible: true }],
      textAutoResize: 'HEIGHT',
      layoutAlignSelf: 'STRETCH',
    })
  }
}

function createListColumn(
  graph: SceneGraph,
  parentId: string,
  label: string,
  items: string[],
  labelColor: { r: number; g: number; b: number },
): void {
  const col = graph.createNode('FRAME', parentId, {
    name: label,
    width: (CARD_WIDTH - PADDING * 2 - 12) / 2,
    fills: [],
    layoutMode: 'VERTICAL',
    primaryAxisAlign: 'MIN',
    counterAxisAlign: 'MIN',
    itemSpacing: 4,
  })

  graph.createNode('TEXT', col.id, {
    name: `${label}Label`,
    text: label,
    fontSize: 14,
    fontWeight: 700,
    fills: [{ type: 'SOLID', color: { ...labelColor, a: 1 }, opacity: 1, visible: true }],
    textAutoResize: 'HEIGHT',
    layoutAlignSelf: 'STRETCH',
  })

  for (const item of items) {
    graph.createNode('TEXT', col.id, {
      name: label === 'Goals' ? 'Goal' : 'Frustration',
      text: `• ${item}`,
      fontSize: 12,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2, a: 1 }, opacity: 1, visible: true }],
      textAutoResize: 'HEIGHT',
      layoutAlignSelf: 'STRETCH',
    })
  }
}

function createGoalsFrustrations(graph: SceneGraph, cardId: string, data: PersonaData): void {
  const hasGoals = data.goals && data.goals.length > 0
  const hasFrustrations = data.frustrations && data.frustrations.length > 0
  if (!hasGoals && !hasFrustrations) return

  const bottomSection = graph.createNode('FRAME', cardId, {
    name: 'GoalsFrustrations',
    width: CARD_WIDTH - PADDING * 2,
    fills: [],
    layoutMode: 'HORIZONTAL',
    primaryAxisAlign: 'MIN',
    counterAxisAlign: 'MIN',
    itemSpacing: 12,
    layoutAlignSelf: 'STRETCH',
  })

  if (hasGoals) {
    createListColumn(graph, bottomSection.id, 'Goals', data.goals!, { r: 0.13, g: 0.55, b: 0.13 })
  }
  if (hasFrustrations) {
    createListColumn(graph, bottomSection.id, 'Frustrations', data.frustrations!, { r: 0.8, g: 0.2, b: 0.2 })
  }
}

export function createPersona(
  graph: SceneGraph,
  parentId: string,
  data: PersonaData,
  x = 0,
  y = 0
): string {
  const avatarColor = data.avatarColor ?? '#3B82F6'

  // Card frame
  const card = graph.createNode('FRAME', parentId, {
    name: `Persona: ${data.name}`,
    x,
    y,
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    cornerRadius: 12,
    topLeftRadius: 12,
    topRightRadius: 12,
    bottomRightRadius: 12,
    bottomLeftRadius: 12,
    clipsContent: true,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
    strokes: [{ color: { r: 0.8, g: 0.8, b: 0.8, a: 1 }, weight: 1, opacity: 1, visible: true, align: 'INSIDE' as const }],
    layoutMode: 'VERTICAL',
    primaryAxisAlign: 'MIN',
    counterAxisAlign: 'MIN',
    paddingTop: PADDING,
    paddingRight: PADDING,
    paddingBottom: PADDING,
    paddingLeft: PADDING,
    itemSpacing: SECTION_GAP,
  })

  // --- Header section ---
  const header = graph.createNode('FRAME', card.id, {
    name: 'Header',
    width: CARD_WIDTH - PADDING * 2,
    height: AVATAR_SIZE + 8,
    fills: [],
    layoutMode: 'HORIZONTAL',
    primaryAxisAlign: 'MIN',
    counterAxisAlign: 'CENTER',
    itemSpacing: 12,
    layoutAlignSelf: 'STRETCH',
  })

  // Avatar circle
  const rgb = hexToRgb(avatarColor)
  graph.createNode('ELLIPSE', header.id, {
    name: 'Avatar',
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    fills: [{ type: 'SOLID', color: { ...rgb, a: 1 }, opacity: 1, visible: true }],
  })

  // Name/role/details column
  const info = graph.createNode('FRAME', header.id, {
    name: 'Info',
    width: CARD_WIDTH - PADDING * 2 - AVATAR_SIZE - 12,
    height: AVATAR_SIZE,
    fills: [],
    layoutMode: 'VERTICAL',
    primaryAxisAlign: 'CENTER',
    counterAxisAlign: 'MIN',
    itemSpacing: 4,
  })

  graph.createNode('TEXT', info.id, {
    name: 'Name',
    text: data.name,
    fontSize: 18,
    fontWeight: 700,
    fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1, a: 1 }, opacity: 1, visible: true }],
    textAutoResize: 'HEIGHT',
    layoutAlignSelf: 'STRETCH',
  })

  graph.createNode('TEXT', info.id, {
    name: 'Role',
    text: data.role,
    fontSize: 14,
    fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4, a: 1 }, opacity: 1, visible: true }],
    textAutoResize: 'HEIGHT',
    layoutAlignSelf: 'STRETCH',
  })

  // Age & Location line
  const details: string[] = []
  if (data.age != null) details.push(`Age: ${data.age}`)
  if (data.location) details.push(`Location: ${data.location}`)
  if (details.length > 0) {
    graph.createNode('TEXT', info.id, {
      name: 'Details',
      text: details.join('  '),
      fontSize: 12,
      fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5, a: 1 }, opacity: 1, visible: true }],
      textAutoResize: 'HEIGHT',
      layoutAlignSelf: 'STRETCH',
    })
  }

  createBioSection(graph, card.id, data)
  createGoalsFrustrations(graph, card.id, data)

  return card.id
}
