'use client'

import React, { useState, useEffect } from 'react'
import { useAgentsStore } from '@/lib/agents-store'
import { AgentBot } from '@/components/agents/AgentBot'
import { SkillPicker } from '@/components/ui/SkillPicker'
import skillsLibrary from '@/config/skills/skills-library.json'
import { X, Save } from 'lucide-react'

interface AgentEditorProps {
  agentId: string | null
  onClose: () => void
}

const DIVISIONS = ['orchestration', 'client-services', 'creative', 'media', 'research']
const DIVISION_COLORS: Record<string, string> = {
  orchestration: '#a78bfa',
  'client-services': '#4f8ef7',
  creative: '#00d4aa',
  media: '#ff5fa0',
  research: '#38bdf8',
}

// Flatten skills from library for the picker
const AVAILABLE_SKILLS = skillsLibrary.skillCategories.flatMap(cat =>
  cat.skills.map(s => ({ ...s, category: cat.name }))
)

export function AgentEditor({ agentId, onClose }: AgentEditorProps) {
  const agents = useAgentsStore(state => state.agents)
  const updateAgent = useAgentsStore(state => state.updateAgent)
  const agent = agents.find(a => a.id === agentId)
  
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    bio: '',
    methodology: '',
    skills: [] as string[],
    responsibilities: [] as string[],
    tools: [] as string[],
    division: 'creative',
    color: '#4f8ef7',
    systemPrompt: '',
    temperature: 0.7,
    maxTokens: 1536,
  })
  
  const [newResponsibility, setNewResponsibility] = useState('')
  
  useEffect(() => {
    if (agent) {
      setFormData({
        name: agent.name,
        role: agent.role,
        bio: agent.bio || '',
        methodology: agent.methodology || '',
        skills: agent.skills || [],
        responsibilities: agent.responsibilities || [],
        tools: agent.tools || [],
        division: agent.division,
        color: agent.color,
        systemPrompt: agent.systemPrompt || '',
        temperature: agent.temperature || 0.7,
        maxTokens: agent.maxTokens || 1536,
      })
    }
  }, [agent])
  
  if (!agent) return null
  
  const handleSave = () => {
    updateAgent(agentId, {
      name: formData.name,
      role: formData.role,
      bio: formData.bio,
      skills: formData.skills,
      responsibilities: formData.responsibilities,
      tools: formData.tools,
      division: formData.division,
      color: formData.color,
      systemPrompt: formData.systemPrompt,
      temperature: formData.temperature,
      maxTokens: formData.maxTokens,
    })
    onClose()
  }
  
  const addSkill = (skillId: string) => {
    if (!formData.skills.includes(skillId)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, skillId] }))
    }
  }
  
  const removeSkill = (skillId: string) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skillId) }))
  }
  
  const addResponsibility = () => {
    const resp = newResponsibility.trim()
    if (resp && !formData.responsibilities.includes(resp)) {
      setFormData(prev => ({ ...prev, responsibilities: [...prev.responsibilities, resp] }))
      setNewResponsibility('')
    }
  }
  
  const removeResponsibility = (r: string) => {
    setFormData(prev => ({ ...prev, responsibilities: prev.responsibilities.filter(item => item !== r) }))
  }
  
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-[#12141a] rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-[#2a2d38] shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-[#2a2d38] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AgentBot name={agent.name} avatar={agent.avatar} color={agent.color} size={40} />
            <div>
              <h2 className="text-xl font-bold text-white">Edit Agent</h2>
              <p className="text-sm text-gray-400">{agent.name} — {agent.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#1a1d26] rounded-lg text-gray-400 hover:text-white">
            <X size={20} />
          </button>
        </div>
        
        {/* Form */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-200">Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 bg-[#1a1d26] rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent-purple text-white placeholder-gray-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-200">Role</label>
              <input
                type="text"
                value={formData.role}
                onChange={e => setFormData(prev => ({ ...prev, role: e.target.value }))}
                className="w-full px-3 py-2 bg-[#1a1d26] rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent-purple text-white placeholder-gray-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">Bio</label>
            <textarea
              value={formData.bio}
              onChange={e => setFormData(prev => ({ ...prev, bio: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 bg-[#1a1d26] rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent-purple resize-none text-white placeholder-gray-500"
              placeholder="Brief description of the agent..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">Methodology</label>
            <input
              type="text"
              value={formData.methodology}
              onChange={e => setFormData(prev => ({ ...prev, methodology: e.target.value }))}
              className="w-full px-3 py-2 bg-[#1a1d26] rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent-purple text-white placeholder-gray-500"
              placeholder="e.g., Agile/Scrum + Design Thinking"
            />
          </div>
          
          {/* Division */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">Division</label>
            <div className="flex gap-2 flex-wrap">
              {DIVISIONS.map(div => (
                <button
                  key={div}
                  onClick={() => setFormData(prev => ({ ...prev, division: div, color: DIVISION_COLORS[div] }))}
                  className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    backgroundColor: formData.division === div ? DIVISION_COLORS[div] + '20' : '#1a1d26',
                    color: formData.division === div ? DIVISION_COLORS[div] : '#d1d5db',
                    border: formData.division === div ? `1px solid ${DIVISION_COLORS[div]}` : '1px solid transparent',
                  }}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>
          
          {/* Skills - Using Picker */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">Skills</label>
            <p className="text-xs text-gray-500 mb-3">Select from the skills library. Each skill includes detailed prompts and instructions.</p>
            <SkillPicker
              selectedSkillIds={formData.skills}
              availableSkills={AVAILABLE_SKILLS}
              onAddSkill={addSkill}
              onRemoveSkill={removeSkill}
            />
          </div>
          
          {/* Responsibilities */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">Responsibilities</label>
            <p className="text-xs text-gray-500 mb-2">What this agent is responsible for</p>
            <div className="space-y-1 mb-2">
              {formData.responsibilities.length === 0 && (
                <span className="text-xs text-gray-500 italic">No responsibilities added yet</span>
              )}
              {formData.responsibilities.map(r => (
                <div key={r} className="flex items-center gap-2 px-3 py-1.5 bg-[#1a1d26] rounded text-sm text-white border border-[#2a2d38]">
                  <span className="flex-1">{r}</span>
                  <button onClick={() => removeResponsibility(r)} className="text-gray-500 hover:text-red-400">
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newResponsibility}
                onChange={e => setNewResponsibility(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (addResponsibility(), setNewResponsibility(''))}
                className="flex-1 px-3 py-2 bg-[#1a1d26] rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent-purple text-white placeholder-gray-500"
                placeholder="Type a responsibility and press Enter..."
              />
              <button onClick={() => { addResponsibility(); setNewResponsibility('') }} className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm hover:bg-accent-purple/80">
                Add
              </button>
            </div>
          </div>
          
          {/* Tools */}
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-200">Tools</label>
            <div className="flex flex-wrap gap-2">
              {['web-search', 'analytics', 'document', 'spreadsheet', 'presentation', 'image-gen', 'figma', 'canva'].map(tool => {
                const isSelected = formData.tools.includes(tool)
                return (
                  <button
                    key={tool}
                    onClick={() => {
                      if (isSelected) {
                        setFormData(prev => ({ ...prev, tools: prev.tools.filter(t => t !== tool) }))
                      } else {
                        setFormData(prev => ({ ...prev, tools: [...prev.tools, tool] }))
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs transition-all"
                    style={{
                      backgroundColor: isSelected ? 'rgba(155, 109, 255, 0.2)' : '#1a1d26',
                      color: isSelected ? '#9b6dff' : '#d1d5db',
                      border: `1px solid ${isSelected ? '#9b6dff' : '#2a2d38'}`,
                    }}
                  >
                    {isSelected ? '✓ ' : '+ '}{tool}
                  </button>
                )
              })}
            </div>
          </div>
          
          {/* AI Settings */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-200">Temperature</label>
              <input
                type="number"
                value={formData.temperature}
                onChange={e => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) || 0.7 }))}
                step={0.1}
                min={0}
                max={1}
                className="w-full px-3 py-2 bg-[#1a1d26] rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent-purple text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-200">Max Tokens</label>
              <input
                type="number"
                value={formData.maxTokens}
                onChange={e => setFormData(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 1536 }))}
                className="w-full px-3 py-2 bg-[#1a1d26] rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent-purple text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-200">Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={e => setFormData(prev => ({ ...prev, color: e.target.value }))}
                className="w-full h-10 bg-[#1a1d26] rounded-lg cursor-pointer border border-[#2a2d38]"
              />
            </div>
          </div>
          
          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-200">System Prompt</label>
            <textarea
              value={formData.systemPrompt}
              onChange={e => setFormData(prev => ({ ...prev, systemPrompt: e.target.value }))}
              rows={6}
              className="w-full px-3 py-2 bg-[#1a1d26] rounded-lg text-sm outline-none focus:ring-2 focus:ring-accent-purple font-mono resize-none text-white placeholder-gray-500"
              placeholder="Agent system prompt..."
            />
          </div>
        </div>
        
        {/* Footer */}
        <div className="p-6 border-t border-[#2a2d38] flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white">
            Cancel
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium flex items-center gap-2 hover:bg-accent-purple/80">
            <Save size={16} />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
