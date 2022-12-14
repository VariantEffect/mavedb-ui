<template>

  <div class="sfs-property-sheet">
    <div v-if="viewModel != null" class="clearfix sfs-property-sheet-header">
      <div class="sfs-title">{{(editing ? ((editingMode == 'New') ? 'New ' : 'Edit ') : '') + titleCase((editingMode == 'EditMultiple') ? pluralize(entityType.commonTitle, items.length, true) : entityType.commonTitle)}}<span v-if="(entityType.name == 'sfs-specimen') && (items.length == 1) && getPrimaryKeyValue(items[0]) && !draftBatchId"> <router-link :to="`/sfs-specimens/${getPrimaryKeyValue(items[0])}`"><Button class="sfs-nav-button p-button-link p-button-sm" label="Details" /></router-link></span></div>
      <div class="sfs-spacer"></div>
      <div class="sfs-property-sheet-controls">
        <Button v-for="(action, i) in viewActions" :key="i" :label="action.title" :style="{visibility: items.length == 1 ? 'visible' : 'hidden'}" @click="onDidClickActionButton(i)" />
        <Button v-if="navigationButtonsVisible" :style="{visibility: (previousItemId != null) ? 'visible' : 'hidden'}" class="p-button-info p-button-rounded" icon="pi pi-caret-up" @click="onDidClickNavigateButton(-1)" />
        <Button v-if="navigationButtonsVisible" :style="{visibility: (nextItemId != null) ? 'visible' : 'hidden'}" class="p-button-info p-button-rounded" icon="pi pi-caret-down" @click="onDidClickNavigateButton(1)" />
        <Button v-if="allowsDeletion && (editingMode != 'New') && editing" class="p-button-danger" label="Delete" @click="onDidClickDeleteButton" />
        <Button v-if="!editing" class="p-button-warning" label="Edit" @click="onDidClickEditButton" />
        <Button class="p-button-warning" :label="(editing && ((editingMode == 'New') || dirty)) ? 'Cancel' : 'Close'" v-tooltip.top="keyboardShortcutText('esc')" @click="onDidClickCloseButton" />
        <Button v-if="editing" class="p-button-primary" :disabled="!dirty || (valid && hasValidationWarnings)" label="Save" v-tooltip.top="keyboardShortcutText('cmd', 'S')" @click="onDidClickSaveButton" />
      </div>
    </div>
    <div v-if="editing && valid && hasValidationWarnings" class="sfs-property-sheet-validation-warning-controls">
      <div class="sfs-message p-warning">There are validation warnings.</div>
      <Button class="p-button-primary" label="Save Anyway" v-tooltip.top="keyboardShortcutText('cmd', 'S')" @click="onDidClickSaveAnywayButton" />
    </div>
    <div v-if="editing && hasGlobalValidationErrors" class="sfs-property-sheet-global-validation-errors">
      <div v-if="kitRegistrationNameMismatchError != null" class="sfs-property-sheet-kit-registration-name-mismatch-error">
        <div class="sfs-error-message">{{ kitRegistrationNameMismatchError.message }}</div>
        <div v-if="kitRegistrationNameMismatchError.persistentRedcapEventId != null">
          <div class="sfs-error-details">Legal name from enrollment: {{ get(kitRegistrationNameMismatchError, 'names.enrollmentLegalName.first') }} {{ get(kitRegistrationNameMismatchError, 'names.enrollmentLegalName.last') }}</div>
          <div class="sfs-error-details">Name from kit registration: {{ get(kitRegistrationNameMismatchError, 'names.kitRegistration.first') }} {{ get(kitRegistrationNameMismatchError, 'names.kitRegistration.last') }}</div>
          <div v-if="kitRegistrationNameMismatchError.redcapEventUrl"><a :href="kitRegistrationNameMismatchError.redcapEventUrl" target="_blank">See details on REDCap</a></div>
          <Button class="p-button-warning" label="Mark as Untestable" @click="onDidClickMarkUntestableButton(kitRegistrationNameMismatchError.persistentRedcapEventId)" />
          &nbsp;
          <Button class="p-button-primary" label="Override Name Mismatch" @click="onDidClickOverrideNameMismatchButton(kitRegistrationNameMismatchError.persistentRedcapEventId)" />
        </div>
      </div>
      <div v-else class="lims-global-errors">
        <div class="p-warning">
          <i class="pi pi-exclamation-triangle" />
          {{formErrors['*'].message}}
        </div>
      </div>
    </div>
    <div v-if="viewModel != null" class="clearfix sfs-property-sheet-form p-input-filled">
      <PropertySheetGroupOrProperty v-for="field in visibleFields" :key="field.path" :allItems="allItems" :editing="editing" :entitySchema="entityType.schema" :field="field" :items="items" :multiEditSummary="multiEditSummary" :ref="(el) => setInputRef(el, field)" :viewModel="viewModel" :saving="saving" @did-blur-with-tab="onDidBlurFieldWithTab($event)" @update:propertyValue="onDidUpdatePropertyValue" />
    </div>
    <div v-if="editing && valid && hasValidationWarnings && bottomControlsVisible" class="sfs-property-sheet-validation-warning-controls">
      <div class="sfs-message p-warning">There are validation warnings.</div>
      <Button class="p-button-primary" label="Save Anyway" v-tooltip.top="keyboardShortcutText('cmd', 'S')" @click="onDidClickSaveAnywayButton" />
    </div>
    <div v-if="(viewModel != null) && bottomControlsVisible" class="clearfix sfs-property-sheet-header">
      <div class="sfs-spacer"></div>
      <div class="sfs-property-sheet-controls">
        <Button v-for="(action, i) in viewActions" :key="i" :label="action.title" :style="{visibility: items.length == 1 ? 'visible' : 'hidden'}" @click="onDidClickActionButton(i)" />
        <Button v-if="navigationButtonsVisible" :style="{visibility: (previousItemId != null) ? 'visible' : 'hidden'}" class="p-button-info p-button-rounded" icon="pi pi-caret-up" @click="onDidClickNavigateButton(-1)" />
        <Button v-if="navigationButtonsVisible" :style="{visibility: (nextItemId != null) ? 'visible' : 'hidden'}" class="p-button-info p-button-rounded" icon="pi pi-caret-down" @click="onDidClickNavigateButton(1)" />
        <Button v-if="allowsDeletion && (editingMode != 'New') && editing" class="p-button-danger" label="Delete" @click="onDidClickDeleteButton" />
        <Button v-if="!editing" class="p-button-warning" label="Edit" @click="onDidClickEditButton" />
        <Button class="p-button-warning" :label="(editing && ((editingMode == 'New') || dirty)) ? 'Cancel' : 'Close'" v-tooltip.top="keyboardShortcutText('esc')" @click="onDidClickCloseButton" />
        <Button v-if="editing" class="p-button-primary" :disabled="!dirty || (valid && hasValidationWarnings)" label="Save" v-tooltip.top="keyboardShortcutText('cmd', 'S')" @click="onDidClickSaveButton" />
      </div>
    </div>
  </div>

