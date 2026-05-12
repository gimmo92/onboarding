export type MergeFieldCategoryId =
  | 'dipendente'
  | 'contratto'
  | 'manager'
  | 'azienda'
  | 'sistema'

export type MergeFieldDefinition = {
  key: string
  label: string
  category: MergeFieldCategoryId
}

export const MERGE_FIELD_CATEGORY_LABELS: Record<MergeFieldCategoryId, string> = {
  dipendente: 'Dipendente',
  contratto: 'Contratto',
  manager: 'Manager',
  azienda: 'Azienda',
  sistema: 'Sistema',
}

export const MERGE_FIELDS: MergeFieldDefinition[] = [
  { key: 'dipendente.nome', label: 'Nome dipendente', category: 'dipendente' },
  { key: 'dipendente.cognome', label: 'Cognome dipendente', category: 'dipendente' },
  { key: 'dipendente.codice_fiscale', label: 'Codice fiscale', category: 'dipendente' },
  { key: 'dipendente.data_nascita', label: 'Data di nascita', category: 'dipendente' },
  { key: 'dipendente.luogo_nascita', label: 'Luogo di nascita', category: 'dipendente' },
  { key: 'dipendente.indirizzo', label: 'Indirizzo', category: 'dipendente' },
  { key: 'dipendente.email', label: 'Email dipendente', category: 'dipendente' },
  { key: 'dipendente.telefono', label: 'Telefono dipendente', category: 'dipendente' },
  { key: 'contratto.data_assunzione', label: 'Data assunzione', category: 'contratto' },
  { key: 'contratto.ruolo', label: 'Ruolo', category: 'contratto' },
  { key: 'contratto.livello_ccnl', label: 'Livello CCNL', category: 'contratto' },
  { key: 'contratto.ral', label: 'RAL', category: 'contratto' },
  { key: 'contratto.sede', label: 'Sede di lavoro', category: 'contratto' },
  { key: 'contratto.tipo_contratto', label: 'Tipo contratto', category: 'contratto' },
  {
    key: 'contratto.scadenza_periodo_prova',
    label: 'Scadenza periodo di prova',
    category: 'contratto',
  },
  { key: 'manager.manager_nome', label: 'Nome manager', category: 'manager' },
  { key: 'manager.manager_cognome', label: 'Cognome manager', category: 'manager' },
  { key: 'manager.manager_email', label: 'Email manager', category: 'manager' },
  { key: 'azienda.ragione_sociale', label: 'Ragione sociale', category: 'azienda' },
  { key: 'azienda.piva', label: 'Partita IVA', category: 'azienda' },
  { key: 'azienda.sede_legale', label: 'Sede legale', category: 'azienda' },
  { key: 'azienda.legale_rappresentante', label: 'Legale rappresentante', category: 'azienda' },
  { key: 'sistema.data_oggi', label: 'Data odierna', category: 'sistema' },
  { key: 'sistema.anno_corrente', label: 'Anno corrente', category: 'sistema' },
]

const MERGE_FIELD_BY_KEY = new Map(MERGE_FIELDS.map((field) => [field.key, field] as const))

export function mergeFieldLabel(fieldKey: string): string {
  return MERGE_FIELD_BY_KEY.get(fieldKey)?.label ?? fieldKey
}

export function mergeFieldsByCategory(): Array<{
  category: MergeFieldCategoryId
  label: string
  fields: MergeFieldDefinition[]
}> {
  return (Object.keys(MERGE_FIELD_CATEGORY_LABELS) as MergeFieldCategoryId[]).map((category) => ({
    category,
    label: MERGE_FIELD_CATEGORY_LABELS[category],
    fields: MERGE_FIELDS.filter((field) => field.category === category),
  }))
}
