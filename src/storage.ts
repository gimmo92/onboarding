import type { Employee } from './types'

const KEY = 'hr-on-offboarding:v1'

export function loadEmployees(): Employee[] {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const data = JSON.parse(raw) as unknown
    return Array.isArray(data) ? (data as Employee[]) : []
  } catch {
    return []
  }
}

export function saveEmployees(list: Employee[]) {
  localStorage.setItem(KEY, JSON.stringify(list))
}