</template>

<script>

import _ from 'lodash'
import $ from 'jquery'
import 'datatables.net-dt'
import pluralize from 'pluralize'
import Button from 'primevue/button'
import {v4 as uuidv4} from 'uuid'
import {useForm} from 'vee-validate'
import {computed} from 'vue'
import {mapActions, mapState, useStore} from 'vuex'
import * as yup from 'yup'

import moment from 'moment'

import PropertySheetGroupOrProperty from '@/components/common/PropertySheetGroupOrProperty'
import {findPropertyInSchema, findRelatedItemDefinitionsInSchema, schemaPropertyIsRequired} from '@/lib/schemas'
// import {uiCodeForEntityType} from '@/lib/modules'
// import {callCustomItemRestMethod, fetchItemByUniqueProperty} from '@/services/items'
// import Items from '@/utilities/items'
import useEntityTypes from '@/composition/entity-types'
import useKeyboardShortcuts from '@/composition/keyboard-shortcuts'

const isMac = () => navigator.userAgent.indexOf('Mac OS X') != -1

function viewModelPathToValidatorPath(path) {
  return path.replace(/\./g, ':')
}

function callCustomItemRestMethod() {
  return null
}

function fetchItemByUniqueProperty() {
  return null
}

function uiCodeForEntityType() {
  let entityTypeCustomizations = {}
  /*
  for (const moduleName in modules) {
    const module = modules[moduleName]
    const customization = _.get(module, `entity-types.${entityTypeName}`)
    if (customization) {
      _.merge(entityTypeCustomizations, customization)
    }
  }
  */
  return entityTypeCustomizations
}

