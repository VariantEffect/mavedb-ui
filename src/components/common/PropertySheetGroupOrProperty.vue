<template>

<div v-if="field.group" class="clearfix sfs-form-group">
  <div v-if="title != null" class="sfs-form-group-title">{{ title }}</div>
  <PropertySheetGroupOrProperty v-for="childField in field.contents || []" :key="childField.path" :saving="saving" :allItems="allItems" :editing="editing" :entitySchema="entitySchema" :field="childField" :items="items" :multiEditSummary="multiEditSummary" :nestedItemPath="nestedItemPath" :viewModel="viewModel" :ref="(el) => setInputRef(el, childField)" @did-blur-with-tab="onDidBlurFieldWithTab($event)" @update:propertyValue="forwardUpdateEvent" />
</div>
<div v-if="field.list && ((items.length == 1) && (editing && !field.readonly) || (formattedValue && (formattedValue.length > 0)))" class="clearfix sfs-form-list">
  <div><span v-if="title != null" class="sfs-form-list-title">{{ title }}</span><span v-if="editing && !field.readonly"> <Button :disabled="addingListItem" class="p-button-default p-button-rounded" icon="pi pi-plus" @click="addingListItem = true" /></span></div>
  <ul class="sfs-form-list-contents">
    <li v-for="(listItem, listItemIndex) in formattedValue" :key="listItemIndex">
      <PropertySheetListItem :ref="el => setListItemRef(el, listItemIndex)" :saving="saving" :allItems="allItems" :editing="false" :entitySchema="entitySchema" :listPath="path" :listItemIndex="null" :item="listItem" :listField="field" noun="Item" :list="formattedValue" :listParentItem="items[0]" :nestedItemPath="nestedItemPath" :stateNamespace="stateNamespace" />
    </li>
    <li v-if="addingListItem">
      <PropertySheetListItem :ref="el => setListItemRef(el, null)" :saving="saving" :allItems="allItems" :editing="editing" :entitySchema="entitySchema" :listPath="path" :listItemIndex="null" :item="null" :listField="field" noun="Item" :list="formattedValue" :listParentItem="items[0]" :nestedItemPath="nestedItemPath" :stateNamespace="stateNamespace" />
      <Button class="p-button-warning" label="Cancel" @click="addingListItem = false" />
      <Button class="p-button-default" label="Save" @click="onDidClickSaveNewListItemButton(null)" />
    </li>
  </ul>
</div>
<div v-if="field.relatedItem" class="clearfix sfs-form-group">
  <div v-if="title != null" class="sfs-form-group-title">{{ title }}</div>
  <PropertySheetGroupOrProperty v-for="childField in field.contents || []" :key="childField.path" :saving="saving" :allItems="allItems" :editing="editing" :entitySchema="entitySchema" :field="childField" :items="items" :multiEditSummary="multiEditSummary" :nestedItemPath="path" :viewModel="viewModel" :ref="(el) => setInputRef(el, childField)" @did-blur-with-tab="onDidBlurFieldWithTab($event)" @update:propertyValue="forwardUpdateEvent" />
</div>
<div v-if="!field.group && !field.relatedItem && !field.list && !editing" class="sfs-form-item">
  <span class="p-float-label">
    <div :id="scopedId('input-' + field.name)" class="sfs-readonly-field-value">{{ formattedValue }}</div>
    <label for="scopedId('input-' + field.name)">{{ title }}</label>
  </span>
