<template>
  <Listbox
      v-model="selectedOptionValues"
      :filter="true"
      :filterFields="['value']"
      :filterPlaceholder="title"
      :multiple="true"
      :options="sortedOptions"
      class="mavedb-listbox"
      emptyFilterMessage="No matching filters"
      emptyMessage="No filters"
      optionValue="value"
  >
    <template #header>
      <div class="mavedb-listbox-controls">
      </div>
    </template>
    <template #option="slotProps">
      <div>
        <span>{{ optionLabel ? optionLabel(slotProps.option.value) : slotProps.option.title || optionLabel ? optionLabel(slotProps.option.value) : slotProps.option.value }}</span>
        <Badge v-if="slotProps.option.badge" :value="slotProps.option.badge" class="badge"></Badge>
      </div>
    </template>
  </Listbox>
</template>

<script>

import _ from 'lodash'
import Badge from 'primevue/badge'
import Listbox from 'primevue/listbox'

export default {
  name: 'SelectList',
  components: {Badge, Listbox},

  props: {
    options: {
      type: Array,
      default: () => []
    },
    optionLabel: {
      type: Function,
      default: null
    },
    order: {
      type: Array,
      default: () => ['value', 'asc']
    },
    title: {
      type: String,
      default: null
    },
    value: {
      type: Array,
      default: () => []
    }
  },
  data: function() {
    return {
      selectedOptionValues: this.value
    }
  },
  computed: {
    sortedOptions: function() {
      if (!this.order) {
        return this.options
      }
      const ascending = _.sortBy(this.options, (o) => {
        const sortValue = o[this.order[0]]
        return _.isString(sortValue) ? sortValue.toLowerCase() : sortValue
      })
      return this.order[1] == 'desc' ? _.reverse(ascending) : ascending
    }
  },
  watch: {
    options: {
      handler: function() {
        const optionValues = this.options.map((o) => o.value)
        this.selectedOptionValues = this.selectedOptionValues.filter((v) => optionValues.includes(v))
      }
    },
    selectedOptionValues: {
      handler: function() {
        this.$emit('input', this.selectedOptionValues)
        // console.log(this.selectedOptionValues)
      }
    }
  },
  methods: {
  }
}

</script>

<style scoped>

.badge {
  float: right;
}

.mavedb-listbox.p-listbox {
  border: 0 none;
  background: none;
}

.mavedb-listbox.p-listbox::v-deep .p-listbox-header {
  border: 0 none;
  background: none;
  padding-left: 0;
  padding-right: 0;
}

.mavedb-listbox.p-listbox::v-deep .mavedb-listbox-controls {
  float: right;
  padding: 0.5rem 0.5rem 0.5rem 0;
}

/* Make room for extra controls beside the header. */
.mavedb-listbox.p-listbox::v-deep .p-listbox-filter-container {
  max-width: 75%; /* TODO Calculate the actual max. */
}

/* Make the text box similar to .p-inputtext-sm. */
.mavedb-listbox.p-listbox::v-deep .p-listbox-filter {
  padding: 0.5rem;
  font-size: 0.875rem;
}

.mavedb-listbox.p-listbox::v-deep .p-listbox-list-wrapper {
  height: 150px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  overflow-x: hidden;
  overflow-y: scroll;
  background: #ffff;
}

.mavedb-listbox.p-listbox::v-deep .p-listbox-list .p-listbox-item {
  padding: 0.2rem 0.4rem;
}

</style>
