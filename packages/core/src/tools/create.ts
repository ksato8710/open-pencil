import { parseColor } from '../color'
import { createIconFromPaths } from '../icon-render'
import { fetchIcons, searchIconsBatch } from '../iconify'

import { defineTool, nodeSummary } from './schema'

import type { FigmaNodeProxy } from '../figma-api'
import type { VectorNetwork } from '../scene-graph'

export const createShape = defineTool({
  name: 'create_shape',
  mutates: true,
  description:
    'Create a shape on the canvas. Use FRAME for containers/cards, RECTANGLE for solid blocks, ELLIPSE for circles, TEXT for labels, SECTION for page sections.',
  params: {
    type: {
      type: 'string',
      description: 'Node type',
      required: true,
      enum: ['FRAME', 'RECTANGLE', 'ELLIPSE', 'TEXT', 'LINE', 'STAR', 'POLYGON', 'SECTION']
    },
    x: { type: 'number', description: 'X position', required: true },
    y: { type: 'number', description: 'Y position', required: true },
    width: { type: 'number', description: 'Width in pixels', required: true, min: 1 },
    height: { type: 'number', description: 'Height in pixels', required: true, min: 1 },
    name: { type: 'string', description: 'Node name shown in layers panel' },
    parent_id: { type: 'string', description: 'Parent node ID to nest inside' }
  },
  execute: (figma, args) => {
    const parentId = args.parent_id
    const parent = parentId ? figma.getNodeById(parentId) : null
    const createMap: Record<string, () => FigmaNodeProxy> = {
      FRAME: () => figma.createFrame(),
      RECTANGLE: () => figma.createRectangle(),
      ELLIPSE: () => figma.createEllipse(),
      TEXT: () => figma.createText(),
      LINE: () => figma.createLine(),
      STAR: () => figma.createStar(),
      POLYGON: () => figma.createPolygon(),
      SECTION: () => figma.createSection()
    }
    const node = createMap[args.type]()
    node.x = args.x
    node.y = args.y
    node.resize(args.width, args.height)
    if (args.name) node.name = args.name
    if (parent) parent.appendChild(node)
    return nodeSummary(node)
  }
})

export const render = defineTool({
  name: 'render',
  mutates: true,
  description:
    'Render JSX to design nodes. Use replace_id to swap a skeleton placeholder with real content (keeps position in parent). Example: <Frame name="Card" w={320} h="hug" flex="col" gap={16} p={24} bg="#FFF" rounded={16}><Text size={18} weight="bold">Title</Text></Frame>',
  params: {
    replace_id: { type: 'string', description: 'Node ID to replace — new node takes its position in parent, old node is deleted' },
    parent_id: { type: 'string', description: 'Parent node ID to render into' },
    insert_index: { type: 'number', description: 'Position among siblings (0 = first child). Omit to append at end.' },
    x: { type: 'number', description: 'X position of the root node' },
    y: { type: 'number', description: 'Y position of the root node' },
    jsx: { type: 'string', description: 'JSX string to render', required: true },
  },
  execute: async (figma, args) => {
    const { renderJSX } = await import('../render/render-jsx.js')

    let parentId = args.parent_id ?? figma.currentPageId
    let replaceIndex = -1

    if (args.replace_id) {
      const target = figma.graph.getNode(args.replace_id)
      if (target?.parentId) {
        parentId = target.parentId
        const parent = figma.graph.getNode(parentId)
        if (parent) {
          replaceIndex = parent.childIds.indexOf(args.replace_id)
        }
      }
    }

    const result = await renderJSX(figma.graph, args.jsx, {
      parentId,
      x: args.x,
      y: args.y
    })

    if (args.replace_id && replaceIndex >= 0) {
      figma.graph.reorderChild(result.id, parentId, replaceIndex)
      figma.graph.deleteNode(args.replace_id)
    } else if (args.insert_index !== undefined) {
      figma.graph.reorderChild(result.id, parentId, args.insert_index)
    }

    return { id: result.id, name: result.name, type: result.type, children: result.childIds }
  }
})

