import mammoth from 'mammoth'
import { placeholdersToEditorHtml } from './templateSerialization'

export async function importDocxToEditorHtml(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({ arrayBuffer })
  return placeholdersToEditorHtml(result.value)
}
