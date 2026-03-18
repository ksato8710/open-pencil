import { describe, test, expect, beforeAll, setDefaultTimeout } from 'bun:test'

import {
  parseFigFile,
  exportFigFile,
  initCodec,
  SceneGraph,
} from '@open-pencil/core'

import { createPersona } from '../../packages/core/src/figjam/persona'
import { createJourneyMap } from '../../packages/core/src/figjam/journey-map'

setDefaultTimeout(30_000)

beforeAll(async () => {
  await initCodec()
})

describe('FigJam persona card', () => {
  test('basic persona: avatar, name, role, goals, frustrations', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    const cardId = createPersona(graph, page.id, {
      name: 'Alice Chen',
      role: 'Product Manager',
      goals: ['Ship faster', 'Reduce churn'],
      frustrations: ['Slow deploys', 'Unclear specs'],
    })

    expect(cardId).toBeTruthy()

    const allNodes = [...graph.getAllNodes()]

    // Card frame
    const card = allNodes.find(n => n.id === cardId)
    expect(card).toBeDefined()
    expect(card!.type).toBe('FRAME')
    expect(card!.width).toBe(400)
    expect(card!.height).toBe(500)
    expect(card!.cornerRadius).toBe(12)

    // Avatar circle
    const avatar = allNodes.find(n => n.type === 'ELLIPSE' && n.name === 'Avatar')
    expect(avatar).toBeDefined()
    expect(avatar!.width).toBe(60)
    expect(avatar!.height).toBe(60)

    // Name text
    const nameText = allNodes.find(n => n.type === 'TEXT' && n.text === 'Alice Chen')
    expect(nameText).toBeDefined()

    // Role text
    const roleText = allNodes.find(n => n.type === 'TEXT' && n.text === 'Product Manager')
    expect(roleText).toBeDefined()

    // Goals
    const goalTexts = allNodes.filter(n => n.type === 'TEXT' && n.name === 'Goal')
    expect(goalTexts).toHaveLength(2)

    // Frustrations
    const frustTexts = allNodes.filter(n => n.type === 'TEXT' && n.name === 'Frustration')
    expect(frustTexts).toHaveLength(2)
  })

  test('persona with all fields: age, location, bio, quote', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    createPersona(graph, page.id, {
      name: 'Bob Yamada',
      role: 'UX Designer',
      age: 32,
      location: 'Tokyo',
      bio: 'A passionate designer focused on accessibility.',
      quote: 'Design is not just what it looks like.',
      goals: ['Improve A11y'],
      frustrations: ['Legacy code'],
      avatarColor: '#EF4444',
    })

    const allNodes = [...graph.getAllNodes()]

    // Age & location
    const details = allNodes.find(n => n.type === 'TEXT' && n.name === 'Details')
    expect(details).toBeDefined()
    expect(details!.text).toContain('Age: 32')
    expect(details!.text).toContain('Location: Tokyo')

    // Bio
    const bio = allNodes.find(n => n.type === 'TEXT' && n.name === 'BioText')
    expect(bio).toBeDefined()
    expect(bio!.text).toBe('A passionate designer focused on accessibility.')

    // Quote (wrapped in 「」)
    const quote = allNodes.find(n => n.type === 'TEXT' && n.name === 'Quote')
    expect(quote).toBeDefined()
    expect(quote!.text).toContain('Design is not just what it looks like.')

    // Custom avatar color (red)
    const avatar = allNodes.find(n => n.type === 'ELLIPSE' && n.name === 'Avatar')
    expect(avatar!.fills?.[0]?.color?.r).toBeCloseTo(0.937, 1)
  })
})