</div>
<div v-if="!field.group && !field.relatedItem && !field.list && editing" class="sfs-form-item">
  <span v-if="customComponentName != null" class="p-float-label">
    <component
        v-if="items != null && customComponent != null"
        v-bind="field.componentProps || {}"
        v-model="formattedValue"
        :classes="fieldValidationInputClass"
        :is="customComponent"
        :items="items"
        :field="field"
        :placeholder="placeholder"
        :readonly="field.readonly"
        :showLabel="true"
        :title="title"
        :formatter="valueFormatter"
        :parser="valueParser"
        :viewModel="viewModel"
        @keydown="onKeyDownInInput"
    />
  </span>
  <span v-else-if="inputType == 'text' && field.autocomplete" class="p-float-label">
    <AutoComplete
        :id="scopedId('input-' + field.name)"
        :name="field.name"
        :class="fieldValidationInputClass"
        :disabled="field.readonly"
        :placeholder="placeholder"
        :suggestions="suggestions"
        ref="input"
        v-model="formattedValue"
        @complete="generateSuggestions($event)"
        @keydown="onKeyDownInInput"
    />
    <label :for="scopedId('input-' + field.name)">{{ title }}</label>
  </span>
  <span v-else-if="inputType == 'text'" class="p-float-label">
    <InputText
        type="text"
        :id="scopedId('input-' + field.name)"
        :name="field.name"
        :class="fieldValidationInputClass"
        :disabled="field.readonly"
        :placeholder="placeholder"
        ref="input"
        v-model="formattedValue"
        @keydown="onKeyDownInInput"
    />
    <label :for="scopedId('input-' + field.name)">{{ title }}</label>
  </span>
  <span v-else-if="inputType == 'tags'" class="p-float-label">
    <Chips
        :id="scopedId('input-' + field.name)"
        :name="field.name"
        :addOnBlur="true"
        :allowDuplicate="false"
        :class="fieldValidationInputClass"
        :disabled="field.readonly"
        :placeholder="placeholder"
        ref="input"
        v-model="formattedValue"
        @keydown="onKeyDownInInput"
    />
    <label :for="scopedId('input-' + field.name)">{{ title }}</label>
  </span>
  <span v-else-if="inputType == 'taxonomy-classification-picker'" class="p-float-label">
    <Chips
        :id="scopedId('input-' + field.name)"
        :name="field.name"
        :addOnBlur="true"
        :allowDuplicate="false"
        :class="fieldValidationInputClass"
        :disabled="field.readonly"
        :placeholder="placeholder"
        ref="input"
        v-model="formattedValue"
        @keydown="onKeyDownInInput"
    />
    <label :for="scopedId('input-' + field.name)">{{ title }}</label>
  </span>
  <span v-else-if="inputType == 'multilineText'" class="p-float-label">
    <Textarea
        :id="scopedId('input-' + field.name)"
        :name="field.name"
        :class="fieldValidationInputClass"
        :disabled="field.readonly"
        :placeholder="placeholder"
        :autoResize="true"
        ref="input"
        rows="5"
        v-model="formattedValue"
        @keydown="onKeyDownInInput"
    />
    <label :for="scopedId('input-' + field.name)">{{ title }}</label>
  </span>
  <span v-else-if="inputType == 'checkbox'">
    <Checkbox
        :id="scopedId('input-' + field.name)"
        :name="field.name"
        :binary="true"
        :disabled="field.readonly"
        ref="input"
        v-model="formattedValue"
        @keydown="onKeyDownInInput"
    />
    <label :for="scopedId('input-' + field.name)">{{ title }}</label>
  </span>
  <span v-else-if="inputType == 'dateCalendar'" class="p-float-label">
    <Calendar
        :id="scopedId('input-' + field.name)"
        :name="field.name"
        :disabled="field.readonly"
        :inputClass="fieldValidationInputClass"
        :manualInput="true"
        :placeholder="placeholder"
        :showButtonBar="true"
        :showIcon="true"
        dateFormat="yy-mm-dd"
        ref="input"
        :modelValue="formattedValue"
        @blur="onDidBlurDateInput"
        @date-select="onDidSelectInDateInput"
        @input="onDidTypeInDateInput"
        @keydown="onKeyDownInInput"
    />
    <Button v-if="!field.readonly && !formattedValue" alt="Today" class="p-button-default p-button-sm p-button-text lims-calendar-now-button" icon="pi pi-calendar-times" title="Today" @click="setToToday"></Button>
    <label :for="scopedId('input-' + field.name)">{{ title }}</label>
  </span>
  <span v-else-if="inputType == 'dateTimeCalendar'" class="p-float-label">
    <Calendar
        :id="scopedId('input-' + field.name)"
        :name="field.name"
        :disabled="field.readonly"
        :inputClass="fieldValidationInputClass"
        :placeholder="placeholder"
        :showButtonBar="true"
        :showIcon="true"
        :showTime="true"
        dateFormat="yy-mm-dd"
        hourFormat="12"
        ref="input"
        v-model="formattedValue"
        @keydown="onKeyDownInInput"
    />
    <Button v-if="!field.readonly && !formattedValue" alt="Now" class="p-button-default p-button-sm p-button-text lims-calendar-now-button" icon="pi pi-clock" title="Now" @click="setToNow"></Button>
    <label :for="scopedId('input-' + field.name)">{{ title }}</label>
  </span>
  <span v-else-if="inputType == 'dropdown'" class="p-float-label">
    <Dropdown
        :id="scopedId('input-' + field.name)"
        :name="field.name"
        :class="fieldValidationInputClass"
        :disabled="field.readonly"
        :options="enumOptions()"
        :optionLabel="optionTitleGetter"
        :optionValue="optionValueGetter"
        :placeholder="placeholder"
        ref="input"
        v-model="formattedValue"
        @keydown="onKeyDownInInput"
    />
    <label :for="scopedId('input-' + field.name)">{{ title }}</label>
  </span>
  <span v-else-if="inputType == 'listbox'" class="p-float-label">
    <Listbox
        :id="scopedId('input-' + field.name)"
        :name="field.name"
        :class="fieldValidationInputClass"
        :disabled="field.readonly"
        :metaKeySelection="false"
        :multiple="schemaProperty.type == 'array'"
        :options="enumOptions()"
        :optionLabel="optionTitleGetter"
        :optionValue="optionValueGetter"
        :placeholder="placeholder"
        ref="input"
        v-model="formattedValue"
        @keydown="onKeyDownInInput"
    />
    <label :for="scopedId('input-' + field.name)">{{ title }}</label>
  </span>
  <small v-if="error != null" :class="errorCssClass">
    {{ formatError(error) }}
  </small>
  <transition name="fade">
    <small v-if="showSlowDownWarning" class="sfs-slow-down-warning">
      Please wait, we're still saving a record!
    </small>
  </transition>
