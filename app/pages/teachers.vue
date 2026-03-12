<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

const { data, status } = await useAsyncData('teachers',
  () => $fetch<Teacher[]>(`${API_BASE}/api/admin/teacher`, {
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
      const teacherData = response?.data || response?.teachers || response
      const rows = Array.isArray(teacherData) ? teacherData : []
      return rows.map((teacher: any) => ({
        _id: teacher._id,
        email: teacher.email,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
        name: teacher.firstName + ' ' + teacher.lastName,
        gender: teacher.gender,
        profileImageURL: teacher.profileImageURL,
        assignedSections: teacher.assignedSections
      }))
    },
    lazy: false,
  }
)


type Teacher = {
  _id: string
  email: string
  firstName: string
  lastName: string
  name: string
  gender: string
  profileImageURL: string
  assignedSections: string[]
}

const UAvatar = resolveComponent('UAvatar')
const NuxtLink = resolveComponent('NuxtLink')

const columns: TableColumn<Teacher>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    accessorFn: row => `${row.name} ${row.email}`,
    cell: ({ row }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UAvatar, { src: row.original.profileImageURL, alt: row.original.name }),
      h('div', undefined, [
        h(NuxtLink, { to: `/profile-teacher?id=${row.original._id}`, class: 'text-primary font-medium hover:underline'}, { default: () => row.original.name }),
        h('p', { class: 'text-sm text-gray-500 dark:text-gray-400' }, row.original.email)
      ]),
      
    ]),
  },
  {
    accessorKey: '_id',
    header: 'Teacher #',
    cell: ({ row }) => `#${row.getValue('_id')}`
  },
  {
    accessorKey: 'gender',
    header: 'Gender'
  },
  {
    accessorKey: 'assignedSections',
    header: 'Sections',
    accessorFn: row => (row.assignedSections || []).length,
    cell: ({ row }) => row.getValue('assignedSections')
  },
]

// TABLE FILTER SCRIPT

const table = useTemplateRef('table')

const globalFilter = ref('')

// END TABLE FILTER SCRIPT

// FORM SCRIPT 
const toast = useToast()
const genderOptions = ['Male', 'Female']

// CREATE
const isCreateOpen = ref(false)
const isCreateSubmitting = ref(false)
const show = ref(false)

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
    await $fetch(`${API_BASE}/api/admin/teacher`, {
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

    toast.add({ title: 'Success', description: 'Teacher created successfully.', color: 'success' })
    isCreateOpen.value = false
    createState.firstName = ''
    createState.lastName = ''
    createState.email = ''
    createState.password = ''
    createState.gender = ''
    await refreshNuxtData('teachers')
  } catch (error) {
    console.error('Error creating teacher:', error)
    toast.add({ title: 'Error', description: 'Failed to create teacher.', color: 'error' })
  } finally {
    isCreateSubmitting.value = false
  }
}

// END FORM SCRIPT
</script>

<template>
  <UContainer>
    <UPageCard>

      <div class="flex items-center gap-4">
        <div class="text-lg font-bold">Teachers</div>
        <div style="margin-left: auto">
          <UInput v-model="globalFilter" class="max-w-sm mr-5"
            placeholder="Search teachers"
            />
          <UButton
            label="Add New Teacher"
            :loading="isCreateSubmitting"
            :disabled="isCreateSubmitting"
            @click="isCreateOpen = true"
          />
        </div>
      </div>

                  <USeparator />

      <UModal v-model:open="isCreateOpen" :dismissible="!isCreateSubmitting" title="Add New Teacher">
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
              <UInput v-model="createState.password" placeholder="Enter your password" class="w-full"
            :type="show ? 'text' : 'password'" :ui="{ trailing: 'pe-1' }">
            <template #trailing>
              <UButton color="neutral" variant="link" size="sm" :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="show ? 'Hide password' : 'Show password'" :aria-pressed="show" aria-controls="password"
                @click="show = !show" />
            </template>
                  </UInput>
            </UFormField>

            <UFormField label="Sex assigned at birth" name="gender" required block>
              <USelect v-model="createState.gender" placeholder="Select sex" :items="genderOptions" class="w-full" />
            </UFormField>

            <UButton type="submit" block :loading="isCreateSubmitting" :disabled="isCreateSubmitting">
              Add Teacher
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
        <UTable ref="table" v-model:global-filter="globalFilter" sticky :data="data || []" :columns="columns" :loading="status === 'pending'" class="flex-1 max-h-[70vh]" />
      </ClientOnly>
    </UPageCard>
  </UContainer>

</template>
