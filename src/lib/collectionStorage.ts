import { getSupabaseClient } from './supabaseClient'

type PayloadRow = {
  id: string
  payload: unknown
}

function readLocalCollection<T>(storageKey: string, isValid: (value: unknown) => value is T): T[] {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return []
    const data = JSON.parse(raw) as unknown
    if (!Array.isArray(data)) return []
    return data.filter(isValid)
  } catch {
    return []
  }
}

function writeLocalCollection<T>(storageKey: string, items: T[]): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(items))
    return true
  } catch {
    return false
  }
}

export async function loadCollection<T extends { id: string }>(
  table: string,
  storageKey: string,
  isValid: (value: unknown) => value is T
): Promise<T[]> {
  const localItems = readLocalCollection(storageKey, isValid)
  const client = getSupabaseClient()
  if (!client) {
    return localItems
  }

  const { data, error } = await client
    .from(table)
    .select('id,payload')
    .order('updated_at', { ascending: false })

  if (error) {
    console.error(`Errore caricamento ${table}`, error)
    return localItems
  }

  const remoteItems = (data ?? [])
    .map((row) => {
      const payload = (row as PayloadRow).payload
      if (!isValid(payload)) {
        return null
      }
      return { ...payload, id: (row as PayloadRow).id }
    })
    .filter((item): item is T => item !== null)

  if (remoteItems.length > 0) {
    writeLocalCollection(storageKey, remoteItems)
    return remoteItems
  }

  if (localItems.length > 0) {
    const migrated = await saveCollection(table, storageKey, localItems, isValid)
    return migrated ? localItems : []
  }

  return []
}

export async function saveCollection<T extends { id: string }>(
  table: string,
  storageKey: string,
  items: T[],
  isValid: (value: unknown) => value is T
): Promise<boolean> {
  const validItems = items.filter((item) => isValid(item))
  const localSaved = writeLocalCollection(storageKey, validItems)
  const client = getSupabaseClient()
  if (!client) {
    return localSaved
  }

  const rows = validItems.map((item) => ({
    id: item.id,
    payload: item,
    updated_at: new Date().toISOString(),
  }))

  const { data: existing, error: existingError } = await client.from(table).select('id')
  if (existingError) {
    console.error(`Errore lettura ${table}`, existingError)
    return false
  }

  const nextIds = new Set(validItems.map((item) => item.id))
  const staleIds = (existing ?? [])
    .map((row) => String((row as { id: string }).id))
    .filter((id) => !nextIds.has(id))

  if (staleIds.length > 0) {
    const { error: deleteError } = await client.from(table).delete().in('id', staleIds)
    if (deleteError) {
      console.error(`Errore eliminazione ${table}`, deleteError)
      return false
    }
  }

  if (rows.length > 0) {
    const { error: upsertError } = await client.from(table).upsert(rows, { onConflict: 'id' })
    if (upsertError) {
      console.error(`Errore salvataggio ${table}`, upsertError)
      return false
    }
  }

  return true
}
