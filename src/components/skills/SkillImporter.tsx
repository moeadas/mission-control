'use client'

import React, { useState, useCallback } from 'react'
import { useAgentsStore } from '@/lib/agents-store'
import {
  Upload,
  FileText,
  Archive,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Download,
  Trash2,
  Plus,
  X,
} from 'lucide-react'
import { clsx } from 'clsx'
import {
  parseSkillFromMarkdown,
  validateSkill,
  mergeSkillIntoLibrary,
  SkillDefinition,
  SkillPackage,
} from '@/lib/skill-import'
import JSZip from 'jszip'

// Skill categories for the library
const SKILL_CATEGORIES = [
  { id: 'strategy', name: 'Strategy & Planning' },
  { id: 'creative', name: 'Creative & Copy' },
  { id: 'project-management', name: 'Project & Traffic Management' },
  { id: 'media', name: 'Media & Advertising' },
  { id: 'research', name: 'Research & Insights' },
  { id: 'client-services', name: 'Client Services' },
  { id: 'operations', name: 'Operations' },
]

export function SkillImporter() {
  const agents = useAgentsStore(state => state.agents)
  
  const [importedSkills, setImportedSkills] = useState<SkillPackage[]>([])
  const [validationResults, setValidationResults] = useState<Map<string, { valid: boolean; errors: string[] }>>(new Map())
  const [importLog, setImportLog] = useState<string[]>([])
  const [dragActive, setDragActive] = useState(false)
  const [parsing, setParsing] = useState(false)

  // Handle file drop/select
  const handleFiles = useCallback(async (files: FileList) => {
    setParsing(true)
    const newSkills: SkillPackage[] = []
    const results = new Map<string, { valid: boolean; errors: string[] }>()
    
    for (const file of Array.from(files)) {
      try {
        let skillPkg: SkillPackage | null = null
        
        if (file.name.endsWith('.zip')) {
          // Parse zip
          const zip = await JSZip.loadAsync(file)
          const mdFiles = Object.keys(zip.files).filter(name => name.endsWith('.md'))
          
          for (const mdFile of mdFiles) {
            const content = await zip.file(mdFile)?.async('string')
            if (content) {
              const parsed = parseSkillFromMarkdown(content)
              if (parsed) {
                skillPkg = parsed
                break // Use first .md found
              }
            }
          }
          
          // Also extract assets from zip
          if (skillPkg) {
            const assets: SkillPackage['assets'] = []
            for (const [name, zipFile] of Object.entries(zip.files)) {
              if (!zipFile.dir && name.endsWith('.md') && name !== mdFiles[0]) {
                const content = await zipFile.async('string')
                assets.push({
                  name,
                  content,
                  type: 'reference',
                })
              }
            }
            skillPkg.assets = assets
          }
        } else if (file.name.endsWith('.md')) {
          // Parse markdown
          const content = await file.text()
          skillPkg = parseSkillFromMarkdown(content)
        }
        
        if (skillPkg) {
          // Validate
          const validation = validateSkill(skillPkg.skill)
          results.set(skillPkg.skill.id, validation)
          newSkills.push(skillPkg)
          setImportLog(prev => [...prev, `✓ Parsed: ${skillPkg!.skill.name} (${file.name})`])
        } else {
          setImportLog(prev => [...prev, `✗ Failed to parse: ${file.name}`])
        }
      } catch (error) {
        setImportLog(prev => [...prev, `✗ Error: ${file.name} - ${error}`])
      }
    }
    
    setImportedSkills(prev => [...prev, ...newSkills])
    setValidationResults(prev => new Map([...prev, ...results]))
    setParsing(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    if (e.dataTransfer.files) {
      handleFiles(e.dataTransfer.files)
    }
  }, [handleFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setDragActive(false)
  }, [])

  const removeSkill = (skillId: string) => {
    setImportedSkills(prev => prev.filter(s => s.skill.id !== skillId))
  }

  const addSkillToLibrary = (skill: SkillDefinition) => {
    // This would integrate with the actual skills library
    // For now, just log it
    setImportLog(prev => [...prev, `+ Added to library: ${skill.name} → ${skill.category}`])
  }

  const addAllToLibrary = () => {
    for (const pkg of importedSkills) {
      const validation = validationResults.get(pkg.skill.id)
      if (validation?.valid) {
        addSkillToLibrary(pkg.skill)
      }
    }
    // Clear imported after adding
    setTimeout(() => {
      setImportedSkills([])
      setValidationResults(new Map())
    }, 1000)
  }

  return (
    <div className="space-y-6">
      {/* Drop Zone */}
      <div
        className={clsx(
          'border-2 border-dashed rounded-xl p-8 text-center transition-all',
          dragActive ? 'border-accent-purple bg-accent-purple/5' : 'border-border'
        )}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          type="file"
          id="skill-upload"
          className="hidden"
          accept=".md,.zip"
          multiple
          onChange={e => e.target.files && handleFiles(e.target.files)}
        />
        <label htmlFor="skill-upload" className="cursor-pointer">
          <Upload size={48} className="mx-auto text-text-dim mb-4" />
          <p className="text-text-primary font-medium mb-1">
            Drop skill.md files or skill packages (.zip)
          </p>
          <p className="text-sm text-text-secondary">
            Supports standard skill format with EN/AR prompts
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <span className="flex items-center gap-1 text-xs text-text-dim">
              <FileText size={14} /> .md files
            </span>
            <span className="flex items-center gap-1 text-xs text-text-dim">
              <Archive size={14} /> .zip packages
            </span>
          </div>
        </label>
      </div>

      {/* Parsing Status */}
      {parsing && (
        <div className="flex items-center gap-2 text-sm text-accent-purple">
          <div className="w-4 h-4 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
          Parsing skills...
        </div>
      )}

      {/* Import Log */}
      {importLog.length > 0 && (
        <div className="bg-base-200 rounded-lg p-4">
          <h4 className="text-sm font-medium mb-2">Import Log</h4>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {importLog.map((log, i) => (
              <p key={i} className={clsx(
                'text-xs font-mono',
                log.startsWith('✓') ? 'text-accent-green' :
                log.startsWith('✗') ? 'text-accent-red' :
                'text-accent-blue'
              )}>
                {log}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Imported Skills */}
      {importedSkills.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">Imported Skills ({importedSkills.length})</h3>
            <button
              onClick={addAllToLibrary}
              className="px-4 py-2 bg-accent-purple text-white rounded-lg text-sm font-medium hover:bg-accent-purple/80"
            >
              Add All to Library
            </button>
          </div>
          
          <div className="space-y-3">
            {importedSkills.map(pkg => {
              const validation = validationResults.get(pkg.skill.id)
              return (
                <div
                  key={pkg.skill.id}
                  className={clsx(
                    'bg-base-200 rounded-lg p-4 border',
                    validation?.valid === false ? 'border-accent-red' : 'border-border'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{pkg.skill.name}</h4>
                        <span className="px-2 py-0.5 bg-base-300 rounded text-xs">
                          {pkg.skill.category}
                        </span>
                        {pkg.assets && pkg.assets.length > 0 && (
                          <span className="flex items-center gap-1 px-2 py-0.5 bg-accent-blue/10 text-accent-blue rounded text-xs">
                            <Archive size={12} /> {pkg.assets.length} assets
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-text-secondary mt-1 line-clamp-2">
                        {pkg.skill.description}
                      </p>
                      
                      {/* Validation Errors */}
                      {validation?.errors.length && (
                        <div className="mt-2 space-y-1">
                          {validation.errors.map((err, i) => (
                            <p key={i} className="text-xs text-accent-red flex items-center gap-1">
                              <XCircle size={12} /> {err}
                            </p>
                          ))}
                        </div>
                      )}
                      
                      {/* Prompt Preview */}
                      {pkg.skill.prompts?.en && (
                        <details className="mt-2">
                          <summary className="text-xs text-text-dim cursor-pointer">
                            Preview EN prompt ({pkg.skill.prompts.en.length} chars)
                          </summary>
                          <pre className="mt-1 p-2 bg-base-300 rounded text-xs overflow-x-auto">
                            {pkg.skill.prompts.en.slice(0, 300)}...
                          </pre>
                        </details>
                      )}
                      
                      {/* Variables */}
                      {pkg.skill.variables && pkg.skill.variables.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {pkg.skill.variables.map(v => (
                            <span key={v} className="px-2 py-0.5 bg-accent-purple/10 text-accent-purple rounded text-xs">
                              {`{{${v}}}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    <button
                      onClick={() => removeSkill(pkg.skill.id)}
                      className="p-1 hover:bg-base-300 rounded"
                    >
                      <Trash2 size={16} className="text-text-dim" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Skill Format Reference */}
      <details className="bg-base-200 rounded-lg p-4">
        <summary className="font-medium cursor-pointer">Standard Skill Format (.md)</summary>
        <div className="mt-4 space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-2">Frontmatter</h4>
            <pre className="p-3 bg-base-300 rounded text-xs overflow-x-auto">
{`---
id: my-new-skill
name: My New Skill
category: strategy
version: 1.0
author: Agency Name
tags: campaign, social media
difficulty: intermediate
---

# My New Skill

Brief description of what this skill does.

## Prompt (English)

Your prompt here with {{variable}} injection...

## Prompt (Arabic) [Optional]

المطالب هنا...`}
            </pre>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Required Fields</h4>
            <ul className="text-sm text-text-secondary space-y-1">
              <li>• <code>id</code> — unique identifier (lowercase, hyphenated)</li>
              <li>• <code>name</code> — display name</li>
              <li>• <code>category</code> — skill category (strategy, creative, media, etc.)</li>
              <li>• <code>## Prompt (English)</code> — main execution prompt</li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-2">Zip Package Structure</h4>
            <pre className="p-3 bg-base-300 rounded text-xs">
{`skill-package.zip
├── skill.md          # Main skill definition
├── examples/
│   ├── example1.md   # Example inputs/outputs
│   └── example2.md
└── references/
    └── template.txt # Additional references`}
            </pre>
          </div>
        </div>
      </details>
    </div>
  )
}
