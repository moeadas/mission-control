const fs = require('fs')
const path = require('path')
const { execFileSync } = require('child_process')

const root = process.cwd()
const rtfPath = '/Users/moe/Desktop/MissionControlAgentsConfig.rtf'
const agentsRoot = path.join(root, 'src/config/agents')
const outputTxt = '/tmp/mission_agents_config_full.txt'

const RUNTIME_META = {
  iris: { specialty: 'project-management', unit: 'orchestration', accentColor: 'purple', primaryOutputs: ['status-report', 'client-brief'], position: { x: 470, y: 70, room: 'orchestration' } },
  piper: { specialty: 'project-management', unit: 'orchestration', accentColor: 'yellow', primaryOutputs: ['status-report', 'client-brief'], position: { x: 500, y: 70, room: 'orchestration' } },
  sage: { specialty: 'client-services', unit: 'client-services', accentColor: 'blue', primaryOutputs: ['status-report', 'client-brief'], position: { x: 120, y: 270, room: 'client-services' } },
  maya: { specialty: 'strategy', unit: 'client-services', accentColor: 'purple', primaryOutputs: ['strategy-brief', 'campaign-strategy', 'client-brief'], position: { x: 180, y: 270, room: 'client-services' } },
  finn: { specialty: 'creative', unit: 'creative', accentColor: 'green', primaryOutputs: ['creative-asset', 'campaign-strategy'], position: { x: 390, y: 260, room: 'creative' } },
  echo: { specialty: 'copy', unit: 'creative', accentColor: 'green', primaryOutputs: ['campaign-copy', 'content-calendar'], position: { x: 500, y: 260, room: 'creative' } },
  lyra: { specialty: 'design', unit: 'creative', accentColor: 'green', primaryOutputs: ['creative-asset'], position: { x: 440, y: 260, room: 'creative' } },
  nova: { specialty: 'media-planning', unit: 'media', accentColor: 'pink', primaryOutputs: ['media-plan', 'budget-sheet', 'kpi-forecast'], position: { x: 720, y: 260, room: 'media' } },
  dex: { specialty: 'performance', unit: 'media', accentColor: 'pink', primaryOutputs: ['status-report', 'kpi-forecast'], position: { x: 820, y: 260, room: 'media' } },
  atlas: { specialty: 'research', unit: 'research', accentColor: 'sky', primaryOutputs: ['research-brief', 'strategy-brief'], position: { x: 380, y: 440, room: 'research' } },
}

function toLiteral(value) { return JSON.stringify(value, null, 2) }
function stripSeparators(value) {
  return value
    .replace(/\n?={20,}\s*$/g, '')
    .replace(/\n?█{10,}.*$/gms, '')
    .trimEnd()
}

function firstContentLine(markdown) {
  return (
    markdown
      .split('\n')
      .map((line) => line.trim())
      .find((line) => line && !line.startsWith('#') && !line.startsWith('- ') && !line.startsWith('|')) || ''
  )
}

function firstSection(markdown, headingPrefix) {
  const parts = markdown.split(`## ${headingPrefix}`)
  return (parts[0] || markdown).trim()
}

execFileSync('textutil', ['-convert', 'txt', '-stdout', rtfPath], { stdio: ['ignore', fs.openSync(outputTxt, 'w'), 'inherit'] })
const text = fs.readFileSync(outputTxt, 'utf8')
const lines = text.split(/\n/)

const agentFiles = new Map()
let currentFile = null
let currentAgentId = null
let buffer = []

function flush() {
  if (!currentFile || !currentAgentId) return
  if (!agentFiles.has(currentAgentId)) agentFiles.set(currentAgentId, [])
  const cleaned = stripSeparators(buffer.join('\n'))
  agentFiles.get(currentAgentId).push({
    fileName: currentFile,
    body: `${cleaned}\n`,
  })
  currentFile = null
  currentAgentId = null
  buffer = []
}

for (let i = 0; i < lines.length; i++) {
  const line = lines[i]
  const fileMatch = line.match(/^FILE: src\/config\/agents\/([^/]+)\/([^\n]+)$/)
  if (fileMatch) {
    flush()
    currentAgentId = fileMatch[1]
    currentFile = fileMatch[2]
    i += 1 // skip ===== line after FILE
    continue
  }

  if (currentFile) {
    if (/^CROSS-SYSTEM QUALITY AUDIT NOTES$/.test(line.trim())) {
      flush()
      break
    }
    buffer.push(line)
  }
}
flush()

if (!agentFiles.size) throw new Error('No agent files parsed from RTF document')

for (const [agentId, files] of agentFiles) {
  const dir = path.join(agentsRoot, agentId)
  fs.mkdirSync(dir, { recursive: true })
  for (const file of files) {
    fs.writeFileSync(path.join(dir, file.fileName), file.body)
  }
}

const generatedPath = path.join(agentsRoot, 'generated.ts')
const out = []
out.push("import type { Agent } from '@/lib/types'")
out.push('')
out.push('export interface AgentArchitectureBundle {')
out.push('  agent: Agent')
out.push('  soul: string')
out.push('  identity: string')
out.push('  style: string')
out.push('  rules: string')
out.push('  context: string')
out.push('  skillSelection: string')
out.push('  handoffsDoc: string')
out.push('  memoryDoc: string')
out.push('  heartbeat: string')
out.push('  playbooks?: string')
out.push('  qualityCheckpoints: string[]')
out.push('}')
out.push('')
out.push('const BUNDLES: Record<string, AgentArchitectureBundle> = {')