export const createComponent = defineTool({
  name: 'create_component',
  mutates: true,
  description: 'Convert a frame/group into a component.',
  params: {
    id: { type: 'string', description: 'Node ID to convert', required: true }
  },
  execute: (figma, { id }) => {
    const node = figma.getNodeById(id)
    if (!node) return { error: `Node "${id}" not found` }
    const comp = figma.createComponentFromNode(node)
    return nodeSummary(comp)
  }
})

export const createInstance = defineTool({
  name: 'create_instance',
  mutates: true,
  description: 'Create an instance of a component.',
  params: {
    component_id: { type: 'string', description: 'Component node ID', required: true },
    x: { type: 'number', description: 'X position' },
    y: { type: 'number', description: 'Y position' }
  },
  execute: (figma, args) => {
    const comp = figma.getNodeById(args.component_id)
    if (!comp) return { error: `Component "${args.component_id}" not found` }
    const instance = comp.createInstance()
    if (args.x !== undefined) instance.x = args.x
    if (args.y !== undefined) instance.y = args.y
    return nodeSummary(instance)
  }
})

export const createPage = defineTool({
  name: 'create_page',
  mutates: true,
  description: 'Create a new page.',
  params: {
    name: { type: 'string', description: 'Page name', required: true }
  },
  execute: (figma, { name }) => {
    const page = figma.createPage()
    page.name = name
    return { id: page.id, name }
  }
})

export const createVector = defineTool({
  name: 'create_vector',
  mutates: true,
  description: 'Create a vector node with optional path data.',
  params: {
    x: { type: 'number', description: 'X position', required: true },
    y: { type: 'number', description: 'Y position', required: true },
    name: { type: 'string', description: 'Node name' },
    path: { type: 'string', description: 'VectorNetwork JSON' },
    fill: { type: 'color', description: 'Fill color (hex)' },
    stroke: { type: 'color', description: 'Stroke color (hex)' },
    stroke_weight: { type: 'number', description: 'Stroke weight' },
    parent_id: { type: 'string', description: 'Parent node ID' }
  },
  execute: (figma, args) => {
    const node = figma.createVector()
    node.x = args.x
    node.y = args.y
    if (args.name) node.name = args.name
    if (args.path) {
      figma.graph.updateNode(node.id, { vectorNetwork: JSON.parse(args.path) as VectorNetwork })
    }
    if (args.fill) {
      node.fills = [{ type: 'SOLID', color: parseColor(args.fill), opacity: 1, visible: true }]
    }
    if (args.stroke) {
      node.strokes = [
        {
          color: parseColor(args.stroke),
          weight: args.stroke_weight ?? 1,
          opacity: 1,
          visible: true,
          align: 'CENTER'
        }
      ]
    }
    if (args.parent_id) {
      const parent = figma.getNodeById(args.parent_id)
      if (parent) parent.appendChild(node)
    }
    return nodeSummary(node)
  }
})

export const createSlice = defineTool({
  name: 'create_slice',
  mutates: true,
  description: 'Create a slice (export region) on the canvas.',
  params: {
    x: { type: 'number', description: 'X position', required: true },
    y: { type: 'number', description: 'Y position', required: true },
    width: { type: 'number', description: 'Width', required: true, min: 1 },
    height: { type: 'number', description: 'Height', required: true, min: 1 },
    name: { type: 'string', description: 'Slice name' },
    parent_id: { type: 'string', description: 'Parent node ID' }
  },
  execute: (figma, args) => {
    const node = figma.createFrame()
    node.x = args.x
    node.y = args.y
    node.resize(args.width, args.height)
    node.name = args.name ?? 'Slice'
    node.fills = []
    if (args.parent_id) {
      const parent = figma.getNodeById(args.parent_id)
      if (parent) parent.appendChild(node)
    }
    return nodeSummary(node)
  }
})