</div>

</template>

<script>

import 'datatables.net-dt'
import $ from 'jquery'
import _ from 'lodash'
import moment from 'moment'
import AutoComplete from 'primevue/autocomplete'
import Button from 'primevue/button'
import Calendar from 'primevue/calendar'
import Checkbox from 'primevue/checkbox'
import Chips from 'primevue/chips'
import Dropdown from 'primevue/dropdown'
import InputText from 'primevue/inputtext'
import Listbox from 'primevue/listbox'
import Textarea from 'primevue/textarea'
import {useField} from 'vee-validate'

import PropertySheetListItem from '@/components/common/PropertySheetListItem'
import useScopedId from '@/composables/scoped-id'
// import {componentFromModule} from '@/lib/modules'
// import modules from '@/modules'
// import Items from '@/utilities/items'

function viewModelPathToValidatorPath(path) {
  return path.replace(/\./g, ':')
}

const beepSound = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=")

function beep() {
  beepSound.play()
}

const modules = {}

function componentFromModule() {
  /*
  if (componentName == 'RelatedItemPicker') {
    return RelatedItemPicker
  }
  for (const moduleName in modules) {
    const module = modules[moduleName]
    const component = _.get(module, ['components', ...componentName.split('/')])
    if (component) {
      return component
    }
  }
  */
  return null
}

