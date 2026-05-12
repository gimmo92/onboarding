import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

GlobalWorkerOptions.workerSrc = pdfWorker

export const DOCUMENT_TEMPLATE_TAGS = [
  { key: 'nome', label: 'Nome', token: '{{nome}}' },
  { key: 'cognome', label: 'Cognome', token: '{{cognome}}' },
  { key: 'data_assunzione', label: 'Data assunzione', token: '{{data_assunzione}}' },
  { key: 'ruolo', label: 'Ruolo', token: '{{ruolo}}' },
  { key: 'manager', label: 'Manager', token: '{{manager}}' },
  { key: 'sede', label: 'Sede', token: '{{sede}}' },
] as const

export type DocumentTemplateTagKey = (typeof DOCUMENT_TEMPLATE_TAGS)[number]['key']

export const DOCUMENT_TEMPLATE_DUMMY_DATA: Record<DocumentTemplateTagKey, string> = {
  nome: 'Mario',
  cognome: 'Rossi',
  data_assunzione: '12/05/2026',
  ruolo: 'Specialista amministrativo',
  manager: 'Laura Bianchi',
  sede: 'Milano',
}

export type DocumentTemplate = {
  id: string
  name: string
  fileName: string
  storageData: string
  extractedText?: string
  tags: DocumentTemplateTagKey[]
  createdAt: string
}

const TAG_TOKEN_BY_KEY = new Map(
  DOCUMENT_TEMPLATE_TAGS.map((tag) => [tag.key, tag.token] as const)
)

export function isPdfDocumentFile(file: File): boolean {
  const lower = file.name.toLowerCase()
  return file.type === 'application/pdf' || lower.endsWith('.pdf')
}

export function detectDocumentTags(text: string): DocumentTemplateTagKey[] {
  const found = new Set<DocumentTemplateTagKey>()

  for (const tag of DOCUMENT_TEMPLATE_TAGS) {
    if (text.includes(tag.token)) {
      found.add(tag.key)
    }
  }

  return DOCUMENT_TEMPLATE_TAGS.map((tag) => tag.key).filter((key) => found.has(key))
}

export async function extractPdfText(arrayBuffer: ArrayBuffer): Promise<string> {
  const pdf = await getDocument({ data: arrayBuffer }).promise
  const parts: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const content = await page.getTextContent()
    const pageText = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ')
      .trim()
    if (pageText) {
      parts.push(pageText)
    }
  }

  return parts.join('\n')
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Lettura file non riuscita'))
        return
      }
      const base64 = result.split(',')[1]
      if (!base64) {
        reject(new Error('Codifica file non riuscita'))
        return
      }
      resolve(base64)
    }
    reader.onerror = () => reject(reader.error ?? new Error('Lettura file non riuscita'))
    reader.readAsDataURL(file)
  })
}

export function templatePdfBlobUrl(template: DocumentTemplate): string {
  const binary = atob(template.storageData)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  const blob = new Blob([bytes], { type: 'application/pdf' })
  return URL.createObjectURL(blob)
}

export function applyDummyDataToText(text: string): string {
  let result = text
  for (const tag of DOCUMENT_TEMPLATE_TAGS) {
    result = result.replaceAll(tag.token, DOCUMENT_TEMPLATE_DUMMY_DATA[tag.key])
  }
  return result
}

export function documentTemplateLabel(
  templates: DocumentTemplate[],
  templateId?: string
): string | null {
  if (!templateId) return null
  return templates.find((template) => template.id === templateId)?.name ?? null
}

export function formatDocumentTags(tags: DocumentTemplateTagKey[]): string {
  if (!tags.length) return 'Nessun campo mappato'
  return tags
    .map((key) => TAG_TOKEN_BY_KEY.get(key) ?? `{{${key}}}`)
    .join(', ')
}
