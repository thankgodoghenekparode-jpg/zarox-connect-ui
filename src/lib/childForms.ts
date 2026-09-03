export const CHILD_FORM_KEYWORDS = [
  'meter clear',
  'meter activation',
  'meter deactivation',
  'work permit',
  'zvend wallet',
]

export function isChildForm(name: string): boolean {
  const n = (name ?? '').toLowerCase()
  return CHILD_FORM_KEYWORDS.some((k) => n.includes(k))
}
