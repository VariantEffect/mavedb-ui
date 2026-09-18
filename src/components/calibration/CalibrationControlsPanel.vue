<template>
  <div class="controls-panel" :class="`tone-${tone}`">
    <!-- Header carries identity, state and the action; composition detail lives in the table's caption. -->
    <div class="panel-header" :class="{'panel-header-open': expanded}">
      <component
        :is="expandable ? 'button' : 'div'"
        :aria-controls="expandable ? tableId : undefined"
        :aria-expanded="expandable ? expanded : undefined"
        class="panel-title"
        :class="{'panel-title-button': expandable}"
        :type="expandable ? 'button' : undefined"
        @click="expandable && (expanded = !expanded)"
      >
        <i
          v-if="expandable"
          aria-hidden="true"
          class="pi text-[11px]"
          :class="expanded ? 'pi-chevron-down' : 'pi-chevron-right'"
        />
        <span>{{ summaryText }}</span>
        <span v-if="statusLabel" class="panel-status">{{ statusLabel }}</span>
      </component>
      <div v-if="$slots.actions" class="panel-actions">
        <slot name="actions" />
      </div>
    </div>

    <table v-if="expanded" :id="tableId" class="panel-table" :class="{'opacity-60': struck}">
      <caption class="sr-only">
        Calibration control variants and their clinical status
      </caption>
      <thead>
        <tr class="panel-thead-row">
          <th class="px-4 py-2 text-xs font-bold uppercase tracking-wide text-text-muted" scope="col">Variant</th>
          <th class="px-4 py-2 text-xs font-bold uppercase tracking-wide text-text-muted" scope="col">
            Clinical status
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="(row, idx) in visibleControls" :key="`${row.variant}-${idx}`" class="panel-body-row">
          <td class="break-all px-4 py-2 font-mono text-text-primary" :class="{'line-through': struck}">
            {{ row.variant }}
          </td>
          <td class="px-4 py-2">
            <MvBadge v-if="row.clinicalStatus" :value="row.clinicalStatus" />
            <span v-else class="text-xs italic text-text-muted">Unrecognized status</span>
          </td>
        </tr>
      </tbody>
      <tfoot>
        <tr>
          <td class="panel-foot" colspan="2">
            <div class="panel-foot-inner">
              <button
                v-if="controls.length > initialLimit"
                class="text-xs font-semibold text-sage hover:underline"
                type="button"
                @click="showAll = !showAll"
              >
                {{ showAll ? 'Show fewer' : `Show all ${controls.length} controls` }}
              </button>
              <span class="panel-composition">{{ compositionText }}</span>
            </div>
          </td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>

<script lang="ts">
import {defineComponent, type PropType, useId} from 'vue'

import MvBadge from '@/components/common/MvBadge.vue'

/** One row of the controls panel: a variant identifier and its status (null when unrecognized). */
export interface ControlRow {
  variant: string
  clinicalStatus: string | null
}

/**
 * How this set of controls relates to what will be saved. Drives the panel palette so the set that
 * is leaving and the set that is arriving are distinguishable at a glance.
 */
export type ControlsPanelTone = 'neutral' | 'adding' | 'removing' | 'warning'