for (const [agentId, files] of Array.from(agentFiles.entries()).sort((a,b)=>a[0].localeCompare(b[0]))) {
  const fileMap = Object.fromEntries(files.map(file => [file.fileName, file.body]))
  const agentJson = JSON.parse(stripSeparators(fileMap['agent.json']))
  const meta = RUNTIME_META[agentId]
  if (!meta) throw new Error(`Missing runtime metadata for ${agentId}`)

  const soul = stripSeparators(fileMap['SOUL.md'] || '').trim()
  const identity = stripSeparators(fileMap['IDENTITY.md'] || '').trim()
  const style = stripSeparators(fileMap['STYLE.md'] || '').trim()
  const rules = stripSeparators(fileMap['RULES.md'] || '').trim()
  const context = stripSeparators(fileMap['CONTEXT.md'] || '').trim()
  const skillSelection = stripSeparators(fileMap['SKILL_SELECTION.md'] || '').trim()
  const handoffsDoc = stripSeparators(fileMap['HANDOFFS.md'] || '').trim()
  const memoryDoc = stripSeparators(fileMap['MEMORY.md'] || '').trim()
  const heartbeat = stripSeparators(fileMap['HEARTBEAT.md'] || '').trim()
  const playbooks = stripSeparators(fileMap['PLAYBOOKS.md'] || '').trim()

  const soulSummary = firstContentLine(soul)
  const methodologySummary = firstSection(identity, 'What')

  const agent = {
    id: agentJson.id,
    name: agentJson.name,
    role: agentJson.role,
    photoUrl: undefined,
    division: agentJson.division,
    specialty: meta.specialty,
    unit: meta.unit,
    color: agentJson.color,
    accentColor: meta.accentColor,
    avatar: agentJson.avatar || `bot-${meta.accentColor}`,
    systemPrompt: [
      `You are ${agentJson.name}, ${agentJson.role}.`,
      soul,
      identity,
      style,
      rules,
      context,
      skillSelection,
      handoffsDoc,
      heartbeat,
    ].filter(Boolean).join('\n\n'),
    provider: agentJson.ai.provider,
    model: agentJson.ai.model,
    temperature: agentJson.ai.temperature,
    maxTokens: agentJson.ai.maxTokens,
    tools: agentJson.tools || [],
    skills: agentJson.skills || [],
    responsibilities: agentJson.qualityCheckpoints || [],
    primaryOutputs: meta.primaryOutputs,
    status: agentJson.status || 'idle',
    currentTask: undefined,
    lastActive: undefined,
    workload: 0,
    position: meta.position,
    bio: soulSummary,
    methodology: methodologySummary,
    handoffs: agentJson.handoffs || { receivesFrom: [], sendsTo: [] },
    qualityCheckpoints: agentJson.qualityCheckpoints || [],
  }

  out.push(`  ${JSON.stringify(agentId)}: {`)
  out.push(`    agent: ${toLiteral(agent).replace(/^/gm, '    ')},`)
  out.push(`    soul: ${JSON.stringify(soul)},`)
  out.push(`    identity: ${JSON.stringify(identity)},`)
  out.push(`    style: ${JSON.stringify(style)},`)
  out.push(`    rules: ${JSON.stringify(rules)},`)
  out.push(`    context: ${JSON.stringify(context)},`)
  out.push(`    skillSelection: ${JSON.stringify(skillSelection)},`)
  out.push(`    handoffsDoc: ${JSON.stringify(handoffsDoc)},`)
  out.push(`    memoryDoc: ${JSON.stringify(memoryDoc)},`)
  out.push(`    heartbeat: ${JSON.stringify(heartbeat)},`)
  if (playbooks) out.push(`    playbooks: ${JSON.stringify(playbooks)},`)
  out.push(`    qualityCheckpoints: ${toLiteral(agentJson.qualityCheckpoints || []).replace(/^/gm, '    ')},`)
  out.push('  },')
}
out.push('}')
out.push('')
out.push('export const AGENT_ARCHITECTURE_BUNDLES = BUNDLES')
out.push('export const CONFIG_AGENT_IDS = Object.keys(BUNDLES)')
out.push('export const CONFIG_AGENTS: Agent[] = Object.values(BUNDLES).map((bundle) => bundle.agent)')
out.push('')
out.push('export function getAgentArchitectureBundle(agentId: string) {')
out.push('  return BUNDLES[agentId] || null')
out.push('}')
out.push('')
out.push('export function getAgentArchitectureText(agentId: string) {')
out.push('  const bundle = BUNDLES[agentId]')
out.push('  if (!bundle) return null')
out.push('  return {')
out.push('    soul: bundle.soul,')
out.push('    identity: bundle.identity,')
out.push('    style: bundle.style,')
out.push('    rules: bundle.rules,')
out.push('    context: bundle.context,')
out.push('    skillSelection: bundle.skillSelection,')
out.push('    handoffsDoc: bundle.handoffsDoc,')
out.push('    memoryDoc: bundle.memoryDoc,')
out.push('    heartbeat: bundle.heartbeat,')
out.push("    playbooks: bundle.playbooks || '',")
out.push('  }')
out.push('}')

fs.writeFileSync(generatedPath, out.join('\n') + '\n')
console.log(`Generated ${agentFiles.size} agent folders and ${generatedPath}`)
