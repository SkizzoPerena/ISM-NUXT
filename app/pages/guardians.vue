<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

const { data, status } = await useAsyncData('guardians',
  () => $fetch<Guardian[]>(`${API_BASE}/api/admin/guardian`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      // This will log the raw response body.
      // Check your browser's developer console to see the structure of the data.
      console.log('API Response:', response._data)
    }
  }),
  {
    transform: (response: any) => {
      // The API might return data inside a property, e.g., { "data": [...] }
      // This line tries to find the array, assuming it might be nested.
      const guardianData = response?.data || response?.guardians || response
      const rows = Array.isArray(guardianData) ? guardianData : []
      return rows.map((guardian: any) => ({
        _id: guardian._id,
        email: guardian.email,
        firstName: guardian.firstName,
        lastName: guardian.lastName,
        name: guardian.firstName + ' ' + guardian.lastName,
        gender: guardian.gender,
        profileImageURL: guardian.profileImageURL,
      }))
    },
    lazy: false,
  }
)


type Guardian = {
  _id: string
  email: string
  firstName: string
  lastName: string
  name: string
  gender: string
  profileImageURL: string
}

const UAvatar = resolveComponent('UAvatar')
const NuxtLink = resolveComponent('NuxtLink')

const columns: TableColumn<Guardian>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UAvatar, { src: row.original.profileImageURL, alt: row.original.name }),
      h('div', undefined, [
        h(NuxtLink, { to: `/profile-guardian?id=${row.original._id}`, class: 'font-medium hover:underline' }, { default: () => row.original.name }),
        h('p', { class: 'text-sm text-gray-500 dark:text-gray-400' }, row.original.email)
      ])
    ])
  },
  {
    accessorKey: '_id',
    header: 'Guardian #',
    cell: ({ row }) => `#${row.getValue('_id')}`
  },
  {
    accessorKey: 'gender',
    header: 'Gender'
  },
]

// TABLE FILTER SCRIPT

const table = useTemplateRef('table')

const columnFilters = ref([
  {
    id: 'name',
    value: ''
  }
])

// END TABLE FILTER SCRIPT

// FORM SCRIPT 
const toast = useToast()
const genderOptions = ['Male', 'Female']

// CREATE
const isCreateOpen = ref(false)
const isCreateSubmitting = ref(false)

const createState = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  gender: '',
})

type CreateSchema = typeof createState

function validateCreate(state: Partial<CreateSchema>): FormError[] {
  const errors: FormError[] = []
  if (!state.firstName) errors.push({ name: 'firstName', message: 'Required' })
  if (!state.lastName) errors.push({ name: 'lastName', message: 'Required' })
  if (!state.email) errors.push({ name: 'email', message: 'Required' })
  if (!state.password) errors.push({ name: 'password', message: 'Required' })
  if (!state.gender) errors.push({ name: 'gender', message: 'Required' })
  return errors
}

async function onSubmitCreate(event: FormSubmitEvent<CreateSchema>) {
  if (isCreateSubmitting.value) return
  isCreateSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/guardian`, {
      method: 'POST',
      headers: { Authorization: `${useAuthToken().value}` },
      body: {
        firstName: createState.firstName,
        lastName: createState.lastName,
        email: createState.email,
        password: createState.password,
        gender: createState.gender,
      },
    })

    toast.add({ title: 'Success', description: 'Guardian created successfully.', color: 'success' })
    isCreateOpen.value = false
    createState.firstName = ''
    createState.lastName = ''
    createState.email = ''
    createState.password = ''
    createState.gender = ''
    await refreshNuxtData('guardians')
  } catch (error) {
    console.error('Error creating guardian:', error)
    toast.add({ title: 'Error', description: 'Failed to create guardian.', color: 'error' })
  } finally {
    isCreateSubmitting.value = false
  }
}

// END FORM SCRIPT
</script>

<template>
  <UContainer>
    <UPageCard>

      <div class="flex items-center gap-4 mb-4">
        <div class="text-lg font-bold">guardians</div>
        <div style="margin-left: auto">
          <UInput :model-value="table?.tableApi?.getColumn('name')?.getFilterValue() as string" class="max-w-sm mr-5"
            placeholder="Search guardians..."
            @update:model-value="table?.tableApi?.getColumn('name')?.setFilterValue($event)" />
          <UButton
            label="Add New Guardian"
            :loading="isCreateSubmitting"
            :disabled="isCreateSubmitting"
            @click="isCreateOpen = true"
          />
        </div>
      </div>

      <UModal v-model:open="isCreateOpen" :dismissible="!isCreateSubmitting" title="Add New Guardian">
        <template #body>
          <UForm :validate="validateCreate" :state="createState" class="space-y-4" @submit="onSubmitCreate">
            <UFormField label="First Name" name="firstName" required block>
              <UInput v-model="createState.firstName" placeholder="Juan" class="w-full" />
            </UFormField>

            <UFormField label="Last Name" name="lastName" required block>
              <UInput v-model="createState.lastName" placeholder="Dela Cruz" class="w-full" />
            </UFormField>

            <UFormField label="Email Address" name="email" required block>
              <UInput v-model="createState.email" placeholder="user@email.com" class="w-full" />
            </UFormField>

            <UFormField label="Password" name="password" required block>
              <UInput v-model="createState.password" type="password" placeholder="password" class="w-full" />
            </UFormField>

            <UFormField label="Sex assigned at birth" name="gender" required block>
              <USelect v-model="createState.gender" placeholder="Select sex" :items="genderOptions" class="w-full" />
            </UFormField>

            <UButton type="submit" block :loading="isCreateSubmitting" :disabled="isCreateSubmitting">
              Add Guardian
            </UButton>
          </UForm>
        </template>
      </UModal>


      <!--
        The UTable with `sticky` and viewport-dependent height (`max-h-[70vh]`) can cause a hydration mismatch.
        The server doesn't have a viewport, so it renders the HTML differently than the client.
        Wrapping the component in <ClientOnly> ensures it only renders in the browser, avoiding the error.
      -->
      <ClientOnly>
        <UTable ref="table" v-model:column-filters="columnFilters" sticky :data="data || []" :columns="columns" :loading="status === 'pending'" class="flex-1 max-h-[70vh]" />
      </ClientOnly>
    </UPageCard>
  </UContainer>

</template>