export default defineComponent({
  name: 'CalibrationControlsPanel',

  components: {MvBadge},

  props: {
    controls: {type: Array as PropType<ControlRow[]>, required: true},
    /** Optional phrase appended to the control count, e.g. "attached" or "from controls.csv". */
    contextLabel: {type: String, default: ''},
    /** Short pending-change marker, e.g. "Removing". Rendered as a tone-colored tag beside the title. */
    statusLabel: {type: String, default: ''},
    tone: {type: String as PropType<ControlsPanelTone>, default: 'neutral'},
    /** Rows shown before the "show all" toggle appears; keeps a long upload quick to scan. */
    initialLimit: {type: Number, default: 5},
    /** Whether to expand all rows by default. */
    startExpanded: {type: Boolean, default: false}
  },

  setup() {
    return {tableId: `calibration-controls-panel-${useId()}`}
  },

  data() {
    return {expanded: this.startExpanded, showAll: false}
  },

  computed: {
    expandable(): boolean {
      return this.controls.length > 0
    },
    struck(): boolean {
      return this.tone === 'removing'
    },
    visibleControls(): ControlRow[] {
      return this.showAll ? this.controls : this.controls.slice(0, this.initialLimit)
    },
    summaryText(): string {
      const total = this.controls.length
      const noun = total === 1 ? 'control' : 'controls'
      return this.contextLabel ? `${total} ${noun} ${this.contextLabel}` : `${total} ${noun}`
    },
    compositionText(): string {
      const counts = {pathogenic: 0, benign: 0, unrecognized: 0}
      for (const row of this.controls) {
        if (row.clinicalStatus === 'pathogenic') counts.pathogenic++
        else if (row.clinicalStatus === 'benign') counts.benign++
        else counts.unrecognized++
      }
      const parts = [`${counts.pathogenic} pathogenic`, `${counts.benign} benign`]
      if (counts.unrecognized > 0) parts.push(`${counts.unrecognized} unrecognized`)
      return parts.join(' · ')
    }
  }
})
</script>

<style scoped>
/*
 * Tone drives the whole panel through three custom properties. The foreground is mixed 75% toward
 * black because the brand colors alone clear only ~3.3-3.8:1 against their own light tints, short
 * of the 4.5:1 AA floor for the header's 12px text.
 */
.tone-neutral {
  --tone-border: var(--color-border);
  --tone-bg: var(--color-surface);
  --tone-fg: var(--color-text-secondary);
}

.tone-adding {
  --tone-border: var(--color-mint);
  --tone-bg: var(--color-mint-light);
  --tone-fg: color-mix(in srgb, var(--color-sage-dark) 75%, black);
}

.tone-removing {
  --tone-border: var(--color-danger-border);
  --tone-bg: var(--color-danger-light);
  --tone-fg: color-mix(in srgb, var(--color-danger) 75%, black);
}

.tone-warning {
  --tone-border: var(--color-orange-border);
  --tone-bg: var(--color-orange-light);
  --tone-fg: color-mix(in srgb, var(--color-orange-cta-dark) 75%, black);
}

.controls-panel {
  overflow: hidden;
  border: 1px solid var(--tone-border);
  border-radius: 0.5rem;
  background: var(--tone-bg);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.panel-header-open {
  border-bottom: 1px solid var(--tone-border);
}

.panel-title {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 0.375rem;
  padding: 0.625rem 0.875rem;
  text-align: left;
  font-size: 12px;
  font-weight: 600;
  color: var(--tone-fg);
}

.panel-title-button:hover {
  background: rgb(0 0 0 / 4%);
}

.panel-title-button:active {
  background: rgb(0 0 0 / 8%);
}

/* Set apart from the title by case and spacing rather than a chip, to keep the header light. */
.panel-status {
  margin-left: 0.125rem;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.panel-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.25rem;
  padding-right: 0.5rem;
}

.panel-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

/* The variant column absorbs the slack so the status column shrinks to its content. */
.panel-table thead th:first-child,
.panel-table tbody td:first-child {
  width: 100%;
}

.panel-table thead th:last-child,
.panel-table tbody td:last-child {
  text-align: right;
  white-space: nowrap;
}

/* The flex row lives in a wrapper div: `display: flex` on a <td> drops it out of table layout,
   taking its colspan with it. */
.panel-foot {
  border-top: 1px solid rgb(0 0 0 / 5%);
  padding: 0.5rem 1rem;
}

.panel-foot-inner {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.panel-composition {
  margin-left: auto;
  font-size: 12px;
  color: var(--color-text-muted);
}

.panel-thead-row {
  border-bottom: 1px solid var(--tone-border);
  background: rgb(0 0 0 / 4%);
  text-align: left;
}

.panel-body-row {
  border-bottom: 1px solid rgb(0 0 0 / 5%);
}

.panel-body-row:last-child {
  border-bottom: 0;
}
</style>
