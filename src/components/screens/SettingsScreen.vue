<template>
  <MvLayout :require-auth="true">
    <template #header>
      <section class="settings-hero overflow-hidden pb-6 pt-8">
        <div class="mx-auto flex max-w-[850px] items-center gap-4 px-6">
          <div
            class="flex size-16 shrink-0 items-center justify-center rounded-full bg-sage text-2xl font-bold text-white shadow-sm"
          >
            {{ userInitial }}
          </div>
          <div class="flex-1">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="font-display text-xl font-bold text-text-dark">{{ userName }}</div>
                <a
                  v-if="userOrcidId"
                  class="mt-0.5 inline-flex items-center gap-1.5 text-xs font-semibold text-orcid no-underline hover:underline"
                  :href="`https://orcid.org/${userOrcidId}`"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  <img alt="ORCID iD" class="size-3.5" src="@/assets/ORCIDiD_icon.png" />
                  {{ userOrcidId }}
                </a>
              </div>
              <div class="flex items-center gap-2">
                <PButton
                  icon="pi pi-th-large"
                  label="Dashboard"
                  severity="secondary"
                  size="small"
                  @click="router.push('/dashboard')"
                />
                <PButton
                  icon="pi pi-sign-out"
                  label="Sign out"
                  severity="secondary"
                  size="small"
                  @click="handleSignOut"
                />
              </div>
            </div>
            <div v-if="statsLoaded" class="mt-2 flex items-center gap-0 text-xs text-text-muted">
              <span class="stats-item">{{ scoreSetCount }} score sets</span>
              <span class="stats-divider" />
              <span class="stats-item">{{ experimentCount }} experiments</span>
              <span class="stats-divider" />
              <span class="stats-item">{{ collectionCount }} collections</span>
            </div>
          </div>
        </div>
      </section>
    </template>

    <div class="mx-auto w-full max-w-[800px] px-6 pb-10 pt-5">
      <!-- Profile -->
      <div class="mb-3 overflow-hidden rounded-lg border border-border bg-surface">
        <div class="border-b border-border-light px-4 py-3 text-sm font-bold text-text-dark">Profile</div>
        <div class="px-4 py-3.5">
          <MvFloatField
            :error="emailValidationError"
            hint="Used for account notifications and ORCID record linking"
            label="Email address"
          >
            <template #default="{id, invalid}">
              <InputText :id="id" v-model="email" class="w-full max-w-[400px]" :invalid="invalid" type="email" />
            </template>
          </MvFloatField>
        </div>
        <div class="flex items-center gap-2.5 px-4 py-2.5">
          <PButton
            :disabled="!user || email === user.email"
            label="Save"
            severity="warn"
            size="small"
            @click="saveEmail"
          />
          <PButton
            :disabled="!user || email === user.email"
            label="Cancel"
            severity="secondary"
            size="small"
            @click="cancelEmailEditing"
          />
        </div>
      </div>

      <!-- User API Key -->
      <div class="mb-3 overflow-hidden rounded-lg border border-border bg-surface">
        <div class="border-b border-border-light px-4 py-3 text-sm font-bold text-text-dark">User API Key</div>
        <div class="px-4 py-3.5">
          <MvAccessKeyRow
            empty-message="You have not created an API key for your user."
            :key-id="accessKeysByRole[DEFAULT_ROLE]"
            @delete="deleteAccessKeyWithConfirmation"
            @generate="generateAccessKey(DEFAULT_ROLE)"
          />
        </div>
      </div>

      <!-- Acting Roles (only shown for users with elevated roles) -->
      <div v-if="hasElevatedRoles" class="mb-3 overflow-hidden rounded-lg border border-border bg-surface">
        <div class="border-b border-border-light px-4 py-3 text-sm font-bold text-text-dark">Acting Roles</div>
        <div class="px-4 py-3.5">
          <div class="flex flex-col gap-2.5">
            <template v-for="role in allRoles" :key="role">
              <div class="flex items-center gap-2.5">
                <Checkbox
                  v-model="activeRoles"
                  :disabled="role === DEFAULT_ROLE"
                  :input-id="scopedId(`role-${role}`)"
                  name="roleSelector"
                  :value="role"
                  @update:model-value="setActiveRoles"
                />
                <label
                  class="cursor-pointer text-sm"
                  :class="role === DEFAULT_ROLE ? 'text-text-muted' : 'text-text-primary'"
                  :for="scopedId(`role-${role}`)"
                >
                  {{ role }}
                </label>
              </div>
              <p v-if="role === DEFAULT_ROLE" class="-mt-1 ml-7 text-[11px] text-text-muted">
                Default role — cannot be disabled
              </p>
            </template>
          </div>
        </div>
      </div>

      <!-- Role Based API Keys (only shown for users with elevated roles) -->
      <div v-if="hasElevatedRoles" class="mb-3 overflow-hidden rounded-lg border border-border bg-surface">
        <div class="border-b border-border-light px-4 py-3 text-sm font-bold text-text-dark">Role Based API Keys</div>
        <div class="px-4 py-3.5">
          <div v-for="(role, index) in user?.roles" :key="role">
            <div
              class="rounded-md border border-border-light bg-bg p-3"
              :class="index < (user?.roles?.length ?? 0) - 1 ? 'mb-2.5' : ''"
            >
              <div class="mb-2 text-[13px] font-semibold capitalize text-text-secondary">{{ role }}</div>
              <MvAccessKeyRow
                empty-message="You have not created an API key for this role."
                key-display-class="bg-surface"
                :key-id="accessKeysByRole[role]"
                @delete="deleteAccessKeyWithConfirmation"
                @generate="generateAccessKey(role)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </MvLayout>
