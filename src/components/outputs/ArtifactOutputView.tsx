'use client'

import React, { useMemo } from 'react'

import { Artifact } from '@/lib/types'
import { buildArtifactHtml } from '@/lib/output-html'

export function ArtifactOutputView({ artifact }: { artifact: Artifact }) {
  const html = useMemo(
    () => artifact.renderedHtml || buildArtifactHtml(artifact.content || ''),
    [artifact.content, artifact.renderedHtml]
  )

  return (
    <div
      className="artifact-render prose prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