export default {
  name: 'PropertySheetGroupOrProperty',
  components: {AutoComplete, Button, Calendar, Checkbox, Chips, Dropdown, InputText, Listbox, PropertySheetListItem, Textarea},
  emits: [
    'update:propertyValue',
    'did-blur-with-tab'
  ],

  setup: (props) => {
    let value, errors, validationMetadata = [null, [], {}]
    if (props.field.path) {
      if (!props.field.group && !props.field.list && !props.field.relatedItem) {
        ({value, errors, meta: validationMetadata} = useField(viewModelPathToValidatorPath(props.field.path)))
      }
    }
    return {
      ...useScopedId(),
      errors,
      validationMetadata,
      value
    }
  },

  props: {
    allItems: {
      type: Array,
      default: () => []
    },
    editing: {
      type: Boolean,
      default: true
    },
    saving: {
      type: Boolean,
      default: true
    },
    entitySchema: {
      type: Object,
      required: true
    },
    field: {
      type: Object,
      default: () => ({})
    },
    items: {
      type: Array,
      default: () => []
    },
    nestedItemPath: {
      type: String,
      default: null
    },
    multiEditSummary: {
      type: Object,
      default: null
    },
    viewModel: {
      type: Object,
      default: () => ({})
    }
  },

  data: () => ({
    addingListItem: false,
    formattedValue: null,
    suggestions: [],
    listItemRefs: {},
    showSlowDownWarning: false,
    inputRefs: {}
  }),

  computed: {
    error: function() {
      return this.validationMetadata.pending ? null : _.first(this.errors)
    },

    errorCssClass: function() {
      if (_.isObject(this.error) && (this.error.severity == 'warn')) {
        return 'p-warning'
      }
      return 'p-error'
    },

    title: function() {
      let title = _.get(this.field, 'title', null)
      if ((title == null) && (this.field.path != null)) {
        title = _.capitalize(_.lowerCase(_.last(this.field.path.split('.'))))
      }
      return title
    },

    fieldValidationInputClass: function() {
      let self = this
      let classes = []
      if (self.originalNumValues > 1) {
        classes.push('p-replacing-multiple-values')
      }
      if (this.error != null) {
        if (this.error.severity == 'warn') {
          classes.push('p-warning')
        } else {
          classes.push('p-invalid')
        }
      } else if (!self.validationMetadata.valid) {
        classes.push('p-invalid')
      } else if (self.validationMetadata.dirty) (
        classes.push('sfs-dirty')
      )
      return classes.join(' ')
    },

    originalNumValues: function() {
      return (this.multiEditSummary && this.multiEditSummary[this.path]) ? this.multiEditSummary[this.path].numValues : 0
    },

    path: function() {
      return this.field.path
      //return [this.schemaPath || null, this.field.path].filter(x => x != null).join('.')
    },

/*
    pathRelativeToNestedItem: function() {
      if (!this.nestedItemPath) {
        return this.path
      } else if (this.path.startsWith(`${this.nestedItemPath}.`)) {
        return this.path.slice(this.nestedItemPath.length + 1)
      } else {
        console.log(`WARNING: Inconsistent nested item path. (Current field path="${this.path}", current nested item path="${this.nestedItemPath}")`)
        return this.path
      }
    },*/

    placeholder: function() {
      return (this.originalNumValues > 1) ? (this.originalNumValues + ' values') : null
    },

    schemaProperty: function() {
      return this.field.path ? this.findProperty(this.field.path) : null
    },

    inputType: function() {
      return this.field.inputType || (this.schemaProperty ? this.defaultInputTypeForProperty(this.schemaProperty) : null)
    },

    customComponent: function() {
      return this.customComponentName && componentFromModule(this.customComponentName)
    },

    customComponentName: function() {
      return this.inputType == 'custom' ? this.field.customComponent : null
    },

    valueFormatter: function() {
      let format = this.valueFormat
      if (format) {
        return _.get(_.get(modules, format), 'format', _.identity)
      }
      return _.identity
    },

    valueParser: function() {
      let format = this.valueFormat
      if (format) {
        return _.get(_.get(modules, format), 'parse', _.identity)
      }
      return _.identity
    },

    valueFormat: function() {
      if (this.field.format) {
        return this.field.format
      }
      if (this.schemaProperty) {
        switch (this.schemaProperty.type) {
        case 'string':
          switch (this.schemaProperty.format) {
          case 'date':
            return 'default.formats.date'
          case 'date-time':
           // Backwards! Let's stop using "formats" for this purpose.
            return 'default.formats.dateTimeInverse'
          case 'time':
            return 'default.formats.time'
          default:
            break
          }
          break
        default:
          return 'text'
        }
      }
      return null
    }
  },

  watch: {
    saving: {
      handler: function(newValue) {
        if (!newValue) {
          this.showSlowDownWarning = false
        }
      }
    },
    viewModel: {
      deep: true,
      handler: function(newValue, oldValue) {
        const oldFieldValue = _.get(oldValue, this.field.path, null)
        const newFieldValue = _.get(this.viewModel, this.field.path, null)
        if (!_.isEqual(newFieldValue, oldFieldValue)) {
          this.value = newFieldValue
        }
      }
    },
    formattedValue: {
      handler: async function(newFormattedValue, oldFormattedValue) {
        if (newFormattedValue != oldFormattedValue) {
          if (this.editing && !this.field.readonly) {
            const oldValue = this.value
            let parsingError = false
            try {
              this.value = this.valueParser(newFormattedValue)
            } catch (err) {
              console.log('WARNING: Error when parsing value.', err)
              this.value = null
              parsingError = true
            }
            if (!parsingError && (this.value != oldValue)) {
              // This condition only obtains when the user has made a change (and not when a new item is loaded).
              this.formattedValue = this.valueFormatter(this.value)
              this.$emit('update:propertyValue', {dataPath: this.path, newValue: this.value, oldValue})
            }
          }
        }
      },
      immediate: true
    },
    value: {
      handler: function(newValue, oldValue) {
        if (!this.field.relatedItem && (newValue != oldValue)) {
          this.formattedValue = this.valueFormatter(newValue)
        }
      },
      immediate: true
    }
  },

  beforeUpdate() {
    this.inputRefs = {}
  },

  methods: {
    setToNow() {
      const oldValue = this.value
      const newValue = new moment().toISOString()
      this.value = newValue
      this.$emit('update:propertyValue', {dataPath: this.path, newValue, oldValue})
    },

    setToToday() {
      const oldValue = this.value
      const newValue = new moment().local().format('YYYY-MM-DD')
      this.value = newValue
      this.$emit('update:propertyValue', {dataPath: this.path, newValue, oldValue})
    },

    setInputRef(element, field) {
      if (element) {
        this.inputRefs[field.name] = element
      }
    },

    formatError(error) {
      if (_.isObject(error)) {
        return error.message
      } else {
        return error
      }
    },

    setListItemRef(element, listItemIndex) {
      if (element) {
        this.listItemRefs[(listItemIndex == null) ? 'new' : listItemIndex] = element
      }
    },

    onDidClickSaveNewListItemButton(listItemIndex) {
      const listItemEditor = this.listItemRefs[(listItemIndex == null) ? 'new' : listItemIndex]
      if (listItemEditor && listItemEditor.validate() && listItemEditor.isDirty()) {
        const editedListItem = listItemEditor.getEditedListItem()
        if (listItemIndex == null) {
          let newList = (this.value || [])
          newList.push(editedListItem)
          this.formattedValue = newList
          this.addingListItem = false
        }
      }
    },

    defaultInputTypeForProperty(schemaProperty) {
      if (schemaProperty.readonly) {
        switch (schemaProperty.type) {
        case 'array':
          return 'tags'
        case 'boolean':
          return 'checkbox'
        default:
          return 'text'
        }
      }
      if (schemaProperty.enum) {
        return 'dropdown'
      }
      switch (schemaProperty.type) {
      case 'array':
        if (schemaProperty.format == 'taxonomy-classification') {
          return 'taxonomy-classification-picker'
        }
        return 'tags'
      case 'boolean':
        return 'checkbox'
      case 'string':
        switch (schemaProperty.format) {
        case 'date':
          return 'dateCalendar'
        case 'date-time':
          return 'dateTimeCalendar'
        default:
          return 'text'
        }
      default:
        return 'text'
        //console.log(`WARNING: In property sheet, no default input type for property of type ${schemaProperty.type}`)
      }
    },

    findProperty(path) {
      const property = this.findPropertyInSchema(path.split('.'), this.entitySchema)
      if (property == null) {
        console.log(`WARNING: In PropertySheetGroupOrProperty, unknown property (path="${path}")`)
      }
      return property
    },

    findPropertyInSchema(path, schema) {
      switch (schema.type) {
      case 'object':
        {
          const subschema = _.get(schema, ['properties', path[0]], null)
          if ((path.length == 1) || (subschema == null)) {
            return subschema
          } else {
            return this.findPropertyInSchema(_.slice(path, 1), subschema)
          }
        }
      default:
        // TODO Warn that we're trying to find a property in a non-object schema.
        return null
      }
    },

    forwardUpdateEvent(event) {
      this.$emit('update:propertyValue', event)
    },

    focus(subfieldPath = null) {
      if (subfieldPath && subfieldPath.length > 0 && this.inputRefs[subfieldPath[0].name]) {
        this.inputRefs[subfieldPath[0].name].focus(subfieldPath.slice(1))
      } else if (this.$refs.input) {
        this.$refs.input.$el.focus()
      }
    },

    generateSuggestions: function() {
      return []
    },

    /*
    // TODO Make async?
    generateSuggestions: function(event) {
      let self = this
      let search = event.query
      self.suggestions = Items.autoComplete(self.path, search, self.allItems)
    },
    */

    enumOptions: function() {
      let options = this.schemaProperty.enum || []
      if (this.schemaProperty.type == 'array') {
        options = _.get(this.schemaProperty, 'items.enum', [])
      }
      if (!this.field.required) {
        options = _.clone(options)
        options.unshift({title: '(none)', value: null})
      }
      return options
    },

    optionTitleGetter: function(option) {
      return _.isObject(option) ? option.title : option
    },

    optionValueGetter: function(option) {
      return _.isObject(option) ? option.value : option
    },

    onDidBlurDateInput: function(event) {
      const text = event.target.value
      if (text.match(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/)) {
        // We should have already set the value in onDidTypeInDateInput, but set it again just in case.
        this.formattedValue = text
      }
    },

    onDidSelectInDateInput: function(selectedDate) {
      // Normally, this happens using two-way data binding on the Calendar component. But we are not using two-way
      // binding here because we want to allow typing, and with two-way binding and manual entry enabled, the value
      // gets set as soon as the user types the year part.
      this.formattedValue = moment(selectedDate).format('YYYY-MM-DD')
    },

    onDidTypeInDateInput: function(event) {
      const input = event.target
      let text = input.value
      text = text.replaceAll(/[^0-9]/g, '')
      if (text.length >= 4) {
        text = `${text.slice(0, 4)}-${text.slice(4)}`
      }
      if (text.length >= 7) {
        text = `${text.slice(0, 7)}-${text.slice(7)}`
      }
      if (text.length >= 10) {
        text = text.slice(0, 10)
      }
      input.value = text
      setTimeout(function(){ input.selectionStart = input.selectionEnd = 10000 }, 0)
      if (text.length == 10) {
        this.formattedValue = text
      } else if (text.length == 0) {
        this.formattedValue = null
      }
    },

    onDidBlurFieldWithTab: function({event, field}) {
      if (!this.saving) {
        this.$emit('did-blur-with-tab', {event, field})
      }
    },

    onKeyDownInInput: function() {
      if (this.saving) {
        event.preventDefault()
        event.stopPropagation()
        beep()
        this.showSlowDownWarning = true
        return
      }
      switch (event.key) {
        case 'Down':
        case 'ArrowDown':
          if ($(this.$refs.input?.$el).is('.p-dropdown') && !this.$refs.input?.overlayVisible) {
            event.preventDefault()
            event.stopPropagation()
            this.$refs.input.show()
          }
          break
        case 'Tab':
          this.$emit('did-blur-with-tab', {event, field: this.field})
          break
        default:
          break
      }
    }
  }
}

