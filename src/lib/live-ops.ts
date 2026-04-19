import { Agent, Artifact, ArtifactExecutionStep, Mission, ProviderSettings } from '@/lib/types'
import { getAuditConnectorStatus, getAuditExecutionProfile } from '@/lib/audit-capabilities'

export interface LiveOfficeAgentState {
  agentId: string
  missionId: string
  stageLabel: string
  bubble: string
  mood: 'thinking' | 'working' | 'reviewing' | 'blocked'
}

export interface LiveMissionSnapshot {
  mission: Mission
  latestArtifact: Artifact | null
  stageLabel: string
  stageSummary: string
  urgencyLabel: string
  urgencyTone: 'low' | 'medium' | 'high'
  nextAction: string
  rewardLabel: string
  activeSkills: string[]
  involvedAgentIds: string[]
  progress: number
  auditSummary?: string
}

export interface LeaderboardEntry {
  agentId: string
  agentName: string
  color: string
  avatar?: string
  photoUrl?: string
  score: number
  tasksCompleted: number
  leadWins: number
  supportWins: number
  currentHotStreak: number
  clutchSaves: number
  qualityWins: number
  momentumLabel: string
}

function safeTime(value?: string | null) {
  if (!value) return 0
  const timestamp = new Date(value).getTime()
  return Number.isFinite(timestamp) ? timestamp : 0
}

function getLatestArtifactForMission(mission: Mission, artifacts: Artifact[]) {
  return (
    artifacts
      .filter((artifact) => artifact.missionId === mission.id)
      .sort((a, b) => safeTime(b.createdAt || b.updatedAt) - safeTime(a.createdAt || a.updatedAt))[0] || null
  )
}

function getLatestStepForAgent(executionSteps: ArtifactExecutionStep[], agentId: string) {
  for (let index = executionSteps.length - 1; index >= 0; index -= 1) {
    if (executionSteps[index]?.agentId === agentId) {
      return executionSteps[index]
    }
  }
  return null
}

function summarizeStep(step: ArtifactExecutionStep | null) {
  if (!step) return null
  const source = step.summary || step.title
  if (!source) return null
  return source.length > 72 ? `${source.slice(0, 69)}...` : source
}

function deriveMissionStage(mission: Mission, latestArtifact: Artifact | null) {
  if (mission.status === 'blocked') {
    return { label: 'Blocked', summary: 'A blocker needs attention before the team can move forward.' }
  }

  if (latestArtifact && ['ready', 'delivered'].includes(latestArtifact.status)) {
    return { label: 'Saved Output', summary: 'The deliverable has been packaged and saved into the workspace.' }
  }

  if (mission.status === 'completed') {
    return { label: 'Complete', summary: 'Execution is complete and waiting for final review or export.' }
  }

  if (mission.progress <= 15) {
    return { label: 'Analyzing', summary: 'Iris is framing the request, validating the brief, and defining the work shape.' }
  }

  if (mission.progress <= 32) {
    return { label: 'Routing', summary: 'Iris is assigning the right specialists and locking the skill stack.' }
  }

  if (mission.progress <= 78) {
    return { label: 'Execution', summary: 'The assigned specialists are producing, reviewing, and iterating on the deliverable.' }
  }

  if (mission.status === 'review') {
    return { label: 'Review', summary: 'The output is being checked for quality, readiness, and final presentation.' }
  }

  return { label: 'Packaging', summary: 'The output is being assembled into a task-ready artifact and export set.' }
}

function deriveUrgency(mission: Mission): { label: string; tone: 'low' | 'medium' | 'high' } {
  if (mission.status === 'blocked') return { label: 'Critical', tone: 'high' }
  if (mission.status === 'review') return { label: 'Hot', tone: 'medium' }
  if ((mission.progress || 0) >= 75) return { label: 'Closing', tone: 'medium' }
  if ((mission.complexity || 'medium') === 'high') return { label: 'High Complexity', tone: 'high' }
  return { label: 'Stable', tone: 'low' }
}

function deriveNextAction(mission: Mission, latestArtifact: Artifact | null) {
  if (mission.status === 'blocked') return 'Resolve the blocker or reroute the squad before progress resumes.'
  if (mission.status === 'review') return 'Review the draft, approve it, or request a focused revision.'
  if (latestArtifact && ['ready', 'delivered'].includes(latestArtifact.status)) return 'Open the saved output and ship or export it.'
  if ((mission.progress || 0) <= 25) return 'Confirm the brief and let Iris lock the best squad.'
  if ((mission.progress || 0) <= 75) return 'Keep the team moving and watch for missing inputs or scope drift.'
  return 'Package the output cleanly and prepare the final handoff.'
}

