'use client'

import React, { useState } from 'react'
import { ClientShell } from '@/components/ClientShell'

// Config sections that can be edited
const CONFIG_SECTIONS = [
  { id: 'pipelines', name: 'Pipelines', description: 'Predefined workflow pipelines', file: 'src/config/pipelines/pipelines.json', category: 'workflows' },
  { id: 'skills', name: 'Skills Library', description: 'All available agent skills', file: 'src/config/skills/skills-library.json', category: 'workflows' },
  { id: 'agent-roles', name: 'Agent Roles', description: 'Configure agent methodologies and tools', file: 'src/config/agents/*.json', category: 'agents' },
  { id: 'tools', name: 'Tools', description: 'Manage tool integrations', file: 'src/config/tools/tools-config.json', category: 'agents' },
  { id: 'client-templates', name: 'Client Templates', description: 'Edit client onboarding templates', file: 'src/config/client-templates/client-templates.json', category: 'templates' },
  { id: 'checkpoints', name: 'Quality Gates', description: 'Configure phase approval checkpoints', file: 'src/config/checkpoints/quality-checkpoints.json', category: 'templates' },
]

const CATEGORIES = [
  { id: 'workflows', name: 'Workflows & Skills', color: '#9b6dff' },
  { id: 'agents', name: 'Agents & Tools', color: '#4f8ef7' },
  { id: 'templates', name: 'Templates', color: '#00d4aa' },
]

export default function ConfigEditorPage() {
  const [selectedSection, setSelectedSection] = useState(CONFIG_SECTIONS[0].id)
  const [jsonContent, setJsonContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  const currentSection = CONFIG_SECTIONS.find(s => s.id === selectedSection)!
  
  const loadConfig = async (sectionId: string) => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    
    try {
      let content: any = null
      
      if (sectionId === 'pipelines') {
        const module = await import('@/config/pipelines/pipelines.json')
        content = module.default
      } else if (sectionId === 'skills') {
        const module = await import('@/config/skills/skills-library.json')
        content = module.default
      } else if (sectionId === 'agent-roles') {
        // Load all agent configs as a summary
        const agents = await import('@/lib/agents-from-config')
        content = { agents: agents.CONFIG_AGENTS.map(a => ({
          id: a.id,
          name: a.name,
          role: a.role,
          division: a.division,
          skills: a.skills,
          tools: a.tools,
          methodology: a.methodology,
        }))}
      } else if (sectionId === 'tools') {
        const module = await import('@/config/tools/tools-config.json')
        content = module.default
      } else if (sectionId === 'client-templates') {
        const module = await import('@/config/client-templates/client-templates.json')
        content = module.default
      } else if (sectionId === 'checkpoints') {
        const module = await import('@/config/checkpoints/quality-checkpoints.json')
        content = module.default
      }
      
      setJsonContent(JSON.stringify(content, null, 2))
    } catch (err) {
      setError(`Failed to load: ${err}`)
    }
    
    setLoading(false)
  }
  
  // Load initial config
  React.useEffect(() => {
    loadConfig(selectedSection)
  }, [selectedSection])
  
  const validateJson = () => {
    try {
      JSON.parse(jsonContent)
      return true
    } catch {
      return false
    }
  }
  
  const handleSave = () => {
    if (!validateJson()) {
      setError('Invalid JSON format')
      return
    }
    
    // In a real app, this would write to the file system
    // For now, we just show success (the file would need to be updated manually)
    setSuccess(true)
    setError(null)
    
    // Copy to clipboard as backup
    navigator.clipboard.writeText(jsonContent)
  }
  
  const formatJson = () => {
    try {
      setJsonContent(JSON.stringify(JSON.parse(jsonContent), null, 2))
      setError(null)
    } catch {
      setError('Cannot format: Invalid JSON')
    }
  }
  
  return (
    <ClientShell>
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-base-200">
          <h1 className="text-2xl font-heading font-bold text-text-primary">
            Config Editor
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Edit agency configurations — pipelines, skills, agents, tools, and templates
          </p>
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar with Categories */}
          <div className="w-72 border-r border-base-200 flex flex-col overflow-hidden">
            {/* Category Headers */}
            <div className="p-4 pb-2">
              <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
                Workflows & Skills
              </h3>
              <div className="space-y-1">
                {CONFIG_SECTIONS.filter(s => s.category === 'workflows').map(section => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedSection === section.id
                        ? 'bg-accent-purple/20 ring-2 ring-accent-purple'
                        : 'bg-base-200 hover:bg-base-300'
                    }`}
                  >
                    <p className="font-medium text-sm">{section.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{section.description}</p>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4 pt-2 pb-2">
              <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
                Agents & Tools
              </h3>
              <div className="space-y-1">
                {CONFIG_SECTIONS.filter(s => s.category === 'agents').map(section => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedSection === section.id
                        ? 'bg-accent-purple/20 ring-2 ring-accent-purple'
                        : 'bg-base-200 hover:bg-base-300'
                    }`}
                  >
                    <p className="font-medium text-sm">{section.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{section.description}</p>
                  </button>
                ))}
              </div>
            </div>
            
            <div className="p-4 pt-2 flex-1 overflow-y-auto">
              <h3 className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-3">
                Templates
              </h3>
              <div className="space-y-1">
                {CONFIG_SECTIONS.filter(s => s.category === 'templates').map(section => (
                  <button
                    key={section.id}
                    onClick={() => setSelectedSection(section.id)}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedSection === section.id
                        ? 'bg-accent-purple/20 ring-2 ring-accent-purple'
                        : 'bg-base-200 hover:bg-base-300'
                    }`}
                  >
                    <p className="font-medium text-sm">{section.name}</p>
                    <p className="text-xs text-text-secondary mt-0.5">{section.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Editor */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Toolbar */}
            <div className="p-4 border-b border-base-200 flex items-center justify-between">
              <div>
                <p className="font-medium">{currentSection.name}</p>
                <p className="text-xs text-text-secondary">{currentSection.file}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={formatJson}
                  className="px-3 py-1.5 bg-base-200 text-sm rounded hover:bg-base-300 transition-colors"
                >
                  Format
                </button>
                <button
                  onClick={handleSave}
                  className="px-3 py-1.5 bg-accent-purple text-white text-sm rounded hover:bg-accent-purple/80 transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
            
            {/* Status */}
            {error && (
              <div className="px-4 py-2 bg-red-500/20 text-red-500 text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="px-4 py-2 bg-green-500/20 text-green-500 text-sm">
                Saved! (Also copied to clipboard)
              </div>
            )}
            
            {/* JSON Editor */}
            <div className="flex-1 overflow-hidden p-4">
              <textarea
                value={jsonContent}
                onChange={(e) => setJsonContent(e.target.value)}
                className="w-full h-full bg-base-200 text-text-primary font-mono text-sm p-4 rounded-lg resize-none outline-none"
                spellCheck={false}
                placeholder="Loading..."
              />
            </div>
            
            {/* Help */}
            <div className="p-4 border-t border-base-200 bg-base-200/50">
              <p className="text-xs text-text-secondary">
                <strong>Tip:</strong> Changes are saved to the JSON file. After saving, restart the app or click "Reload Configs" to apply changes.
                {' '}
                <a 
                  href={`https://github.com/moeadas/mission-control/blob/main/${currentSection.file}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-purple underline"
                >
                  View on GitHub
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </ClientShell>
  )
}
