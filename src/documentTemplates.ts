import mammoth from 'mammoth'

export const DOCUMENT_TEMPLATE_TAGS = [
  { key: 'nome', label: 'Nome', token: '{{nome}}' },
  { key: 'cognome', label: 'Cognome', token: '{{cognome}}' },
  { key: 'data_assunzione', label: 'Data assunzione', token: '{{data_assunzione}}' },
  { key: 'ruolo', label: 'Ruolo', token: '{{ruolo}}' },
  { key: 'manager', label: 'Manager', token: '{{manager}}' },
  { key: 'sede', label: 'Sede', token: '{{sede}}' },
] as const

export type DocumentTemplateTagKey = (typeof DOCUMENT_TEMPLATE_TAGS)[number]['key']

export type DocumentTemplate = {
  id: string
  name: string
  fileName: string
  mimeType: string
  storageData: string
  extractedText?: string
  tags: DocumentTemplateTagKey[]
  createdAt: string
}

const TAG_TOKEN_BY_KEY = new Map(
  DOCUMENT_TEMPLATE_TAGS.map((tag) => [tag.key, tag.token] as const)
)

export function isWordDocumentFile(file: File): boolean {
  const lower = file.name.toLowerCase()
  return lower.endsWith('.doc') || lower.endsWith('.docx')
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

export async function extractDocumentText(file: File): Promise<string> {
  if (file.name.toLowerCase().endsWith('.docx')) {
    const arrayBuffer = await file.arrayBuffer()
    const result = await mammoth.extractRawText({ arrayBuffer })
    return result.value
  }

  return ''
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

export function documentTemplateLabel(
  templates: DocumentTemplate[],
  templateId?: string
): string | null {
  if (!templateId) return null
  return templates.find((template) => template.id === templateId)?.name ?? null
}

export function formatDocumentTags(tags: DocumentTemplateTagKey[]): string {
  if (!tags.length) return 'Nessun tag rilevato'
  return tags
    .map((key) => TAG_TOKEN_BY_KEY.get(key) ?? `{{${key}}}`)
    .join(', ')
}
