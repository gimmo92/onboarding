import type { DocumentTemplate, DocumentTemplateVersion } from './documentTemplates'

const KEY = 'hr-document-templates:v2'

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
