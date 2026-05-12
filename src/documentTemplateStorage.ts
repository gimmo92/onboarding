import type { DocumentTemplate } from './documentTemplates'

const KEY = 'hr-document-templates:v1'

export function loadDocumentTemplates(): DocumentTemplate[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as unknown
    return Array.isArray(data) ? (data as DocumentTemplate[]) : []
  } catch {
    return []
  }
}

export function saveDocumentTemplates(list: DocumentTemplate[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}