function deriveRewardLabel(mission: Mission) {
  const complexity = mission.complexity || 'medium'
  const confidence = mission.channelingConfidence || 'medium'
  if (mission.status === 'blocked') return 'Rescue bonus available'
  if (complexity === 'high' && confidence === 'high') return 'Epic mission'
  if (complexity === 'high') return 'Boss mission'
  if (confidence === 'high') return 'Clean lock-in'
  return 'Momentum mission'
}

function skillBubble(skill: string) {
  if (/copy|headline|cta|content|social|email|landing/.test(skill)) return 'drafting copy'
  if (/visual|design|creative|art-direction/.test(skill)) return 'shaping visuals'
  if (/research|insight|benchmark|industry|consumer/.test(skill)) return 'researching inputs'
  if (/seo|keyword/.test(skill)) return 'auditing search visibility'
  if (/media|channel|budget|reach|frequency|kpi/.test(skill)) return 'planning channels'
  if (/quality|review|process|documentation/.test(skill)) return 'checking quality'
  return 'working the brief'
}

function defaultAgentBubble(agent: Agent, mission: Mission, skillAssignments: string[]) {
  if (mission.deliverableType === 'campaign-copy') {
    if (agent.id === 'echo') return 'drafting platform-native copy'
    if (agent.id === 'maya') return 'tightening the message angle'
    if (agent.id === 'lyra') return 'pairing copy with visual cues'
  }
  if (mission.deliverableType === 'content-calendar') {
    if (agent.id === 'echo') return 'mapping the calendar'
    if (agent.id === 'maya') return 'aligning pillars and themes'
    if (agent.id === 'lyra') return 'planning visual rhythm'
  }
  if (mission.deliverableType === 'seo-audit') {
    if (agent.id === 'atlas') return 'crawling search issues'
    if (agent.id === 'maya') return 'prioritising strategic fixes'
    if (agent.id === 'echo') return 'reviewing search-language gaps'
  }
  if (mission.deliverableType === 'ui-audit') {
    if (agent.id === 'finn') return 'reviewing interface quality'
    if (agent.id === 'lyra') return 'checking visual consistency'
    if (agent.id === 'dex') return 'flagging conversion friction'
    if (agent.id === 'echo') return 'reviewing messaging hierarchy'
  }

  const topSkill = skillAssignments[0]
  if (topSkill) return skillBubble(topSkill)
  if (agent.id === mission.leadAgentId) return 'assembling the final output'
  return 'supporting the live mission'
}

export function getLiveMissionSnapshots(input: {
  missions: Mission[]
  artifacts: Artifact[]
  providerSettings?: ProviderSettings | null
}) {
  const activeMissions = input.missions
    .filter((mission) => !['cancelled'].includes(mission.status))
    .map((mission) => {
      const latestArtifact = getLatestArtifactForMission(mission, input.artifacts)
      const stage = deriveMissionStage(mission, latestArtifact)
      const activeSkills = Array.from(new Set(Object.values(mission.skillAssignments || {}).flat().filter(Boolean)))
      const involvedAgentIds = Array.from(
        new Set([
          ...(mission.assignedAgentIds || []),
          mission.leadAgentId,
          ...(mission.collaboratorAgentIds || []),
          ...((latestArtifact?.executionSteps || []).map((step) => step.agentId)),
        ].filter(Boolean) as string[])
      )
      const auditProfile = getAuditExecutionProfile(mission.summary || mission.title, mission.deliverableType)
      const connectorStatus = getAuditConnectorStatus(input.providerSettings || undefined)
      const auditSummary = auditProfile
        ? `${auditProfile.title} · ${auditProfile.requiredConnectors
            .map((connector) => `${connector.shortName}${connectorStatus[connector.id] ? ' ready' : ' pending'}`)
            .join(' · ')}`
        : undefined

      return {
        mission,
        latestArtifact,
        stageLabel: stage.label,
        stageSummary: stage.summary,
        urgencyLabel: deriveUrgency(mission).label,
        urgencyTone: deriveUrgency(mission).tone,
        nextAction: deriveNextAction(mission, latestArtifact),
        rewardLabel: deriveRewardLabel(mission),
        activeSkills,
        involvedAgentIds,
        progress: mission.progress || (latestArtifact ? 100 : 0),
        auditSummary,
      }
    })
    .sort((a, b) => safeTime(b.mission.createdAt) - safeTime(a.mission.createdAt))

  return activeMissions
}

