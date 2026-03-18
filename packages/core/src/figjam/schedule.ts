import type { SceneGraph } from '../scene-graph'

export interface ScheduleActivity {
  name: string
  startDate: string  // YYYY-MM-DD
  endDate: string    // YYYY-MM-DD
  color?: string     // hex color
  row?: number       // optional row override
}

export interface ScheduleOptions {
  startDate: string    // YYYY-MM-DD, timeline start
  endDate: string      // YYYY-MM-DD, timeline end
  activities: ScheduleActivity[]
  title?: string
  x?: number
  y?: number
}

const DAY_WIDTH = 20
const ROW_HEIGHT = 40
const HEADER_HEIGHT = 30
const GAP = 4

const DEFAULT_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // purple
  '#EC4899', // pink
]

const MONTH_HEADER_COLOR = '#E5E7EB'
const WEEK_HEADER_COLOR = '#F3F4F6'

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24))
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  }
}

/** Get ISO week number for a date */
function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7))
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
}

/** Get the Monday of the week containing `d` */
function getWeekStart(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date
}

function createFrameWithText(
  graph: SceneGraph,
  parentId: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  bgColor: string,
  textColor = '#000000',
  fontSize = 10
): string {
  const rgb = hexToRgb(bgColor)
  const textRgb = hexToRgb(textColor)
  const frame = graph.createNode('FRAME', parentId, {
    name: text,
    x,
    y,
    width,
    height,
    cornerRadius: 4,
    topLeftRadius: 4,
    topRightRadius: 4,
    bottomRightRadius: 4,
    bottomLeftRadius: 4,
    clipsContent: true,
    fills: [{ type: 'SOLID', color: { ...rgb, a: 1 }, opacity: 1, visible: true }],
    layoutMode: 'VERTICAL',
    primaryAxisAlign: 'CENTER',
    counterAxisAlign: 'CENTER',
  })
  graph.createNode('TEXT', frame.id, {
    name: 'Label',
    text,
    width: width - 4,
    textAlignHorizontal: 'CENTER',
    textAlignVertical: 'CENTER',
    textAutoResize: 'HEIGHT',
    fontSize,
    fills: [{ type: 'SOLID', color: { ...textRgb, a: 1 }, opacity: 1, visible: true }],
    layoutAlignSelf: 'STRETCH',
  })
  return frame.id
}

function createActivityBar(
  graph: SceneGraph,
  parentId: string,
  text: string,
  x: number,
  y: number,
  width: number,
  height: number,
  bgColor: string
): string {
  const rgb = hexToRgb(bgColor)
  const frame = graph.createNode('ROUNDED_RECTANGLE', parentId, {
    name: text,
    x,
    y,
    width,
    height,
    cornerRadius: 6,
    topLeftRadius: 6,
    topRightRadius: 6,
    bottomRightRadius: 6,
    bottomLeftRadius: 6,
    fills: [{ type: 'SOLID', color: { ...rgb, a: 1 }, opacity: 1, visible: true }],
  })
  graph.createNode('TEXT', frame.id, {
    name: 'Label',
    text,
    x: 6,
    y: (height - 12) / 2,
    width: Math.max(width - 12, 20),
    textAlignHorizontal: 'LEFT',
    textAlignVertical: 'CENTER',
    textAutoResize: 'HEIGHT',
    fontSize: 11,
    fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 }, opacity: 1, visible: true }],
  })
  return frame.id
}

export function createSchedule(
  graph: SceneGraph,
  parentId: string,
  options: ScheduleOptions
): string[] {
  const ids: string[] = []
  const originX = options.x ?? 0
  const originY = options.y ?? 0
  const timelineStart = parseDate(options.startDate)
  const timelineEnd = parseDate(options.endDate)
  const totalDays = daysBetween(timelineStart, timelineEnd)

  // --- Title ---
  let currentY = originY
  if (options.title) {
    const titleId = createFrameWithText(
      graph, parentId, options.title,
      originX, currentY,
      totalDays * DAY_WIDTH, HEADER_HEIGHT + 4,
      '#374151', '#FFFFFF', 14
    )
    ids.push(titleId)
    currentY += HEADER_HEIGHT + 4 + GAP
  }

  // --- Month headers ---
  const monthHeaderY = currentY
  let cursor = new Date(timelineStart)
  while (cursor < timelineEnd) {
    const monthStart = new Date(Math.max(cursor.getTime(), timelineStart.getTime()))
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    const monthEnd = new Date(Math.min(nextMonth.getTime(), timelineEnd.getTime()))
    const startDay = daysBetween(timelineStart, monthStart)
    const endDay = daysBetween(timelineStart, monthEnd)
    const width = (endDay - startDay) * DAY_WIDTH

    if (width > 0) {
      const monthName = `${cursor.getMonth() + 1}月`
      const id = createFrameWithText(
        graph, parentId, monthName,
        originX + startDay * DAY_WIDTH, monthHeaderY,
        width, HEADER_HEIGHT,
        MONTH_HEADER_COLOR, '#374151', 12
      )
      ids.push(id)
    }

    cursor = nextMonth
  }
  currentY = monthHeaderY + HEADER_HEIGHT + GAP

  // --- Week headers ---
  const weekHeaderY = currentY
  let weekCursor = getWeekStart(timelineStart)
  // If week start is before timeline start, move to timeline start
  if (weekCursor < timelineStart) {
    weekCursor = new Date(timelineStart)
  }
  // Find first Monday at or after timeline start
  weekCursor = getWeekStart(timelineStart)
  if (weekCursor < timelineStart) {
    weekCursor.setDate(weekCursor.getDate() + 7)
  }

  while (weekCursor < timelineEnd) {
    const weekEnd = new Date(weekCursor)
    weekEnd.setDate(weekEnd.getDate() + 7)
    const clippedEnd = new Date(Math.min(weekEnd.getTime(), timelineEnd.getTime()))
    const startDay = daysBetween(timelineStart, weekCursor)
    const endDay = daysBetween(timelineStart, clippedEnd)
    const width = (endDay - startDay) * DAY_WIDTH
    const weekNum = getWeekNumber(weekCursor)

    if (width > 0) {
      const id = createFrameWithText(
        graph, parentId, `W${weekNum}`,
        originX + startDay * DAY_WIDTH, weekHeaderY,
        width, HEADER_HEIGHT - 6,
        WEEK_HEADER_COLOR, '#6B7280', 9
      )
      ids.push(id)
    }

    weekCursor.setDate(weekCursor.getDate() + 7)
  }
  currentY = weekHeaderY + (HEADER_HEIGHT - 6) + GAP

  // --- Activity bars ---
  const activities = options.activities
  for (let i = 0; i < activities.length; i++) {
    const act = activities[i]
    const actStart = parseDate(act.startDate)
    const actEnd = parseDate(act.endDate)
    const startDay = daysBetween(timelineStart, actStart)
    const durationDays = daysBetween(actStart, actEnd)
    const row = act.row ?? i
    const color = act.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length]

    const barX = originX + startDay * DAY_WIDTH
    const barY = currentY + row * (ROW_HEIGHT + GAP)
    const barWidth = durationDays * DAY_WIDTH

    if (barWidth > 0) {
      const id = createActivityBar(
        graph, parentId, act.name,
        barX, barY,
        barWidth, ROW_HEIGHT,
        color
      )
      ids.push(id)
    }
  }

  return ids
}
