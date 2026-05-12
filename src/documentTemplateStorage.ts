import type { DocumentTemplate, DocumentTemplateVersion } from './documentTemplates'
import { loadCollection, saveCollection, type PersistResult } from './lib/collectionStorage'

const TABLE = 'onboarding_document_templates'
const KEY = 'hr-document-templates:v2'
const LEGACY_KEY = 'hr-document-templates:v1'

function isDocumentTemplateVersion(value: unknown): value is DocumentTemplateVersion {
  if (!value || typeof value !== 'object') {
    return false
  }

  const version = value as DocumentTemplateVersion
  return (
    typeof version.version === 'number' &&
    typeof version.createdAt === 'string' &&
    typeof version.htmlWithPlaceholders === 'string' &&
    typeof version.editorJson === 'object' &&
    version.editorJson !== null
  )
}

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
    template.versions.length > 0 &&
    template.versions.every(isDocumentTemplateVersion)
  )
}

function readLegacyTemplates(): DocumentTemplate[] {
  try {
    const raw = localStorage.getItem(LEGACY_KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data.filter(isDocumentTemplate)
  } catch {
    return []
  }
}

export function loadDocumentTemplates(): Promise<DocumentTemplate[]> {
  return loadCollection(TABLE, KEY, isDocumentTemplate).then(async (templates) => {
    if (templates.length > 0) {
      return templates
    }

    const legacy = readLegacyTemplates()
    if (legacy.length === 0) {
      return templates
    }

    const migrated = await saveDocumentTemplates(legacy)
    return migrated.ok ? legacy : templates
  })
}

export function saveDocumentTemplates(list: DocumentTemplate[]): Promise<PersistResult> {
  return saveCollection(TABLE, KEY, list, isDocumentTemplate)
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
