import type { DocumentTemplate, DocumentTemplateVersion } from './documentTemplates'

const KEY = 'hr-document-templates:v2'
const LEGACY_KEY = 'hr-document-templates:v1'

function isDocumentTemplate(value: unknown): value is DocumentTemplate {
  if (!value || typeof value !== 'object') {
    return false
  }

  const template = value as DocumentTemplate
  return (
    typeof template.id === 'string' &&
    typeof template.name === 'string' &&
    typeof template.createdAt === 'string' &&
    typeof template.updatedAt === 'string' &&
    typeof template.currentVersion === 'number' &&
    Array.isArray(template.versions) &&
    template.versions.length > 0
  )
}

function readTemplatesFromKey(storageKey: string): DocumentTemplate[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data.filter(isDocumentTemplate)
  } catch {
    return []
  }
}

export function loadDocumentTemplates(): DocumentTemplate[] {
  const current = readTemplatesFromKey(KEY)
  if (current.length > 0) {
    return current
  }

  const legacy = readTemplatesFromKey(LEGACY_KEY)
  if (legacy.length > 0) {
    saveDocumentTemplates(legacy)
  }

  return legacy
}

export function saveDocumentTemplates(list: DocumentTemplate[]): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(list))
    return true
  } catch {
    return false
  }
}

export function upsertDocumentTemplate(
  list: DocumentTemplate[],
  template: DocumentTemplate
): DocumentTemplate[] {
  const index = list.findIndex((item) => item.id === template.id)
  if (index === -1) {
    return [template, ...list]
  }
  const next = [...list]
  next[index] = template
  return next
}

export function appendTemplateVersion(
  template: DocumentTemplate,
  version: DocumentTemplateVersion
): DocumentTemplate {
  return {
    ...template,
    updatedAt: version.createdAt,
    currentVersion: version.version,
    versions: [...template.versions, version],
  }
}
