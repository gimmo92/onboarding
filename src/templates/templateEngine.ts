import Handlebars from 'handlebars'
import type { MergeContext } from './employeeMergeContext'

const compiledCache = new Map<string, HandlebarsTemplateDelegate>()

function compileTemplate(htmlWithPlaceholders: string): HandlebarsTemplateDelegate {
  const cached = compiledCache.get(htmlWithPlaceholders)
  if (cached) {
    return cached
  }

  const compiled = Handlebars.compile(htmlWithPlaceholders, {
    noEscape: true,
    strict: false,
  })
  compiledCache.set(htmlWithPlaceholders, compiled)
  return compiled
}

export function renderTemplateHtml(
  htmlWithPlaceholders: string,
  context: MergeContext
): string {
  const template = compileTemplate(htmlWithPlaceholders)
  return template(context).trim()
}

export function extractMergeFieldKeys(htmlWithPlaceholders: string): string[] {
  const keys = new Set<string>()
  const pattern = /\{\{([^{}]+)\}\}/g
  let match = pattern.exec(htmlWithPlaceholders)
  while (match) {
    keys.add(match[1].trim())
    match = pattern.exec(htmlWithPlaceholders)
  }
  return [...keys]
}