export default {
  name: 'PropertySheet',

  components: { Button, PropertySheetGroupOrProperty },
  emits: ['propertySheet:willClose', 'propertySheet:didDeleteItem', 'propertySheet:didSaveItem'],

  setup: (props) => {
    const store = useStore()

    const primaryKey = computed(() => props.entityType.primaryKey || '_id')
    const getPrimaryKeyValue = computed(() => (item) => item == null ? null : item[primaryKey.value])

    const batchSaveAttempted = computed(() => {
      return _.get(store.state, props.stateNamespace).batchSaveAttempted
    })

    const fieldBelongsToRelatedItem = (path) => {
      return findRelatedItemDefinitions(path).length > 0
    }

    const findRelatedItemDefinitions = (path) => {
      return findRelatedItemDefinitionsInSchema(props.entityType.schema, path)
    }

    const flattenLeafFields = (fields) => {
      return fields.map(field => (field.group || field.relatedItem) ? flattenLeafFields(field.contents) : [field]).flat()
    }

    const editingMode = computed(() => {
      if (props.items.length == 1) {
        if (getPrimaryKeyValue.value(props.items[0]) != null) {
          return 'EditSingle'
        } else {
          return 'New'
        }
      } else if (props.items.length > 1) {
        // In this case we assume contractually that every item has an ID.
        return 'EditMultiple'
      } else {
        return 'None'
      }
    })

    const view = computed(() => {
      if (props.entityType) {
        for (const viewName of (props.viewNames || [`default-${props.editing ? 'edit' : 'view'}`, 'default'])) {
          const view = _.get(props.entityType, ['views', 'detail', viewName])
          if (view) {
            return view
          }
        }
      }
      return null
    })

    function generateFieldNames(field) {
      field.name = uuidv4()
      for (const subfield of field.contents || []) {
        generateFieldNames(subfield)
      }
    }

    // fields used to be a calculated property, but we need it to be accessible in setup().
    const fields = computed(() => {
      return (view.value ? view.value.fields.map(field => {
        generateFieldNames(field)
        //field.name = uuidv4()
        return field
      }) : null) || []
    })

    const leafFields = computed(() => {
      return flattenLeafFields(fields.value)
    })

    const visibleLeafFields = computed(() => {
      let visibleLeafFields = leafFields.value
      if (props.editingMode == 'EditMultiple') {
        visibleLeafFields = visibleLeafFields.filter(field => !field.unique && !field.list)
      }
      return visibleLeafFields
    })

    const findProperty = (path) => {
      const property = findPropertyInSchema(props.entityType.schema, path)
      if (property == null) {
        console.log(`WARNING: In PropertySheet, unknown property (path="${path}")`)
      }
      return property
    }

    // Create a reactive validation schema.
    const validationSchema = computed(() => {
      const validations = {}
      for (let field of visibleLeafFields.value) {
        if (!field.path) {
          continue
        }
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
        if (schemaPropertyIsRequired(props.entityType.schema, field.path) && (!props.draftBatchId || batchSaveAttempted.value) && (props.items.length == 1)) {
          fieldSchema = fieldSchema.required('Required')
        }
        // TODO Restore this when autoAdvance=true, but prevent excessive validations
        if (!props.autoAdvance && schemaProperty.unique && (props.items.length == 1) && !fieldBelongsToRelatedItem(field.path)) {
          //validations[field.path].unique = helpers.withMessage('Already used', (v) => Items.validateUniqueness(field.path, v, this.items[0]._id, this.entityType, this.draftBatchId))
        }

        validations[viewModelPathToValidatorPath(field.path)] = fieldSchema
      }

      return validations
    })

    // Create a Vee-Validate form context using the validation schema.

    const form = useForm({
      validationSchema: validationSchema.value
    })

    return {
      editingMode,
      view,
      fields,
      leafFields,
      visibleLeafFields,

      batchSaveAttempted,
      fieldBelongsToRelatedItem,
      findProperty,
      findRelatedItemDefinitions,
      // flattenLeafFields,

      form,
      formErrors: form.errors,
      resetForm: form.resetForm,
      formMeta: form.meta,
      setFieldValue: form.setFieldValue,
      // formValues: form.values,

      ..._.pick(useEntityTypes(), ['entityTypes']),
      ...useKeyboardShortcuts(),

      primaryKey,
      getPrimaryKeyValue
    }
  },

  props: {
    draftCommitValidationErrors: {
      type: Array,
      required: false,
      default: () => []
    },
    allowsDeletion: {
      type: Boolean,
      default: true
    },
    autoAdvance: {
      type: Boolean,
      default: false
    },
    editing: {
      type: Boolean,
      default: true
    },
    entityType: {
      type: Object,
      required: true
    },
    /*entityTypes: {
      type: Array,
      required: true
    },*/
    items: {
      type: Array,
      default: null
    },
    noun: {
      type: String,
      default: 'Item'
    },
    showBlanksWhenNotEditing: {
      type: Boolean,
      default: false
    },
    stateNamespace: {
      type: String,
      default: ''
    },
    draftBatchId: {
      type: String,
      default: null
    },
    viewNames: {
      type: Array,
      default: null
    }
  },

  data: function() {
    return {
      viewModel: {},
      generalErrors: [],
      inputRefs: {},
      relatedItemIds: {},
      serverValidationPending: false,
      saving: false
    }
  },

  computed: {

    viewActions: function() {
      return this.view.actions || []
    },

    navigationButtonsVisible: function() {
      return this.listNavigators != null && this.listNavigators.Items != null && this.items.length == 1 && this.getPrimaryKeyValue(this.items[0]) != null
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Editing state
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    hasValidationErrors: function() {
      return _.values(this.formErrors).some((error) => _.isString(error) || (_.isObject(error) && (error.severity == 'error')))
    },

    hasValidationWarnings: function() {
      return _.values(this.formErrors).some((error) => _.isObject(error) && (error.severity == 'warn'))
    },

    hasGlobalValidationErrors: function() {
      return this.formErrors['*'] != null
    },

    kitRegistrationNameMismatchError: function() {
      const globalError = this.formErrors['*']
      if (globalError && _.isObject(globalError) && globalError.errorName == 'sfs-redcap-kit-registration-name-mismatch') {
        return globalError
      }
      return null
    },

    dirty: function() {
      return this.formMeta.dirty
      //return this.v$.$anyDirty
    },

    valid: function() {
      return this.formMeta.valid || (!this.formMeta.pending && !this.hasValidationErrors && this.hasValidationWarnings)
      //return !this.v$.$invalid
    },

    validationPending: function() {
      return this.formMeta.pending || this.serverValidationPending
    },

    entityTypeCustomizations: function() {
      return this.entityType ? uiCodeForEntityType(this.entityType.name) : {}
    },
    visibleFields: function() {
      return this.filterVisibleFields(this.fields)
    },
    editableLeafFields: function() {
      return this.visibleLeafFields.filter(field => !field.readonly)
    },
    tabbableLeafFields: function() {
      return this.editableLeafFields.filter(field => field.inputType != 'custom')
    },
    multiEditSummary: function() {
      return this.itemsToMultiEditSummary(this.items)
    },
    nextItemId: function() {
      if ((this.listNavigators != null) && (this.listNavigators.Items != null) && (this.items.length == 1) && (this.getPrimaryKeyValue(this.items[0]) != null)) {
        const listItemIds = this.listNavigators.Items.relativeRowRecordIds(this.getPrimaryKeyValue(this.items[0]), 1, 1)
        if (listItemIds.length > 0) {
          return listItemIds[0]
        }
      }
      return null
    },
    previousItemId: function() {
      if ((this.listNavigators != null) && (this.listNavigators.Items != null) && (this.items.length == 1) && (this.getPrimaryKeyValue(this.items[0]) != null)) {
        const listItemIds = this.listNavigators.Items.relativeRowRecordIds(this.getPrimaryKeyValue(this.items[0]), -1, 1)
        if (listItemIds.length > 0) {
          return listItemIds[0]
        }
      }
      return null
    },
    bottomControlsVisible: function() {
      return this.visibleLeafFields.length > 10
    },
    ...mapState({
      allItems(state) {
        return _.get(state, this.stateNamespace).items
      },
      listNavigators(state) {
        return _.get(state, this.stateNamespace).listNavigators
      }
      /*batchSaveAttempted(state) {
        return _.get(state, this.stateNamespace).batchSaveAttempted
      }*/
    })
  },

  watch: {
    formErrors: {
      immediate: true,
      handler: function() {
        // This could lead to infinite recursion, but the method we call here checks to see that the new errors differ
        // from the old before applying them. This is still not an ideal approach, but without it, the property sheet
        // won't show draft commit errors when it is first opened.
        this.applyDraftCommitValidationErrors()
      }
    },
    draftCommitValidationErrors: {
      immediate: true,
      handler: function() {
        this.applyDraftCommitValidationErrors()
      }
    },
    items: {
      immediate: true,
      handler: function(newValue, oldValue) {
        if (!_.isEqual(newValue, oldValue)) {
          this.extractRelatedItemIdsFromItems(newValue)
          this.viewModel = this.itemsToViewModel(newValue)
          this.resetForm({
            values: this.viewModelToValidatorValues(this.viewModel)
          })
          this.applyDraftCommitValidationErrors()
        }
      },
      deep: true
    },
    dirty: {
      immediate: true,
      handler: function() {
        this.updateEditorRegistration()
      }
    },
    visibleLeafFields: {
      handler: function(newValue, oldValue) {
        if (!_.isEqual(newValue, oldValue)) {
          const self = this
          // TODO It's coming from here
          self.viewModel = self.itemsToViewModel(self.items) //, self.viewModel) to preserve changes hidden by the new view
          self.$nextTick(() => {
            self.resetForm({
              values: self.viewModelToValidatorValues(self.viewModel)
            })
            this.applyDraftCommitValidationErrors()
          })
        }
      }
    }
  },

  created: function() {
    let self = this
    self.onDidPressKey = function() {
      let command = isMac() ? event.metaKey : event.ctrlKey
      switch (event.key) {
      case 'Esc': // Edge-specific
      case 'Escape':
        if (!$(event.target).is('.p-dropdown.p-inputwrapper-focus input') && !$(event.target).is('.p-calendar input')) {
          event.preventDefault()
          event.stopPropagation()
          self.hideDetail()
        }
        break
      case 'Up':
      case 'ArrowUp':
        if (!$(event.target).is('.p-dropdown input')) {
          event.preventDefault()
          event.stopPropagation()
          self.navigate(-1)
        }
        break
      case 'Down':
      case 'ArrowDown':
        if (!$(event.target).is('.p-dropdown input')) {
          event.preventDefault()
          event.stopPropagation()
          self.navigate(1)
        }
        break
      case 's':
        if (command) {
          event.preventDefault()
          event.stopPropagation()
          if (self.valid && self.hasValidationWarnings) {
            self.onDidClickSaveAnywayButton()
          } else {
            self.onDidClickSaveButton()
          }
        }
        break
      default:
        break
      }
    }
    $(document).on('keydown', self.onDidPressKey)
  },

  beforeUpdate() {
    this.inputRefs = {}
  },

  updated() {
  },

  beforeUnmount: function() {
    this.deregisterEditor(this)
    $(document).off('keydown', this.onDidPressKey)
  },

  mounted: function() {
    this.setDefaultFocus()
  },

  methods: {
    onDidClickActionButton: async function(actionIndex) {
      const action = this.viewActions[actionIndex]
      if (action && action.restAction && this.items.length == 1 && this.getPrimaryKeyValue(this.items[0])) {
        await callCustomItemRestMethod(this.entityType, this.getPrimaryKeyValue(this.items[0]), action.restAction.name, {method: action.restAction.method || 'get'})
        this.$emit('propertySheet:didSaveItem') // Not exactly accurate. We *may* have done something to change the item and want to trigger a refresh.
      }
    },

    applyDraftCommitValidationErrors: function() {
      if (this.batchSaveAttempted) {
        const errorsByFieldPath = _.mapValues(
          _.groupBy(this.draftCommitValidationErrors, 'path'),
          (errors) => _.first(_.sortBy(errors, 'severity')) // Relies on the fact that 'error' < 'warn'
        )
        const newErrors = _.mapKeys(errorsByFieldPath, (value, key) => viewModelPathToValidatorPath(key))
        if (!_.isEqual(newErrors, this.formErrors)) {
          this.form.setErrors(newErrors)
        }
      }
    },

    get: function(...args) {
      return _.get(...args)
    },

    resetToOriginalItems: function() {
      this.viewModel = this.itemsToViewModel(this.items)
      this.generalErrors = []
      this.resetForm({
        values: this.viewModelToValidatorValues(this.viewModel)
      })
    },

    // Vee-Validate supports dotted paths but gives them special handling that causes problems for us. So we replace
    // dots with colons.
    viewModelToValidatorValues: function(viewModel) {
      return _.mapKeys(viewModel, (value, key) => viewModelPathToValidatorPath(key))
    },

    updateEditorRegistration: function(dirty = null) {
      if (dirty == null) {
        dirty = this.dirty
      }
      if (dirty) {
        this.registerEditor(this)
      } else {
        this.deregisterEditor(this)
      }
    },

    setInputRef(element, field) {
      if (element) {
        this.inputRefs[field.name] = element
      }
    },

    onDidBlurFieldWithTab: async function({event, field}) {
      if (this.autoAdvance && (this.visibleFields.length > 0)) {
        let navigationOffset = 0
        if (event.shiftKey && (field.name == _.first(this.tabbableLeafFields).name)) {
          navigationOffset = -1
        } else if (!event.shiftKey && (field.name == _.last(this.tabbableLeafFields).name)) {
          navigationOffset = 1
        }
        if (navigationOffset != 0) {
          let navigate = true
          event.preventDefault()
          event.stopPropagation()
          //await this.v$.$validate()
          if (this.valid) {
            if (this.dirty) {
              // OLD: TODO This is okay for now because it only occurs when editing a draft batch.
              // (Otherwise autoAdvance = false.) But we should perform validation here otherwise.
              navigate = await this.saveWithValidation()
            }
            if (navigate) {
              this.updateEditorRegistration(false)
              this.setDefaultFocus()
              this.navigate(navigationOffset)
            }
          }
        }
      }
    },

    relativePathToField(field, ancestorField) {
      if (ancestorField == field) {
        return [field]
      }
      for (const subfield of ancestorField.contents || []) {
        const subpath = this.relativePathToField(field, subfield)
        if (subpath) {
          return [ancestorField, ...subpath]
        }
      }
      return null
    },

    pathToField(field) {
      for (const ancestorField of this.fields) {
        const path = this.relativePathToField(field, ancestorField)
        if (path) {
          return path
        }
      }
      return null
    },

    setDefaultFocus: function() {
      let field = _.minBy(this.tabbableLeafFields.filter((f) => f.focusPriority != null), 'focusPriority')
          || _.first(this.tabbableLeafFields)
      if (field) {
        if (this.inputRefs[field.name]) {
          this.inputRefs[field.name].focus()
        } else {
          const path = this.pathToField(field)
          if (path && path.length > 0 && this.inputRefs[path[0].name]) {
            this.inputRefs[path[0].name].focus(path.slice(1))
          }
        }
      }
    },

    navigate: function(offset) {
      if ((this.listNavigators != null) && (this.listNavigators.Items != null) && (this.items.length == 1) && (this.getPrimaryKeyValue(this.items[0]) != null)) {
        const listItemIds = this.listNavigators.Items.relativeRowRecordIds(this.getPrimaryKeyValue(this.items[0]), offset, 1)
        if (listItemIds.length > 0) {
          this.selectItems({itemIds: listItemIds})
        }
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // View model
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    filterVisibleFields: function(fields) {
      const self = this
      return fields.map(field => {
        if (field.group || field.relatedItem) {
          const filteredSubfields = self.filterVisibleFields(field.contents)
          if (filteredSubfields.length > 0) {
            let filteredField = _.clone(field);
            filteredField.contents = filteredSubfields
            return filteredField
          } else {
            return null
          }
        } else if (field.path) {
          const schemaProperty = self.findProperty(field.path) || {}
          const cannotShowField = ((self.editingMode == 'EditMultiple') && ((schemaProperty.unique && !self.fieldBelongsToRelatedItem(field.path)) || field.list))

          // Same as itemsToMultiEditSummary()
          const values = _.uniq(self.items.map(x => _.get(x, field.path, null)))
          const numValues = (values.length == 1) ? ((values[0] == null) ? 0 : 1) : values.length

          return (cannotShowField || (!self.editing && !self.showBlanksWhenNotEditing && (numValues == 0))) ? null : field
        } else {
          return field
        }
      })
          .filter(Boolean)
    },

    itemsToMultiEditSummary: function(items) {
      let self = this
      var summary = {}
      for (let field of self.visibleLeafFields) {
        // When counting values, treat undefined and null as identical.
        const values = _.uniq(items.map(x => _.get(x, field.path, null)))
        const numValues = (values.length == 1) ? ((values[0] == null) ? 0 : 1) : values.length
        summary[field.path] = {numValues}
      }
      return summary
    },

    itemsToViewModel: function(items, viewModelToPersist) {
      const self = this
      const viewModel = viewModelToPersist ? _.clone(viewModelToPersist) : {}
      for (const field of self.visibleLeafFields) {
        let numValues = self.multiEditSummary[field.path].numValues
        let value = null
        if (numValues == 1) {
          value = _.get(items[0], field.path, null)
          if (field.type == 'date') {
            value = (value == null) ? null : moment(value).format('YYYY-MM-DD')
          }
        }
        viewModel[field.path] = value
      }
      return viewModel
    },

    applyNewRelatedItemIds(relatedItemIds, savedItem, itemBeforeSaving, targetItems) {
      const newRelatedItemPaths = _.sortBy(Object.keys(relatedItemIds))
          .filter(path => relatedItemIds[path] === null)
          .filter(path =>
            !_.isEmpty(_.get(itemBeforeSaving, path))
                && (_.get(itemBeforeSaving, path + `.${this.primaryKey}`) == null)
                && (_.get(savedItem, path + `.${this.primaryKey}`) != null)
          )
      for (let relatedItemPath of newRelatedItemPaths) {
        const newId = _.get(savedItem, relatedItemPath + `.${this.primaryKey}`)
        for (let item of targetItems) {
          _.set(item, relatedItemPath + `.${this.primaryKey}`, newId)
        }
      }
    },

    relatedItemsToCreateOnSave: function(itemToSave) {
      let self = this
      const newRelatedItemPaths = _.sortBy(Object.keys(self.relatedItemIds))
        .filter(path => self.relatedItemIds[path] === null)
        .filter(Boolean)
        .filter(path => !_.isEmpty(_.get(itemToSave, path))
      )
      return newRelatedItemPaths.map(path => {
        const property = self.findProperty(path)
        const entityTypeName = property?.entityType
        const entityType = self.entityTypes.find(x => x.name == entityTypeName)
        return entityTypeName ? {
          path,
          property,
          entityTypeName,
          entityType: entityType,
          value: _.get(itemToSave, path, null)
        } : null
      })
        .filter(Boolean)
    },

    itemFromViewModel: function(originalItem, viewModel) {
      var item = _.cloneDeep(originalItem)
      for (let key in viewModel) {
        _.set(item, key, viewModel[key] == null ? null : viewModel[key])
      }

      this.applyRelatedItemIdChanges(item)

      if (this.items.length == 1) {
        item[this.primaryKey] = this.getPrimaryKeyValue(this.items[0])
      }
      return item
    },

    applyRelatedItemIdChanges: function(item) {
      // Traverse the related item paths depth-first, so that IDs higher in the hierarchy will take precedence.
      for (let relatedItemPath of _.reverse(_.sortBy(Object.keys(this.relatedItemIds)))) {
        if (this.relatedItemIds[relatedItemPath]) {
          // Remove all properties of the related item except _id.
          // TODO In the future, do we want to support in-place editing of related items?
          _.set(item, relatedItemPath, {
            [this.primaryKey]: this.relatedItemIds[relatedItemPath] || undefined
          })
        } else {
          _.set(item, `${relatedItemPath}.${this.primaryKey}`, undefined)
        }
      }
    },

    editedItemsFromViewModel: function(originalItems, viewModel) {
      let editedItems = originalItems.map(item => _.cloneDeep(item))
      for (let item of editedItems) {
        for (let key in viewModel) {
          if (viewModel[key]) { // TODO How to distinguish null from "no change"
            _.set(item, key, viewModel[key])
          }
        }
        this.applyRelatedItemIdChanges(item)
      }
      return editedItems
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Persistence
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    delete: async function() {
      let self = this
      let itemIds = self.items.map((i) => this.getPrimaryKeyValue(i)).filter(Boolean)
      for (const itemId of itemIds) {
        await self.beginDeletingItem({itemId})
        // TODO why does this get interrupted?
        self.$emit('propertySheet:didDeleteItem')
      }
    },

    saveWithWarnings: async function() {
      let self = this
      let relatedItemsToCreateOnSave = []
      switch (self.editingMode) {
        case 'New':
        case 'EditSingle':
          {
            const editedItem = self.itemFromViewModel(self.items[0], self.viewModel)
            relatedItemsToCreateOnSave = self.relatedItemsToCreateOnSave(editedItem)
          }
          break
        case 'EditMultiple':
          {
            const editedItems = self.editedItemsFromViewModel(self.items, self.viewModel)
            relatedItemsToCreateOnSave = self.relatedItemsToCreateOnSave(editedItems[0])
          }
          break
        default:
          break
      }
      if (relatedItemsToCreateOnSave.length > 0) {
        this.saving = true
        self.$confirm.require({
          message: 'By saving, the following related records will be created: '
              + relatedItemsToCreateOnSave.map(relatedItemToCreate => `${relatedItemToCreate.entityType.commonTitle}`).join(', '),
          header: 'Creating related records',
          icon: 'pi pi-exclamation-triangle',
          accept: async () => {
            await self.save()
            this.saving = false
          },
          reject: () => {
            this.saving = false
          }
        })
      } else {
        await this.save()
      }
    },

    save: async function() {
      let self = this
      let saved = true
      switch (self.editingMode) {
        case 'New':
        case 'EditSingle':
          {
            const editedItem = self.itemFromViewModel(self.items[0], self.viewModel)
            self.recordAutoCompleteEntries(editedItem)
            this.saving = true
            await self.saveItem({item: editedItem})
            self.viewModel = self.itemsToViewModel([editedItem])
            self.generalErrors = []
            //self.resetForm()
            this.resetForm({
              values: this.viewModelToValidatorValues(this.viewModel)
            })
            this.saving = false
            self.$emit('propertySheet:didSaveItem')
          }
          break
        case 'EditMultiple':
          {
            const editedItems = self.editedItemsFromViewModel(self.items, self.viewModel)
            //let relatedItemIds = self.relatedItemIds
            for (const editedItem of editedItems) {
              self.recordAutoCompleteEntries(editedItem)
            }
            this.saving = true
            await self.saveItems({items: editedItems})
            self.viewModel = self.itemsToViewModel(editedItems)
            self.generalErrors = []
            //self.resetForm()
            this.resetForm({
              values: this.viewModelToValidatorValues(this.viewModel)
            })
            this.saving = false
            self.$emit('propertySheet:didSaveItem')
          }
          break
        default:
          saved = false
          break
      }
      if (saved && !self.draftBatchId) {
        self.setEditingDetailItems(false)
      }
    },

    recordAutoCompleteEntries: function() {
    },

    /*
    recordAutoCompleteEntries: function(item) {
      let self = this
      for (let field of self.leafFields) {
        if (field.autocomplete) {
          Items.recordAutoCompleteEntry(field.path, _.get(item, field.path))
        }
      }
    },
    */

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

    onDidClickMarkUntestableButton: function(persistentRedcapEventId) {
      const self = this
      self.$confirm.require({
        message: 'Do you really want to mark this specimen as untestable because of a name mismatch?',
        header: 'Untestable Specimen',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
          const entityType = this.entityTypes.find(et => et.name == 'sfs-persistent-redcap-identifier-mapping')
          await callCustomItemRestMethod(entityType, persistentRedcapEventId, 'mark-name-mismatch-untestable', {method: 'post'})
          self.resetToOriginalItems()
        }
      })
    },

    onDidClickOverrideNameMismatchButton: function(persistentRedcapEventId) {
      const self = this
      self.$confirm.require({
        message: 'Do you really want to override the name mismatch and allow this specimen to be tested?',
        header: 'Override Name Mismatch',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
          const entityType = this.entityTypes.find(et => et.name == 'sfs-persistent-redcap-identifier-mapping')
          await callCustomItemRestMethod(entityType, persistentRedcapEventId, 'override-name-mismatch', {method: 'post'})
          await self.performServerValidation()
        }
      })
    },

    onDidClickCloseButton: function() {
      this.hideDetail()
    },

    onDidClickDeleteButton: function() {
      let self = this
      if ((self.items.length > 0) && !self.items.some(x => this.getPrimaryKeyValue(x) == null)) {
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

    onDidClickSaveButton: async function() {
      await this.saveWithValidation({ignoreValidationWarnings: !!this.draftBatchId && (this.items.count > 0)})
    },

    onDidClickSaveAnywayButton: async function() {
      await this.saveWithValidation({ignoreValidationWarnings: true})
    },

    performServerValidation: async function() {
      this.form.setErrors({})
      this.serverValidationPending = false
    },

    /*
    performServerValidation: async function() {
      switch (this.editingMode) {
        case 'New':
        case 'EditSingle':
          {
            const editedItem = this.itemFromViewModel(this.items[0], this.viewModel)
            this.serverValidationPending = true
            const errors = await Items.validateOnServer(editedItem, this.entityType, this.draftBatchId)
            this.generalErrors = errors.filter((error) => !error.path)
            const errorsByFieldPath = _.mapValues(
              _.groupBy(errors, 'path'),
              (errors) => _.first(_.sortBy(errors, 'severity')) // Relies on the fact that 'error' < 'warn'
            )
            this.form.setErrors(_.mapKeys(errorsByFieldPath, (value, key) => viewModelPathToValidatorPath(key)))
            this.serverValidationPending = false
          }
          break
        case 'EditMultiple':
          {
            const editedItems = this.editedItemsFromViewModel(this.items, this.viewModel)
            let allErrorsByFieldPath = {}
            this.serverValidationPending = true
            for (const item of editedItems) {
              const errors = await Items.validateOnServer(item, this.entityType, this.draftBatchId)
              const errorsByFieldPath = _.groupBy(errors, 'path')
              _.merge(allErrorsByFieldPath, errorsByFieldPath)
            }
            allErrorsByFieldPath = _.mapValues(
              allErrorsByFieldPath,
              (errors) => _.first(_.sortBy(errors, 'severity')) // Relies on the fact that 'error' < 'warn'
            )
            this.form.setErrors(_.mapKeys(allErrorsByFieldPath, (value, key) => viewModelPathToValidatorPath(key)))
            this.serverValidationPending = false
          }
          break
        default:
          break
      }
    },
    */

    saveWithValidation: async function({ignoreValidationWarnings = false} = {}) {
      if (this.saving) {
        return false
      }
      this.setBatchSaveAttempted(false)
      if (this.editing && this.dirty) {
        this.saving = true
        await this.performServerValidation()
        if (this.valid && (ignoreValidationWarnings || !this.hasValidationWarnings)) {
          await this.saveWithWarnings()
          // TODO What about when saveWithWarnings needs to prompt the user? saveWithWarnings needs to be made async so that we can get its return value.
          // TODO Make sure that saving succeeded before returning true.
          return true
        }
        this.saving = false
      }
      return false
    },

    extractRelatedItemIdsFromItems: function(items) {
      let self = this
      self.relatedItemIds = {}
      const leafPaths = _.uniqBy(_.flatten(items.map(item => self.flattenLeafPaths(item))))
      const idLeafPaths = leafPaths.filter(path => path.endsWith(`.${this.primaryKey}`))
      const relatedItemPaths = idLeafPaths.map(path => path.slice(0, -`.${this.primaryKey}`.length))
          .filter(path => (self.findProperty(path) || {}).entityType != null)
      for (let relatedItemPath of relatedItemPaths) {
        let id = null
        for (let item of items) {
          const idFromItem = _.get(item, relatedItemPath + `.${this.primaryKey}`, null)
          if (idFromItem) {
            if (id === null) {
              id = idFromItem
            } else if ((id !== undefined) && (id != idFromItem)) {
              // Do not set or clear this on save (unless the user has edited the related item).
              id = undefined
            }
          }
        }
        self.relatedItemIds[relatedItemPath] = id
      }
    },

    flattenLeafPaths: function(item) {
      return _.flatten(
        Object.keys(item).map(key => {
          const value = item[key]
          if (_.isObject(value)) {
            return this.flattenLeafPaths(value).map(path => `${key}.${path}`)
          } else {
            return [key]
          }
        })
      )
    },

    onDidUpdatePropertyValue: async function(event) {
      const {dataPath, newValue} = event
      let oldValue = this.viewModel[dataPath]
      this.viewModel[dataPath] = newValue

      const oldViewModel = _.cloneDeep(this.viewModel)

      const relatedItemDefinitions = this.findRelatedItemDefinitions(dataPath)
      const parentRelatedItemDefinition = _.last(relatedItemDefinitions)
      if (parentRelatedItemDefinition) {
        const property = this.findProperty(dataPath)
        // TODO We check _.isEmpty to prevent setting the ID in that case, but what should we really do?
        if (property.unique && dataPath.startsWith(`${parentRelatedItemDefinition.path}.`) && !_.isEmpty(newValue)) {
          let pathInRelatedItem = dataPath.slice(`${parentRelatedItemDefinition.path}.`.length)
          // TODO!!! Include draft batch in what we fetch
          const relatedItem = await this.fetchRelatedItemByUniquePropertyValue(parentRelatedItemDefinition, pathInRelatedItem, newValue)
          if (!relatedItem) {
            this.relatedItemIds[parentRelatedItemDefinition.path] = null
            // TODO Warn about creating a new item
            // TODO In the future, we may want to show non-unique related item properties once the item is chosen (or when a new item is to be created)
          } else {
            this.relatedItemIds[parentRelatedItemDefinition.path] = this.getPrimaryKeyValue(relatedItem)
            this.populateRelatedItemFields(parentRelatedItemDefinition, relatedItem)
            // TODO In the future, we may want to show non-unique related item properties once the item is chosen (or when a new item is to be created)
          }
        } else {
          // TODO Moderate update of non-unique related item properties?
        }
      }

      let didEditPropertyHandler = _.get(this.entityTypeCustomizations, ['editorCallbacks', 'didEditProperty', dataPath])
      if (didEditPropertyHandler != null) {
        await didEditPropertyHandler(this.entityType, this.viewModel, oldValue, this.items)
      }

      for (const path of _.keys(this.viewModel)) {
        if (!_.isEqual(this.viewModel[path], oldViewModel[path])) {
          this.setFieldValue(path, this.viewModel[path])
        }
      }
    },

    fetchRelatedItemByUniquePropertyValue: async function(relatedItemDefinition, path, value) {
      const relatedItemEntityType = this.entityTypes.find(et => et.name == relatedItemDefinition.schema.entityType)
      if (relatedItemEntityType) {
        return await fetchItemByUniqueProperty(relatedItemEntityType, path, value)
            || (this.draftBatchId && await fetchItemByUniqueProperty(relatedItemEntityType, path, value, {draftBatchId: this.draftBatchId}))
      }
      return null
    },

    populateRelatedItemFields: function(relatedItemDefinition, relatedItem) {
      const relatedItemPathPrefix = relatedItemDefinition.path + '.'
      for (let field of this.visibleLeafFields) {
        if (field.path.startsWith(relatedItemPathPrefix)) {
          const relativePath = field.path.slice(relatedItemPathPrefix.length)
          const value = _.get(relatedItem, relativePath, null)
          this.v$.viewModel[field.path].$model = value
        }
      }
    },

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Vuex actions
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    ...mapActions({
      beginDeletingItem(dispatch, payload) {
        return dispatch(this.stateNamespace + '/beginDeletingItem', payload)
      },
      saveItem(dispatch, payload) {
        return dispatch(this.stateNamespace + '/saveItem', payload)
      },
      saveItems(dispatch, payload) {
        return dispatch(this.stateNamespace + '/saveItems', payload)
      },
      hideDetail(dispatch, payload) {
        this.$emit('propertySheet:willClose')
        return dispatch(this.stateNamespace + '/hideDetail', payload)
      },
      deregisterEditor(dispatch, payload) {
        return dispatch(this.stateNamespace + '/deregisterEditor', payload)
      },
      registerEditor(dispatch, payload) {
        return dispatch(this.stateNamespace + '/registerEditor', payload)
      },
      selectItems(dispatch, payload) {
        return dispatch(this.stateNamespace + '/selectItems', payload)
      },
      setEditingDetailItems(dispatch, payload) {
        return dispatch(this.stateNamespace + '/setEditingDetailItems', payload)
      },
      setBatchSaveAttempted(dispatch, payload) {
        return dispatch(this.stateNamespace + '/setBatchSaveAttempted', payload)
      }
    })

  }
}

</script>

<style scoped>

.clearfix:after {
  display: table;
  content: "";
  clear: both;
}

.sfs-property-sheet-header,
.sfs-property-sheet-footer {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  padding: 10px 16px;
}

.sfs-property-sheet-header .sfs-title,
.sfs-property-sheet-footer .sfs-title {
  flex: 0 0 auto;
  margin: 0;
  font-size: 1.2rem;
  vertical-align: middle;
  line-height: 2.142rem;
}

.sfs-property-sheet-header .sfs-spacer,
.sfs-property-sheet-footer .sfs-spacer {
  flex: 1 1 auto;
}

.sfs-property-sheet-header .sfs-property-sheet-controls,
.sfs-property-sheet-footer .sfs-property-sheet-controls {
  flex: 0 0 auto;
  margin-left: auto;
}

.sfs-property-sheet-controls Button,
.sfs-property-sheet-validation-warning-controls Button {
  margin: 0 0.5em;
  vertical-align: middle;
}

.sfs-property-sheet-controls Button:last-child,
.sfs-property-sheet-validation-warning-controls Button:last-child {
  margin: 0 0 0 0.5em;
}

.sfs-property-sheet-validation-warning-controls {
  width: 100%;
  padding: 0 16px;
  margin: 10px 0;
  text-align: right;
}

.sfs-property-sheet-validation-warning-controls > div.sfs-message {
  display: inline-block
}

.sfs-property-sheet-form >>> .sfs-form-group {

}

.sfs-property-sheet-form::v-deep .sfs-form-item {
  float: left;
  margin: 10px 0 10px 16px;
}

.sfs-property-sheet-form >>> .sfs-form-item .p-calendar,
.sfs-property-sheet-form >>> .sfs-form-item .p-dropdown,
.sfs-property-sheet-form >>> .sfs-form-item .p-inputtext {
  width: 268px;
  /*width: 100%;*/
}

.sfs-property-sheet-form >>> .sfs-form-item .p-error {
  display: inline-block;
  max-width: 268px;
}

.lims-global-errors {
  padding: 5px;
  border: 1px solid #c00;
  color: #c00;
}

.lims-global-errors .p-warning {

  color: #c60;
}

.sfs-property-sheet-form >>> .sfs-form-item .p-warning {
  display: inline-block;
  max-width: 268px;
  color: #c60
}

.sfs-property-sheet-form >>> .sfs-slow-down-warning {
  display: block;
  background-color: yellow;
  color: red;
  text-align: center;
  max-width: 268px;
}

.sfs-property-sheet-form >>> .sfs-form-item textarea.p-inputtext {
  width: 552px;
}

.sfs-property-sheet-form >>> .sfs-form-item .p-calendar .p-inputtext.sfs-dirty,
.sfs-property-sheet-form >>> .sfs-form-item .p-dropdown.sfs-dirty,
.sfs-property-sheet-form >>> .sfs-form-item input.p-inputtext.sfs-dirty {
  border-bottom-color: #fbc02d;
}

.sfs-property-sheet-form >>> .sfs-form-item .p-calendar .p-inputtext.p-invalid {
  background-image: none;
  border-bottom-color: #b00020;
}

.sfs-property-sheet-form >>> .sfs-form-item .p-dropdown-label {
}

.sfs-property-sheet-global-validation-errors {
  margin: 0 16px;
  text-align: left;
}

.sfs-property-sheet-kit-registration-name-mismatch-error {

}

.sfs-error-message {
  color: #f00;
}

</style>
