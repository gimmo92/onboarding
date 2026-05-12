import { mergeAttributes, Node } from '@tiptap/core'
import { mergeFieldLabel } from './mergeFields'

export type MergeFieldAttributes = {
  fieldKey: string
  fieldLabel: string
}

export const MergeField = Node.create({
  name: 'mergeField',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      fieldKey: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-field-key'),
        renderHTML: (attributes) => ({
          'data-field-key': attributes.fieldKey,
        }),
      },
      fieldLabel: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-field-label'),
        renderHTML: (attributes) => ({
          'data-field-label': attributes.fieldLabel,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-merge-field]',
        getAttrs: (element) => {
          if (!(element instanceof HTMLElement)) {
            return false
          }
          const fieldKey = element.getAttribute('data-field-key')
          if (!fieldKey) {
            return false
          }
          return {
            fieldKey,
            fieldLabel: element.getAttribute('data-field-label') ?? mergeFieldLabel(fieldKey),
          }
        },
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const label = node.attrs.fieldLabel ?? mergeFieldLabel(node.attrs.fieldKey)
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-merge-field': 'true',
        class: 'merge-field-chip',
        contenteditable: 'false',
      }),
      `[${label}]`,
    ]
  },

  renderText({ node }) {
    return `{{${node.attrs.fieldKey}}}`
  },
})
