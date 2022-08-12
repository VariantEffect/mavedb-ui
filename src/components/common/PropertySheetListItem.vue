<template>

<div class="sfs-property-subsheet">
  <div v-if="(viewModel != null) && ['New', 'EditSingle'].includes(editingMode)" class="clearfix sfs-property-subsheet-form p-input-filled">
    <PropertySheetGroupOrProperty v-for="field in visibleFields" :saving="saving" :key="field.path" :allItems="allItems" :editing="editing" :entitySchema="listItemSchema" :field="field" :items="[listItem || {}]" :multiEditSummary="multiEditSummary" :ref="el => setInputRef(el, field)" validationState="v$.viewModel" @did-blur-with-tab="onDidBlurFieldWithTab($event)" @update:propertyValue="onDidUpdatePropertyValue" />
  </div>
</div>

</template>

<script>

import _ from 'lodash'
import 'datatables.net-dt'
import moment from 'moment'
import pluralize from 'pluralize'
import {useForm} from 'vee-validate'
import {computed, defineAsyncComponent} from 'vue'
import * as yup from 'yup'

import {findPropertyInSchema, schemaPropertyIsRequired} from '@/lib/schemas'

pluralize.addIrregularRule('specimen', 'specimens')
pluralize.addIrregularRule('sfs-specimen', 'sfs-specimens')

