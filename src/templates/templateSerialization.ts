import type { Extensions, JSONContent } from '@tiptap/core'
import { generateHTML, generateJSON } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import { MergeField } from './mergeFieldExtension'
import { mergeFieldLabel } from './mergeFields'

const MERGE_PLACEHOLDER_PATTERN = /\{\{([^{}]+)\}\}/g

export function createTemplateEditorExtensions(): Extensions {
  return [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
    }),
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    MergeField,
  ]
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function serializeNodeToMergeHtml(node: JSONContent): string {
  if (node.type === 'mergeField') {
    const fieldKey = String(node.attrs?.fieldKey ?? '')
    return fieldKey ? `{{${fieldKey}}}` : ''
  }

  if (node.type === 'text') {
    let text = escapeHtml(node.text ?? '')
    if (node.marks) {
      for (const mark of node.marks) {
        if (mark.type === 'bold') text = `<strong>${text}</strong>`
        if (mark.type === 'italic') text = `<em>${text}</em>`
        if (mark.type === 'underline') text = `<u>${text}</u>`
      }
    }
    return text
  }

  const children = (node.content ?? []).map(serializeNodeToMergeHtml).join('')

  switch (node.type) {
    case 'doc':
      return children
    case 'paragraph': {
      const align = node.attrs?.textAlign
      const style = align ? ` style="text-align: ${align}"` : ''
      return `<p${style}>${children}</p>`
    }
    case 'heading': {
      const level = Number(node.attrs?.level ?? 1)
      const tag = level === 2 ? 'h2' : level === 3 ? 'h3' : 'h1'
      const align = node.attrs?.textAlign
      const style = align ? ` style="text-align: ${align}"` : ''
      return `<${tag}${style}>${children}</${tag}>`
    }
    case 'bulletList':
      return `<ul>${children}</ul>`
    case 'orderedList':
      return `<ol>${children}</ol>`
    case 'listItem':
      return `<li>${children}</li>`
    case 'table':
      return `<table>${children}</table>`
    case 'tableRow':
      return `<tr>${children}</tr>`
    case 'tableHeader':
      return `<th>${children}</th>`
    case 'tableCell':
      return `<td>${children}</td>`
    case 'hardBreak':
      return '<br />'
    default:
      return children
  }
}

export function serializeDocumentToMergeHtml(document: JSONContent): string {
  return serializeNodeToMergeHtml(document).trim()
}

export function editorDocumentToDisplayHtml(document: JSONContent): string {
  return generateHTML(document, createTemplateEditorExtensions())
}

export function placeholdersToEditorHtml(html: string): string {
  return html.replace(MERGE_PLACEHOLDER_PATTERN, (_match, rawKey: string) => {
    const fieldKey = rawKey.trim()
    const fieldLabel = mergeFieldLabel(fieldKey)
    return `<span data-merge-field="true" data-field-key="${fieldKey}" data-field-label="${fieldLabel}" class="merge-field-chip" contenteditable="false">[${fieldLabel}]</span>`
  })
}

export function mergeHtmlToEditorDocument(html: string): JSONContent {
  const prepared = placeholdersToEditorHtml(html)
  return generateJSON(prepared, createTemplateEditorExtensions())
}

export function emptyTemplateDocument(): JSONContent {
  return {
    type: 'doc',
    content: [{ type: 'paragraph' }],
  }
}