export const fetchIconsTool = defineTool({
  name: 'fetch_icons',
  description:
    'Pre-fetch icons from Iconify into cache. Batches by prefix (one HTTP request per set). Call this once with all needed icons, then use insert_icon to place them instantly. Popular sets: lucide (outline), mdi (filled), heroicons, tabler, solar, mingcute, ri (remix).',
  params: {
    names: {
      type: 'string[]',
      description: 'Icon names as prefix:name (e.g. ["lucide:heart", "lucide:home", "mdi:star"])',
      required: true
    },
    size: { type: 'number', description: 'Icon size in pixels (default: 24)' }
  },
  execute: async (_figma, args) => {
    const size = args.size ?? 24
    try {
      const icons = await fetchIcons(args.names, size)
      const fetched = [...icons.keys()]
      const notFound = args.names.filter((n) => !icons.has(n))
      const result: Record<string, unknown> = { fetched, count: fetched.length }
      if (notFound.length > 0) result.not_found = notFound
      return result
    } catch (e) {
      return { error: (e as Error).message }
    }
  }
})



export const insertIcon = defineTool({
  name: 'insert_icon',
  mutates: true,
  description:
    'Insert one or more vector icons onto the canvas. Pass a single name or multiple names to batch-insert into the same parent. If already cached by fetch_icons — instant, no network request.',
  params: {
    names: {
      type: 'string[]',
      description: 'Icon names as prefix:name (e.g. ["lucide:heart"] or ["lucide:heart","lucide:home","lucide:star"])'
    },
    name: {
      type: 'string',
      description: 'Single icon name (shorthand for names with one icon)'
    },
    size: { type: 'number', description: 'Icon size in pixels (default: 24)' },
    color: { type: 'color', description: 'Icon color hex (replaces currentColor). Default: #000000' },
    parent_id: { type: 'string', description: 'Parent node ID for all icons' }
  },
  execute: async (figma, args) => {
    const names = args.names ?? (args.name ? [args.name] : [])
    if (names.length === 0) return { error: 'Provide "names" (array) or "name" (string)' }

    const size = args.size ?? 24
    const color = args.color ?? '#000000'
    const parsedColor = parseColor(color)

    let icons
    try {
      icons = await fetchIcons(names, size)
    } catch (e) {
      return { error: (e as Error).message }
    }

    const inserted: { id: string; name: string; icon: string }[] = []
    const notFound: string[] = []

    for (const name of names) {
      const icon = icons.get(name)
      if (!icon || icon.paths.length === 0) {
        notFound.push(name)
        continue
      }
      const parentId = args.parent_id ?? figma.currentPage.id
      const frame = createIconFromPaths(figma.graph, icon, name, size, parsedColor, parentId)
      inserted.push({ id: frame.id, name: frame.name, icon: name })
    }

    if (args.name && inserted.length === 1) {
      return { id: inserted[0].id, name: inserted[0].name, type: 'FRAME' as const }
    }

    const result: Record<string, unknown> = { inserted }
    if (notFound.length > 0) result.not_found = notFound
    return result
  }
})

export const searchIconsTool = defineTool({
  name: 'search_icons',
  description:
    'Search Iconify for icons by keyword. Accepts multiple queries — all searched in parallel. Returns results keyed by query.',
  params: {
    queries: {
      type: 'string[]',
      description: 'Search keywords (e.g. ["heart", "arrow", "settings"])',
      required: true
    },
    limit: { type: 'number', description: 'Max results per query (default: 5)' },
    prefix: { type: 'string', description: 'Filter by icon set prefix (e.g. "lucide", "mdi")' }
  },
  execute: async (_figma, args) => {
    try {
      const results = await searchIconsBatch(args.queries, {
        limit: args.limit ?? 5,
        prefix: args.prefix
      })
      const output: Record<string, { icons: string[]; total: number }> = {}
      for (const [query, result] of results) {
        output[query] = { icons: result.icons, total: result.total }
      }
      return output
    } catch (e) {
      return { error: (e as Error).message }
    }
  }
})