</template>

<script lang="ts">
import Checkbox from 'primevue/checkbox'
import PButton from 'primevue/button'
import InputText from 'primevue/inputtext'
import {defineComponent} from 'vue'
import {useHead} from '@unhead/vue'
import {useRouter} from 'vue-router'

import {
  createAccessKey,
  createRoleAccessKey,
  deleteAccessKey,
  getErrorResponse,
  getMyCollections,
  searchMyExperiments,
  searchMyScoreSets
} from '@/api/mavedb'
import MvAccessKeyRow from '@/components/common/MvAccessKeyRow.vue'
import MvFloatField from '@/components/forms/MvFloatField.vue'
import MvLayout from '@/components/layout/MvLayout.vue'
import type {components} from '@/schema/openapi'
import useScopedId from '@/composables/scoped-id'
import useAuth from '@/composition/auth'
import useItem from '@/composition/item.ts'
import useItems from '@/composition/items'

type CurrentUser = components['schemas']['CurrentUser']
type AccessKey = components['schemas']['AccessKey']
type UserRole = components['schemas']['UserRole']

// "ordinary user" is a client-side default, not a server-side role
const DEFAULT_ROLE = 'ordinary user' as const
type RoleWithDefault = UserRole | typeof DEFAULT_ROLE

export default defineComponent({
  name: 'SettingsScreen',

  components: {Checkbox, InputText, MvAccessKeyRow, MvFloatField, MvLayout, PButton},

  setup() {
    useHead({title: 'Settings'})

    const {item: user, setItemId: setUserId, saveItem: saveUser} = useItem({itemTypeName: 'me'})
    // @ts-expect-error useItems is untyped JS — itemTypeName accepts any string at runtime
    const {items: accessKeys, invalidateItems: invalidateAccessKeys} = useItems({itemTypeName: 'my-access-key'})
    const {activeRoles, roles, signOut, updateActiveRoles, userOrcidId, userProfile} = useAuth()
    const router = useRouter()

    return {
      activeRoles,
      roles,
      router,
      signOut,
      updateActiveRoles,
      userOrcidId,
      userProfile,
      ...useScopedId(),
      user: user as import('vue').ComputedRef<CurrentUser | null>,
      setUserId,
      saveUser,
      accessKeys: accessKeys as import('vue').Ref<AccessKey[] | null>,
      invalidateAccessKeys
    }
  },

  data() {
    return {
      DEFAULT_ROLE,
      collectionCount: 0,
      email: null as string | null,
      emailValidationError: null as string | null,
      experimentCount: 0,
      scoreSetCount: 0,
      statsLoaded: false
    }
  },

  computed: {
    accessKeysByRole(): Record<string, string> {
      if (!this.accessKeys) {
        return {}
      }
      return this.accessKeys.reduce(
        (acc: Record<string, string>, cur) => ({
          ...acc,
          [cur.role || DEFAULT_ROLE]: cur.keyId
        }),
        {}
      )
    },

    allRoles(): RoleWithDefault[] {
      if (!this.user?.roles) return [DEFAULT_ROLE]
      const roles: RoleWithDefault[] = [...this.user.roles]
      if (!roles.includes(DEFAULT_ROLE)) {
        roles.push(DEFAULT_ROLE)
      }
      return roles
    },

    hasElevatedRoles(): boolean {
      return !!this.user?.roles?.length
    },

    userInitial(): string {
      if (this.userProfile?.given_name) return this.userProfile.given_name.charAt(0).toUpperCase()
      if (this.user?.firstName) return this.user.firstName.charAt(0).toUpperCase()
      return '?'
    },

    userName(): string {
      if (this.userProfile?.given_name && this.userProfile?.family_name) {
        return `${this.userProfile.given_name} ${this.userProfile.family_name}`
      }
      if (this.user?.firstName && this.user?.lastName) {
        return `${this.user.firstName} ${this.user.lastName}`
      }
      return 'MaveDB User'
    }
  },

  watch: {
    user: {
      handler() {
        this.email = this.user?.email ?? null
      }
    }
  },

  mounted() {
    this.setUserId('me')
    this.loadStats()
  },

  methods: {
    cancelEmailEditing() {
      this.email = this.user?.email ?? null
      this.emailValidationError = null
    },

    async loadStats() {
      // TODO: These endpoints return full payloads just to count .length — consider adding
      // count-only endpoints or reading totals from paginated response metadata.
      try {
        const [scoreSets, experiments, collections] = await Promise.all([
          searchMyScoreSets(),
          searchMyExperiments(),
          getMyCollections()
        ])
        this.scoreSetCount = scoreSets?.length ?? 0
        this.experimentCount = experiments?.length ?? 0
        this.collectionCount = [
          ...(collections?.admin ?? []),
          ...(collections?.editor ?? []),
          ...(collections?.viewer ?? [])
        ].length
        this.statsLoaded = true
      } catch {
        this.statsLoaded = true
      }
    },

    async generateAccessKey(role: RoleWithDefault) {
      try {
        if (role === DEFAULT_ROLE) {
          await createAccessKey()
        } else {
          await createRoleAccessKey(role)
        }
        this.invalidateAccessKeys()
      } catch (e: unknown) {
        const {data} = getErrorResponse(e)
        const detail = data?.detail
        this.$toast.add({
          severity: 'error',
          summary: typeof detail === 'string' ? detail : 'Failed to generate API key.'
        })
      }
    },

    deleteAccessKeyWithConfirmation(keyId: string) {
      // @ts-expect-error PrimeVue ConfirmationService plugin is globally registered but not typed on Options API instances
      this.$confirm.require({
        message:
          'Are you sure you want to delete this key? This action cannot be undone, but you can generate a new key.',
        header: 'Delete API key',
        icon: 'pi pi-exclamation-triangle',
        accept: async () => {
          try {
            await deleteAccessKey(keyId)
            this.invalidateAccessKeys()
          } catch (e: unknown) {
            const {data} = getErrorResponse(e)
            const detail = data?.detail
            this.$toast.add({
              severity: 'error',
              summary: typeof detail === 'string' ? detail : 'Failed to delete API key.'
            })
          }
        }
      })
    },

    async saveEmail() {
      const email = this.email ? this.email.trim() : null
      if (!this.user || !email || email === this.user.email) return

      try {
        await this.saveUser({item: {...this.user, email}})
        this.emailValidationError = null
        this.$toast.add({severity: 'success', summary: 'Your email was successfully updated.', life: 3000})
      } catch (e: unknown) {
        const {data} = getErrorResponse(e)
        const detail = data?.detail

        if (typeof detail === 'string') {
          this.$toast.add({severity: 'error', summary: `Encountered an error saving email: ${detail}`})
        } else if (Array.isArray(detail) && detail.length > 0) {
          this.emailValidationError = detail[0].msg
        } else {
          this.$toast.add({severity: 'error', summary: 'An unexpected error occurred while saving your email.'})
        }
      }
    },

    handleSignOut() {
      this.signOut()
      this.router.push('/')
    },

    setActiveRoles(newRoles: string[]) {
      this.updateActiveRoles(newRoles)
    }
  }
})
</script>

<style scoped>
.settings-hero {
  background: linear-gradient(135deg, var(--color-sage-light) 0%, var(--color-mint-light) 60%, #f0faf0 100%);
}

.stats-divider {
  width: 1px;
  height: 12px;
  margin: 0 10px;
  background-color: var(--color-border);
}

.stats-item {
  white-space: nowrap;
}
</style>