describe('FigJam user journey map', () => {
  const sampleStages = [
    {
      name: 'Awareness',
      actions: ['See ad', 'Read blog'],
      thoughts: 'Looks interesting',
      emotion: 4,
      painPoints: ['Too many options'],
      opportunities: ['Better SEO'],
    },
    {
      name: 'Consideration',
      actions: ['Compare plans', 'Watch demo'],
      thoughts: 'Is it worth it?',
      emotion: 3,
      painPoints: ['Confusing pricing'],
      opportunities: ['Free trial'],
    },
    {
      name: 'Purchase',
      actions: ['Sign up', 'Enter payment'],
      thoughts: 'Hope this works',
      emotion: 2,
      painPoints: ['Long form'],
      opportunities: ['One-click checkout'],
    },
    {
      name: 'Onboarding',
      actions: ['Complete tutorial', 'Invite team'],
      thoughts: 'Getting the hang of it',
      emotion: 4,
      painPoints: ['Missing docs'],
      opportunities: ['Interactive guide'],
    },
    {
      name: 'Retention',
      actions: ['Daily use', 'Upgrade plan'],
      thoughts: 'This saves time',
      emotion: 5,
      painPoints: ['Slow support'],
      opportunities: ['Loyalty rewards'],
    },
  ]

  test('journey map with 5 stages: stage headers and sticky counts', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    const ids = createJourneyMap(graph, page.id, {
      title: 'Customer Journey',
      personaName: 'Alice',
      stages: sampleStages,
    })

    expect(ids.length).toBeGreaterThan(0)

    const allNodes = [...graph.getAllNodes()]

    // 5 stage header frames
    const stageFrames = allNodes.filter(n => n.type === 'FRAME' && n.name?.startsWith('Stage:'))
    expect(stageFrames).toHaveLength(5)

    // Stage names
    const stageNames = stageFrames.map(f => f.name!.replace('Stage: ', ''))
    expect(stageNames).toContain('Awareness')
    expect(stageNames).toContain('Retention')

    // Stickies: 5 thoughts (yellow) + 5 pain points (pink) + 5 opportunities (green) = 15
    const stickies = allNodes.filter(n => n.type === 'STICKY')
    expect(stickies).toHaveLength(15)
  })

  test('emotion row has correct number of markers', () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    createJourneyMap(graph, page.id, { stages: sampleStages })

    const allNodes = [...graph.getAllNodes()]

    // 5 emotion circles
    const emotionMarkers = allNodes.filter(n => n.type === 'ELLIPSE' && n.name?.startsWith('Emotion:'))
    expect(emotionMarkers).toHaveLength(5)

    // 4 connectors between them
    const connectors = allNodes.filter(n => n.type === 'CONNECTOR')
    expect(connectors).toHaveLength(4)
  })

  test('roundtrip: persona export → re-import preserves structure', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    createPersona(graph, page.id, {
      name: 'Roundtrip User',
      role: 'Engineer',
      goals: ['Goal A', 'Goal B'],
      frustrations: ['Pain X'],
    })

    const exported = await exportFigFile(graph)
    const reimported = await parseFigFile(exported.buffer as ArrayBuffer)

    const origNodes = [...graph.getAllNodes()]
    const reimNodes = [...reimported.getAllNodes()]

    // Frame count match
    const origFrames = origNodes.filter(n => n.type === 'FRAME').length
    const reimFrames = reimNodes.filter(n => n.type === 'FRAME').length
    expect(reimFrames).toBe(origFrames)

    // Text count match
    const origTexts = origNodes.filter(n => n.type === 'TEXT').length
    const reimTexts = reimNodes.filter(n => n.type === 'TEXT').length
    expect(reimTexts).toBe(origTexts)

    // Ellipse (avatar) survived
    const reimAvatars = reimNodes.filter(n => n.type === 'ELLIPSE')
    expect(reimAvatars.length).toBeGreaterThanOrEqual(1)

    // Name survived
    const nameNode = reimNodes.find(n => n.type === 'TEXT' && n.text === 'Roundtrip User')
    expect(nameNode).toBeDefined()
  })

  test('roundtrip: journey map export → re-import preserves structure', async () => {
    const graph = new SceneGraph()
    const page = graph.getPages()[0]

    createJourneyMap(graph, page.id, {
      title: 'RT Journey',
      stages: sampleStages.slice(0, 3), // use 3 stages for simplicity
    })

    const exported = await exportFigFile(graph)
    const reimported = await parseFigFile(exported.buffer as ArrayBuffer)

    const origNodes = [...graph.getAllNodes()]
    const reimNodes = [...reimported.getAllNodes()]

    // Sticky count match (3 thoughts + 3 pain + 3 opp = 9)
    const origStickies = origNodes.filter(n => n.type === 'STICKY').length
    const reimStickies = reimNodes.filter(n => n.type === 'STICKY').length
    expect(reimStickies).toBe(origStickies)

    // Connector count match (2 between 3 emotion markers)
    const origConnectors = origNodes.filter(n => n.type === 'CONNECTOR').length
    const reimConnectors = reimNodes.filter(n => n.type === 'CONNECTOR').length
    expect(reimConnectors).toBe(origConnectors)

    // Stage headers survived
    const stageFrames = reimNodes.filter(n => n.type === 'FRAME' && n.name?.startsWith('Stage:'))
    expect(stageFrames).toHaveLength(3)

    // Title survived
    const titleFrame = reimNodes.find(n => n.name?.includes('RT Journey'))
    expect(titleFrame).toBeDefined()
  })
})
