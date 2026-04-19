import { Artifact, ArtifactFormat, DeliverableType } from '@/lib/types'

export function slugifyFilePart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function getArtifactFamily(deliverableType: DeliverableType) {
  if (deliverableType === 'creative-asset') return 'creative'
  if (['media-plan', 'budget-sheet', 'kpi-forecast'].includes(deliverableType)) return 'media'
  return 'document'
}

export function getSupportedExportFormats(artifact: Artifact): Extract<ArtifactFormat, 'docx' | 'pdf' | 'xlsx'>[] {
  if (getArtifactFamily(artifact.deliverableType) === 'media') return ['xlsx', 'pdf']
  return ['docx', 'pdf']
}

export function getDefaultCreativeSpec(artifact: Artifact) {
  return (
    artifact.creative || {
      assetType: 'social-post' as const,
      visualDirection: 'Clean scientific visual system with premium editorial polish.',
      imagePrompt: artifact.content || '',
      aspectRatio: '4:5' as const,
      referenceNotes: '',
      deliverableSpecs: [],
      assetUrl: '',
      assetPath: '',
    }
  )
}

export function formatDeliverableLabel(deliverableType: DeliverableType) {
  return deliverableType.replace(/-/g, ' ')
}