</script>

<style scoped>

.clearfix:after,
.clearfix:before {
  display: table;
  content: "";
  clear: both;
}

.sfs-form-group {
  float: left;
  width: 100%; /* Was 568px */
}

.sfs-form-group-title {
  font-variant: small-caps;
  text-align: left;
  margin: 16px 16px 0 16px;
}

.p-input-filled .p-float-label .p-replacing-multiple-values ~ label {
  top: 0.25rem !important;
  margin-top: 0;
  background: transparent;
  font-size: 12px;
}

.p-float-label .sfs-readonly-field-value {
  padding-top: 1rem;
  min-height: 22px;
  width: 268px;
  text-align: right;
  border-bottom: 1px solid #ddd;
}

.p-float-label .sfs-readonly-field-value ~ label {
  padding: 2px 4px;
  margin-left: -4px;
  font-size: 12px;
  top: 0.25rem !important;
  margin-top: 0;
  background: transparent;
}

ul.sfs-form-list-contents {
  list-style: none;
  padding-left: 0;
}

ul.sfs-form-list-contents li {
  border-top: 1px solid #ddd;
}

ul.sfs-form-list-contents li:last-child {
  border-bottom: 1px solid #ccc;
}

.fade-enter-active {
}
.fade-leave-active {
  transition: opacity 2s;
}
.fade-enter, .fade-leave-to {
  opacity: 0;
}

.lims-calendar-now-button {
  position: absolute;
  top: 6px;
  right: 30px;
  z-index: 1000;
}

</style>
