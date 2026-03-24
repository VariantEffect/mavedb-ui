/**
 * Shared component-level types.
 *
 * Domain/API types live in src/schema/openapi.d.ts (auto-generated).
 * This file is for hand-written types shared across components.
 */

export interface NavMenuItem {
  label: string
  route?: string
  icon: string
  description?: string
  command?: () => void
}
