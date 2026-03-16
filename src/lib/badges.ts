// Centralised badge configuration for MvBadge.
// All badge variants share the same shape: dot + label with Tailwind classes.

export interface BadgeConfig {
  label: string
  classes: string
  dotClass: string
}

const UNKNOWN: BadgeConfig = {label: 'Unknown', classes: 'bg-neutral-100 text-neutral-500', dotClass: 'bg-neutral-400'}

// ── Status ───────────────────────────────────────────────────────────────────

export type Status = 'published' | 'unpublished' | 'superseded'

export const statusBadges: Record<Status, BadgeConfig> = {
  published: {label: 'Published', classes: 'bg-published-light text-published', dotClass: 'bg-published-dot'},
  unpublished: {label: 'Unpublished', classes: 'bg-unpublished-light text-unpublished', dotClass: 'bg-unpublished-dot'},
  superseded: {label: 'Superseded', classes: 'bg-superseded-light text-superseded', dotClass: 'bg-superseded-dot'}
}

// ── Role ─────────────────────────────────────────────────────────────────────

export type Role = 'owner' | 'contributor' | 'admin' | 'editor' | 'viewer'

export const roleBadges: Record<Role, BadgeConfig> = {
  owner: {label: 'Owner', classes: 'bg-role-admin-light text-role-admin', dotClass: 'bg-role-admin'},
  contributor: {label: 'Contributor', classes: 'bg-chip text-text-secondary', dotClass: 'bg-neutral-400'},
  admin: {label: 'Admin', classes: 'bg-role-admin-light text-role-admin', dotClass: 'bg-role-admin'},
  editor: {label: 'Editor', classes: 'bg-role-editor-light text-role-editor', dotClass: 'bg-role-editor'},
  viewer: {label: 'Viewer', classes: 'bg-chip text-text-secondary', dotClass: 'bg-neutral-400'}
}

// ── Visibility ───────────────────────────────────────────────────────────────

export const visibilityBadges: Record<'public' | 'private', BadgeConfig> = {
  public: {label: 'Public', classes: 'bg-sage-light text-sage-dark', dotClass: 'bg-sage'},
  private: {label: 'Private', classes: 'bg-chip text-text-muted', dotClass: 'bg-text-muted'}
}

// ── Lookup ───────────────────────────────────────────────────────────────────

const allBadges: Record<string, BadgeConfig> = {
  ...statusBadges,
  ...roleBadges,
  ...visibilityBadges
}

/** Look up a badge config by key, falling back to a neutral "Unknown" badge. */
export function getBadge(key: string): BadgeConfig {
  return allBadges[key] || UNKNOWN
}
