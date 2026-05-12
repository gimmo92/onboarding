import type { JSONContent } from '@tiptap/core'

export type DocumentTemplateVersion = {
  version: number
  createdAt: string
  editorJson: JSONContent
  htmlWithPlaceholders: string
  note?: string
}

export type DocumentTemplate = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  currentVersion: number
  versions: DocumentTemplateVersion[]
}

export function documentTemplateLabel(
  templates: DocumentTemplate[],
  templateId?: string
): string | null {
  if (!templateId) return null
  return templates.find((template) => template.id === templateId)?.name ?? null
}

export function getCurrentTemplateVersion(
  template: DocumentTemplate
): DocumentTemplateVersion | null {
  return (
    template.versions.find((version) => version.version === template.currentVersion) ??
    template.versions.at(-1) ??
    null
  )
}

export function formatTemplateVersionLabel(version: DocumentTemplateVersion): string {
  const date = new Date(version.createdAt).toLocaleString('it-IT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
  return `v${version.version} · ${date}`
}
