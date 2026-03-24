/** Roles assignable to a user on a data set (experiment / score set). */
export type DataSetRole = 'owner' | 'contributor'

/** Roles assignable to a user on a collection. */
export type CollectionRole = 'admin' | 'editor' | 'viewer'

/** All roles across entity types. */
export type Role = DataSetRole | CollectionRole

export interface CollectionRoleOption {
  title: string
  value: CollectionRole
}

export const collectionRoleOptions: CollectionRoleOption[] = [
  {title: 'Admin', value: 'admin'},
  {title: 'Editor', value: 'editor'},
  {title: 'Viewer', value: 'viewer'}
]