export const createSticky = defineTool({
  name: 'create_sticky',
  mutates: true,
  description:
    'Create a sticky note (FigJam-style). Creates a colored square with centered text inside.',
  params: {
    text: { type: 'string', description: 'Text content of the sticky note', required: true },
    x: { type: 'number', description: 'X position', required: true },
    y: { type: 'number', description: 'Y position', required: true },
    color: {
      type: 'string',
      description: 'Background color hex. Defaults to yellow (#FEF3C7)',
      enum: ['#FEF3C7', '#D1FAE5', '#DBEAFE', '#FCE7F3', '#EDE9FE']
    },
    parent_id: { type: 'string', description: 'Parent node ID to nest inside' }
  },
  execute: (figma, args) => {
    const parentId = args.parent_id ?? figma.currentPageId
    const node = figma.graph.createSticky(
      parentId,
      args.text,
      args.x,
      args.y,
      args.color ?? '#FEF3C7'
    )
    return { id: node.id, name: node.name, type: node.type }
  }
})

export const createConnector = defineTool({
  name: 'create_connector',
  mutates: true,
  description:
    'Create a connector line between two points (FigJam-style). Draws a line from start to end coordinates.',
  params: {
    start_x: { type: 'number', description: 'Start X position', required: true },
    start_y: { type: 'number', description: 'Start Y position', required: true },
    end_x: { type: 'number', description: 'End X position', required: true },
    end_y: { type: 'number', description: 'End Y position', required: true },
    line_style: {
      type: 'string',
      description: 'Line routing style (default STRAIGHT)',
      enum: ['STRAIGHT', 'ELBOWED']
    },
    start_node_id: { type: 'string', description: 'Node ID to connect from (visual hint only)' },
    end_node_id: { type: 'string', description: 'Node ID to connect to (visual hint only)' },
    parent_id: { type: 'string', description: 'Parent node ID to nest inside' }
  },
  execute: (figma, args) => {
    const parentId = args.parent_id ?? figma.currentPageId
    const node = figma.graph.createConnector(
      parentId,
      args.start_x,
      args.start_y,
      args.end_x,
      args.end_y,
      (args.line_style ?? 'STRAIGHT') as 'STRAIGHT' | 'ELBOWED'
    )
    if (args.start_node_id) {
      figma.graph.updateNode(node.id, { connectorStartNodeId: args.start_node_id })
    }
    if (args.end_node_id) {
      figma.graph.updateNode(node.id, { connectorEndNodeId: args.end_node_id })
    }
    return { id: node.id, name: node.name, type: node.type }
  }
})

export const createShapeWithText = defineTool({
  name: 'create_shape_with_text',
  mutates: true,
  description:
    'Create a shape with text inside (FigJam-style). Creates a shape node containing centered text.',
  params: {
    shape: {
      type: 'string',
      description: 'Shape type',
      required: true,
      enum: ['RECTANGLE', 'ELLIPSE', 'ROUNDED_RECTANGLE']
    },
    text: { type: 'string', description: 'Text content inside the shape', required: true },
    x: { type: 'number', description: 'X position', required: true },
    y: { type: 'number', description: 'Y position', required: true },
    width: { type: 'number', description: 'Width in pixels (default 200)', min: 1 },
    height: { type: 'number', description: 'Height in pixels (default 200)', min: 1 },
    parent_id: { type: 'string', description: 'Parent node ID to nest inside' }
  },
  execute: (figma, args) => {
    const parentId = args.parent_id ?? figma.currentPageId
    const node = figma.graph.createShapeWithText(
      parentId,
      args.shape as 'RECTANGLE' | 'ELLIPSE' | 'ROUNDED_RECTANGLE',
      args.text,
      args.x,
      args.y,
      args.width ?? 200,
      args.height ?? 200
    )
    return { id: node.id, name: node.name, type: node.type }
  }
})
