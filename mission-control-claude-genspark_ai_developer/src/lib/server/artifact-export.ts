import ExcelJS from 'exceljs'
import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { slugifyFilePart } from '@/lib/artifacts'
import { htmlToPlainText } from '@/lib/output-html'
import { Artifact, ArtifactExport } from '@/lib/types'

interface ExportArtifactInput {
  artifact: Artifact
  clientName?: string
  missionTitle?: string
  agentName?: string
  format: ArtifactExport['format']
}

const GENERATED_ROOT = path.join(process.cwd(), 'public', 'generated', 'artifacts')

function nowStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-')
}

function buildBaseName(artifact: Artifact) {
  return `${slugifyFilePart(artifact.title || artifact.deliverableType)}-${nowStamp()}`
}

function buildMetaLines(input: ExportArtifactInput) {
  return [
    `Deliverable Type: ${input.artifact.deliverableType}`,
    `Client: ${input.clientName || 'General Ops'}`,
    `Mission: ${input.missionTitle || 'Unlinked mission'}`,
    `Lead Agent: ${input.agentName || 'Iris'}`,
    `Status: ${input.artifact.status}`,
    `Generated: ${new Date().toLocaleString('en-US', { hour12: false })}`,
  ]
}

function getContentParagraphs(content?: string) {
  return htmlToPlainText(content || 'No content was stored for this artifact.')
    .split(/\n\s*\n/)
    .map((chunk) => chunk.replace(/\r/g, '').trim())
    .filter(Boolean)
}

function getBulletLines(content?: string) {
  return htmlToPlainText(content || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/^[-*]\s+/, '').replace(/^\d+\.\s+/, '').trim())
    .filter(Boolean)
}

function inferMediaRows(content?: string) {
  const bullets = getBulletLines(content)
  const defaults = ['Meta / Instagram', 'Google Search', 'YouTube', 'Email / CRM']

  const rows = (bullets.length ? bullets : defaults).slice(0, 6).map((line, index) => ({
    channel: defaults[index] || `Channel ${index + 1}`,
    audience: '',
    objective: '',
    budget: index === 0 ? 5000 : index === 1 ? 3000 : 1500,
    start: '',
    end: '',
    kpi: '',
    target: '',
    notes: line,
  }))

  return rows
}

async function createXlsxBuffer(input: ExportArtifactInput) {
  const workbook = new ExcelJS.Workbook()
  workbook.creator = 'Mission Control'
  workbook.created = new Date()
  workbook.modified = new Date()

  const overview = workbook.addWorksheet('Overview', {
    views: [{ state: 'frozen', ySplit: 5 }],
  })

  overview.mergeCells('A1:H1')
  overview.getCell('A1').value = input.artifact.title
  overview.getCell('A1').font = { name: 'Aptos Display', size: 18, bold: true, color: { argb: 'FF1F2937' } }
  overview.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F6FB' } }
  overview.getRow(1).height = 28

  buildMetaLines(input).forEach((line, idx) => {
    overview.getCell(`A${idx + 3}`).value = line.split(':')[0]
    overview.getCell(`B${idx + 3}`).value = line.split(':').slice(1).join(':').trim()
    overview.getCell(`A${idx + 3}`).font = { bold: true, color: { argb: 'FF4B5563' } }
  })

  overview.mergeCells('A10:H18')
  overview.getCell('A10').value = htmlToPlainText(input.artifact.content) || 'No content was stored for this artifact.'
  overview.getCell('A10').alignment = { wrapText: true, vertical: 'top' }
  overview.getCell('A10').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } }
  overview.getCell('A10').border = {
    top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
    right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
  }
  overview.columns = [
    { width: 18 },
    { width: 20 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
    { width: 16 },
  ]

  const plan = workbook.addWorksheet('Plan')
  const headers = ['Channel', 'Audience', 'Objective', 'Budget', 'Start', 'End', 'KPI', 'Target', 'Notes']
  plan.addRow(headers)
  plan.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  plan.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1D4ED8' } }
  plan.views = [{ state: 'frozen', ySplit: 1 }]

  inferMediaRows(input.artifact.content).forEach((row) => {
    plan.addRow([row.channel, row.audience, row.objective, row.budget, row.start, row.end, row.kpi, row.target, row.notes])
  })
  plan.addRow(['Total', '', '', { formula: 'SUM(D2:D7)' }, '', '', '', '', ''])

  plan.columns = [
    { width: 20 },
    { width: 20 },
    { width: 22 },
    { width: 14, style: { numFmt: '$#,##0' } },
    { width: 12 },
    { width: 12 },
    { width: 16 },
    { width: 16 },
    { width: 42 },
  ]

  const kpi = workbook.addWorksheet('KPI Forecast')
  kpi.addRow(['Channel', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Leads', 'CPL', 'Notes'])
  kpi.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
  kpi.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }
  kpi.views = [{ state: 'frozen', ySplit: 1 }]

  inferMediaRows(input.artifact.content).forEach((row, index) => {
    const sheetRow = index + 2
    kpi.addRow([
      row.channel,
      row.budget,
      '',
      '',
      { formula: `IF(C${sheetRow}=0,0,D${sheetRow}/C${sheetRow})` },
      '',
      { formula: `IF(F${sheetRow}=0,0,B${sheetRow}/F${sheetRow})` },
      row.notes,
    ])
  })

  kpi.columns = [
    { width: 20 },
    { width: 14, style: { numFmt: '$#,##0' } },
    { width: 14 },
    { width: 14 },
    { width: 12, style: { numFmt: '0.00%' } },
    { width: 12 },
    { width: 14, style: { numFmt: '$#,##0.00' } },
    { width: 42 },
  ]

  return workbook.xlsx.writeBuffer()
}

async function createDocxBuffer(input: ExportArtifactInput) {
  const contentParagraphs = getContentParagraphs(input.artifact.content)
  const metadata = buildMetaLines(input)

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: input.artifact.title,
            heading: HeadingLevel.TITLE,
            spacing: { after: 240 },
          }),
          ...metadata.map(
            (line) =>
              new Paragraph({
                children: [
                  new TextRun({
                    text: `${line.split(':')[0]}: `,
                    bold: true,
                  }),
                  new TextRun(line.split(':').slice(1).join(':').trim()),
                ],
                spacing: { after: 80 },
              })
          ),
          new Paragraph({
            text: 'Working Draft',
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 240, after: 120 },
          }),
          ...contentParagraphs.map(
            (paragraph) =>
              new Paragraph({
                text: paragraph,
                spacing: { after: 140 },
              })
          ),
          ...(input.artifact.sourcePrompt
            ? [
                new Paragraph({
                  text: 'Execution Prompt',
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 240, after: 120 },
                }),
                new Paragraph({
                  text: input.artifact.sourcePrompt,
                  spacing: { after: 140 },
                }),
              ]
            : []),
          ...(input.artifact.creative
            ? [
                new Paragraph({
                  text: 'Creative Production Pack',
                  heading: HeadingLevel.HEADING_1,
                  spacing: { before: 240, after: 120 },
                }),
                new Paragraph(`Asset Type: ${input.artifact.creative.assetType}`),
                new Paragraph(`Aspect Ratio: ${input.artifact.creative.aspectRatio}`),
                new Paragraph(`Visual Direction: ${input.artifact.creative.visualDirection}`),
                new Paragraph(`Image Prompt: ${input.artifact.creative.imagePrompt || 'Not set'}`),
                new Paragraph(`Reference Notes: ${input.artifact.creative.referenceNotes || 'None'}`),
              ]
            : []),
        ],
      },
    ],
  })

  return Packer.toBuffer(doc)
}

