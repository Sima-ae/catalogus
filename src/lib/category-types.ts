export type CategoryRecord = {
  id: string
  name: string
  slug: string
  description?: string | null
  parent_id?: string | null
  parent_name?: string | null
  active?: boolean | number
}
