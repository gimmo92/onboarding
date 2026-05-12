import type { Employee } from './types'
import { loadCollection, saveCollection, type PersistResult } from './lib/collectionStorage'

const TABLE = 'onboarding_employees'
const KEY = 'hr-on-offboarding:v1'

function isEmployee(value: unknown): value is Employee {
  if (!value || typeof value !== 'object') {
    return false
  }

  const employee = value as Employee
  return (
    typeof employee.id === 'string' &&
    typeof employee.firstName === 'string' &&
    typeof employee.lastName === 'string' &&
    typeof employee.email === 'string' &&
    typeof employee.department === 'string' &&
    (employee.flow === 'onboarding' || employee.flow === 'offboarding') &&
    typeof employee.referenceDate === 'string' &&
    typeof employee.createdAt === 'string' &&
    Array.isArray(employee.steps)
  )
}

export function loadEmployees(): Promise<Employee[]> {
  return loadCollection(TABLE, KEY, isEmployee)
}

export function saveEmployees(list: Employee[]): Promise<PersistResult> {
  return saveCollection(TABLE, KEY, list, isEmployee)
}