async function createPdfBuffer(input: ExportArtifactInput) {
  const pdfDoc = await PDFDocument.create()
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  let page = pdfDoc.addPage([612, 792])
  let y = 740
  const drawWrapped = (text: string, options?: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; gap?: number }) => {
    const size = options?.size || 11
    const font = options?.bold ? bold : regular
    const color = options?.color || rgb(0.15, 0.18, 0.24)
    const lines = text.split('\n').flatMap((line) => {
      const words = line.split(/\s+/)
      const wrapped: string[] = []
      let current = ''
      for (const word of words) {
        const trial = current ? `${current} ${word}` : word
        if (font.widthOfTextAtSize(trial, size) > 500 && current) {
          wrapped.push(current)
          current = word
        } else {
          current = trial
        }
      }
      if (current) wrapped.push(current)
      return wrapped
    })

    for (const line of lines) {
      if (y < 60) {
        y = 740
        page = pdfDoc.addPage([612, 792])
      }
      page.drawText(line, { x: 56, y, size, font, color })
      y -= size + (options?.gap ?? 4)
    }
  }

  drawWrapped(input.artifact.title, { size: 20, bold: true, gap: 8 })
  y -= 8
  buildMetaLines(input).forEach((line) => drawWrapped(line, { size: 10, color: rgb(0.35, 0.39, 0.47) }))
  y -= 10
  drawWrapped('Working Draft', { size: 14, bold: true, gap: 6 })
  getContentParagraphs(input.artifact.content).forEach((paragraph) => {
    drawWrapped(paragraph, { size: 11, gap: 5 })
    y -= 4
  })

  if (input.artifact.creative) {
    y -= 6
    drawWrapped('Creative Production Pack', { size: 14, bold: true, gap: 6 })
    drawWrapped(`Asset Type: ${input.artifact.creative.assetType}`)
    drawWrapped(`Aspect Ratio: ${input.artifact.creative.aspectRatio}`)
    drawWrapped(`Visual Direction: ${input.artifact.creative.visualDirection}`)
    drawWrapped(`Image Prompt: ${input.artifact.creative.imagePrompt || 'Not set'}`)
    drawWrapped(`Reference Notes: ${input.artifact.creative.referenceNotes || 'None'}`)
  }

  if (input.artifact.sourcePrompt) {
    y -= 6
    drawWrapped('Execution Prompt', { size: 14, bold: true, gap: 6 })
    drawWrapped(input.artifact.sourcePrompt, { size: 10 })
  }

  return Buffer.from(await pdfDoc.save())
}

async function ensureOutputDir() {
  await mkdir(GENERATED_ROOT, { recursive: true })
}

export async function exportArtifactToFile(input: ExportArtifactInput): Promise<ArtifactExport> {
  await ensureOutputDir()

  const baseName = buildBaseName(input.artifact)
  const fileName = `${baseName}.${input.format}`
  const filePath = path.join(GENERATED_ROOT, fileName)

  let buffer: Buffer
  if (input.format === 'xlsx') {
    buffer = Buffer.from(await createXlsxBuffer(input))
  } else if (input.format === 'docx') {
    buffer = await createDocxBuffer(input)
  } else {
    buffer = await createPdfBuffer(input)
  }

  await writeFile(filePath, buffer)

  return {
    id: `${input.artifact.id}-${input.format}-${Date.now()}`,
    format: input.format,
    fileName,
    path: filePath,
    publicUrl: `/api/artifacts/download?fileName=${encodeURIComponent(fileName)}`,
    createdAt: new Date().toISOString(),
    notes: input.format === 'xlsx' ? 'Structured media workbook generated from the saved artifact.' : 'Client-ready export generated from the saved artifact.',
  }
}