export function getLiveOfficeAgentStates(input: {
  agents: Agent[]
  missions: Mission[]
  artifacts: Artifact[]
}) {
  const states = new Map<string, LiveOfficeAgentState>()
  const liveMissions = getLiveMissionSnapshots({ missions: input.missions, artifacts: input.artifacts })

  for (const liveMission of liveMissions) {
    if (['completed', 'cancelled'].includes(liveMission.mission.status) && !liveMission.latestArtifact) continue
    const executionSteps = liveMission.latestArtifact?.executionSteps || []

    for (const agentId of liveMission.involvedAgentIds) {
      const agent = input.agents.find((entry) => entry.id === agentId)
      if (!agent) continue
      const step = getLatestStepForAgent(executionSteps, agentId)
      const skillAssignments = liveMission.mission.skillAssignments?.[agentId] || []
      const bubble = summarizeStep(step) || defaultAgentBubble(agent, liveMission.mission, skillAssignments)
      const mood: LiveOfficeAgentState['mood'] =
        liveMission.mission.status === 'blocked'
          ? 'blocked'
          : liveMission.stageLabel === 'Review' || /review|qa|check/i.test(bubble)
            ? 'reviewing'
            : liveMission.stageLabel === 'Analyzing' || /think|brainstorm|frame/i.test(bubble)
              ? 'thinking'
              : 'working'

      states.set(agentId, {
        agentId,
        missionId: liveMission.mission.id,
        stageLabel: liveMission.stageLabel,
        bubble,
        mood,
      })
    }
  }

  return states
}

export function getMissionRecency(mission: Mission, artifacts: Artifact[]) {
  const latestArtifact = getLatestArtifactForMission(mission, artifacts)
  return Math.max(safeTime(mission.createdAt), safeTime(mission.updatedAt), safeTime(latestArtifact?.createdAt), safeTime(latestArtifact?.updatedAt))
}

export function buildAgentLeaderboard(input: {
  agents: Agent[]
  missions: Mission[]
  artifacts: Artifact[]
}) : LeaderboardEntry[] {
  return input.agents
    .map((agent) => {
      const relevantMissions = input.missions.filter((mission) => {
        const assigned = Array.isArray(mission.assignedAgentIds) ? mission.assignedAgentIds : []
        return mission.leadAgentId === agent.id || assigned.includes(agent.id)
      })
      const relevantArtifacts = input.artifacts.filter((artifact) =>
        artifact.agentId === agent.id || (artifact.executionSteps || []).some((step) => step.agentId === agent.id && step.status !== 'failed')
      )

      const tasksCompleted = relevantMissions.filter((mission) => ['completed', 'review'].includes(mission.status)).length
      const leadWins = relevantMissions.filter((mission) => mission.leadAgentId === agent.id && ['completed', 'review'].includes(mission.status)).length
      const supportWins = relevantArtifacts.filter((artifact) => (artifact.executionSteps || []).some((step) => step.agentId === agent.id && step.role === 'support')).length
      const clutchSaves = relevantMissions.filter((mission) => mission.status === 'blocked' && mission.leadAgentId === agent.id).length
      const qualityWins = relevantArtifacts.filter((artifact) => (artifact.executionSteps || []).some((step) => step.agentId === agent.id && step.status === 'completed' && step.role === 'quality')).length
      const recentMissionCount = relevantMissions.filter((mission) => {
        const age = Date.now() - safeTime(mission.createdAt)
        return age <= 7 * 24 * 60 * 60 * 1000
      }).length
      const impactScore = relevantMissions.reduce((sum, mission) => {
        const complexityWeight = mission.complexity === 'high' ? 3 : mission.complexity === 'low' ? 1 : 2
        const confidenceWeight = mission.channelingConfidence === 'high' ? 2 : 1
        return sum + complexityWeight + confidenceWeight
      }, 0)
      const score = tasksCompleted * 4 + leadWins * 4 + supportWins * 2 + recentMissionCount + clutchSaves * 3 + qualityWins * 2 + impactScore
      const momentumLabel =
        score >= 35 ? 'Legendary streak'
        : score >= 24 ? 'On fire'
        : score >= 14 ? 'Building momentum'
        : 'Warming up'

      return {
        agentId: agent.id,
        agentName: agent.name,
        color: agent.color,
        avatar: agent.avatar,
        photoUrl: agent.photoUrl,
        tasksCompleted,
        leadWins,
        supportWins,
        currentHotStreak: recentMissionCount,
        clutchSaves,
        qualityWins,
        momentumLabel,
        score,
      }
    })
    .sort((a, b) => b.score - a.score)
}