export default {
  name: 'PropertySheetListItem',

  components: {
    PropertySheetGroupOrProperty: defineAsyncComponent(() => import('@/components/common/PropertySheetGroupOrProperty'))
  },
  emits: ['propertySheet:willClose', 'propertySheet:didDeleteItem', 'propertySheet:didSaveItem'],

  setup: function(props) {
    const findProperty = (path) => {
      //let fullPath = `${this.listItemPath}.${path}`
      const property = findPropertyInSchema(props.listItemSchema, path)
      if (property == null) {
        console.log(`WARNING: In PropertySheetListItem, unknown property (path="${path}")`)
      }
      return property
    }

    const flattenLeafFields = (fields) => {
      return fields.map(field => field.group ? flattenLeafFields(field.contents) : [ field ]).flat()
    }

    const editingMode = computed(() => {
      if (props.item) {
        return 'EditSingle'
      } else {
        return 'New'
      }
    })

    const fields = computed(() => {
      return props.listField.itemFields || []
    })

    const leafFields = computed(() => {
      return flattenLeafFields(fields.value)
    })

    const visibleLeafFields = computed(() => {
      return leafFields.value
    })

    const form = useForm({
      validationSchema: validationSchema.value,
    })

    // Create a reactive validation schema.
    const validationSchema = computed(() => {
      const validations = {}
      for (let field of visibleLeafFields.value) {
        const schemaProperty = findProperty(field.path) || {}
        let fieldSchema = null
        switch (schemaProperty.type) {
          case 'integer':
            fieldSchema = yup.number().nullable().integer('Must be an integer')
            break
          case 'number':
            fieldSchema = yup.number('Must be numeric').nullable()
            break
          case 'string':
            switch (schemaProperty.format) {
              case 'date':
                fieldSchema = yup.date('Invalid date').nullable()
                break
              default:
                fieldSchema = yup.string('Must be text').nullable()
                break
            }
            break
          default:
            fieldSchema = yup.mixed().nullable()
            break
        }
        if (schemaPropertyIsRequired(props.entitySchema.value, field.path)) {
          fieldSchema = fieldSchema.required('Required')
        }
        // TODO ? Restore this when autoAdvance=true, but prevent excessive validations
        //if (!props.autoAdvance && schemaProperty.unique && (props.items.length == 1) && !fieldBelongsToRelatedItem(field.path)) {
          //validations[field.path].unique = helpers.withMessage('Already used', (v) => Items.validateUniqueness(field.path, v, this.items[0]._id, this.entityType, this.draftBatchId))
        //}

        validations[field.path] = fieldSchema
      }

      return validations
    })

    return {
      editingMode,
      fields,
      leafFields,
      visibleLeafFields,

      findProperty,
      // flattenLeafFields,

      form,
      formErrors: form.errors,
      resetForm: form.resetForm,
      formMeta: form.meta
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
    listIndex: {
      type: Number,
      default: null
    },
    listPath: {
      type: String,
      required: true
    },
    item: {
      type: Object,
      required: true
    },
    list: {
      type: Array,
      required: true
    },
    noun: {
      type: String,
      default: 'Item'
    },
    readonly: {
      type: [Boolean, null],
      default: null
    },
    listField: {
      type: Object,
      required: true
    }
  },

  data: function() {
    return {
      viewModel: null,
      inputRefs: {}
    }
  },

  computed: {

    hasValidationErrors: function() {
      return _.values(this.formErrors).some(error => _.isString(error) || (_.isObject(error) && (error.severity == 'error')))
    },

    hasValidationWarnings: function() {
      return _.values(this.formErrors).some(error => _.isObject(error) && (error.severity == 'warn'))
    },

    dirty: function() {
      return this.formMeta.dirty
    },

    valid: function() {
      return this.formMeta.valid || (!this.formMeta.pending && !this.hasValidationErrors && this.hasValidationWarnings)
    },

    validationPending: function() {
      return this.formMeta.pending || this.serverValidationPending
    },

    visibleFields: function() {
      return this.fields //this.filterVisibleFields(this.fields)
    },
    editableLeafFields: function() {
      return(this.visibleLeafFields.filter(field => !field.readonly))
    },
    multiEditSummary: function() {
      return this.itemsToMultiEditSummary([...(this.item ? [this.item] : [])])
    },
    listItemSchema: function() {
      const listSchema = findPropertyInSchema(this.entitySchema, this.listPath)
      if (!listSchema || !listSchema.items) {
        // TODO Warn about list schema not found
      }
      return listSchema.items
    }
  },

  watch: {
    item: {
      immediate: true,
      handler: function(newValue) {
        this.viewModel = this.listItemToViewModel(newValue)
        this.resetForm({
          values: this.viewModelToValidatorValues(this.viewModel)
        })
      }
    },
    visibleLeafFields: {
      handler: function() {
        const self = this
        this.viewModel = this.listItemToViewModel(self.item)
        self.$nextTick(() => {
          self.resetForm({
            values: self.viewModelToValidatorValues(self.viewModel)
          })
        })
      }
    }
  },

  beforeUpdate() {
    this.inputRefs = {}
  },

  methods: {

    focus() {
      this.setDefaultFocus()
    },

    setInputRef(element, field) {
      if (element) {
        this.inputRefs[field.name] = element
      }
    },

    onDidBlurFieldWithTab: function() { //{event, field}) {
      //this.$emit('did-blur-with-tab', {event, field})
    },

    setDefaultFocus: function() {
      let field = _.first(this.editableLeafFields)
      if (field && this.inputRefs[field.name]) {
        this.inputRefs[field.name].focus()
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // View model
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    itemsToMultiEditSummary: function(items) {
      var summary = {}
      for (let field of this.visibleLeafFields) {
        // When counting values, treat undefined and null as identical.
        const values = _.uniq(items.map(x => _.get(x, field.path, null)))
        let numValues = (values.length == 1) ? ((values[0] == null) ? 0 : 1) : values.length
        summary[field.path] = { numValues }
      }
      return summary
    },

    listItemToViewModel: function(listItem) {
      let self = this
      var viewModel = {}
      for (let field of self.visibleLeafFields) {
        let value = _.get(listItem, field.path, null)
        if (field.type == 'date') {
          value = (value == null) ? null : moment(value).format('YYYY-MM-DD')
        }
        viewModel[field.path] = value
      }
      return viewModel
    },

    listItemFromViewModel: function(originalListItem, viewModel) {
      var listItem = _.cloneDeep(originalListItem || {})
      for (let key in viewModel) {
        _.set(listItem, key, viewModel[key] || null)
      }
      listItem._id = _.get(originalListItem, '_id', undefined)
      return listItem
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Persistence
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    /*
    delete: async function() {
      let self = this
      let itemIds = self.items.map(i => i._id).filter(Boolean)
      for (const itemId of itemIds) {
        await self.beginDeletingItem({itemId})
        // TODO why does this get interrupted?
        self.$emit('propertySheet:didDeleteItem')
      }
    },*/

    getEditedListItem: function() {
      return this.listItemFromViewModel(this.item, this.viewModel)
    },

    save: function() {
      if (this.dirty && this.valid) {
        const editedListItem = this.listItemFromViewModel(this.item, this.viewModel)
        this.recordAutoCompleteEntries(editedListItem)
        //let list = _.clone(_.get(this.listParentItem, this.listPath, []))
        let list = _.clone(this.list || [])
        if (this.listIndex == null) {
          list.push(editedListItem)
        } else {
          list.splice(this.listIndex, 1, [editedListItem])
        }
        //self.saveItem({item: editedItem})
        this.$emit('propertySheetListItem:didRequestSave', {listIndex: this.listIndex, value: editedListItem})
      }
    },

    recordAutoCompleteEntries: function() {//item) {
      /*let self = this
      for (let field of self.leafFields) {
        if (field.autocomplete) {
          Items.recordAutoCompleteEntry(field.path, _.get(item, field.path)) // TODO Fix
        }
      }*/
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // String formatting functions for use in templates
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    pluralize: function(...args) {
      return pluralize(...args)
    },

    titleCase: function(s) {
      return _.startCase(_.lowerCase(s))
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Event handlers
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    onDidClickCloseButton: function() {
      this.hideDetail()
    },

    onDidClickDeleteButton: function() {
      let self = this
      if ((self.items.length > 0) && !self.items.some(x => x._id == null)) {
      //if ((self.items.length == 1) && (self.items[0]._id != null)) {
        const messageNounPhrase = (self.items.length == 1) ? ('this ' + self.noun) : ('these ' + pluralize(self.noun, self.items.length, true))
        const headerText = [
          'Delete',
          (self.items.length == 1) ? self.noun : pluralize(self.noun, self.items.length, true),
          (self.items.length == 1) ? _.get(self.items[0], 'ids.collectionId', null) : null
        ].filter(Boolean).join(' ')
        self.$confirm.require({
          // TODO Change word sample
          message: 'Are you sure you want to delete ' + messageNounPhrase + '?'
            + ((self.items.length == 1) ? ' It can be deleted because it has not been synced to ID3C.' : ''),
          header: headerText,
          icon: 'pi pi-exclamation-triangle',
          accept: () => {
            self.delete()
          }
        })
      } // TODO allow multiple deletion?
    },

    onDidClickEditButton: function() {
      this.setEditingDetailItems(true)
    },

    onDidClickNavigateButton: function(offset) {
      this.navigate(offset)
    },

    onDidClickSaveButton: function() {
      //self.v$.$touch()
      if (this.dirty && this.valid) {
        this.save()
      }
    },

    onDidUpdatePropertyValue: function(event) {
      const {dataPath, newValue} = event
      this.viewModel[dataPath] = newValue
    }

  }
}

</script>

<style scoped>

.clearfix:after {
  display: table;
  content: "";
  clear: both;
}

</style>
