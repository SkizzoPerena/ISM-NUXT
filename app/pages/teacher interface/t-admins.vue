<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

const { data, status } = await useAsyncData('admins',
  () => $fetch<Admin[]>(`${API_BASE}/api/admin/admins`, {
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
      const adminData = response?.data || response?.admins || response
      const rows = Array.isArray(adminData) ? adminData : []
      return rows.map((admin: any) => ({
        _id: admin._id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
        name: `${admin.firstName} ${admin.lastName}`,
        gender: admin.gender,
        profileImageURL: admin.profileImageURL,
      }))
    },
    lazy: false,
  }
)


type Admin = {
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
const UButton = resolveComponent('UButton')

const columns: TableColumn<Admin>[] = [
  {
    accessorKey: 'name',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UAvatar, { src: row.original.profileImageURL, alt: row.original.name }),
      h('div', undefined, [
        h(NuxtLink, { to: `/profile-admin?id=${row.original._id}`, class: 'text-primary font-medium hover:underline' }, { default: () => row.original.name }),
        h('p', { class: 'text-sm text-gray-500 dark:text-gray-400' }, row.original.email)
      ])
    ]),
    header: 'Name'
  },
  {
    accessorKey: '_id',
    header: 'Admin #',
    cell: ({ row }) => `#${row.getValue('_id')}`
  },
  {
    accessorKey: 'gender',
    header: 'Gender'
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center justify-end gap-1' }, [
        h(UButton, {
          icon: 'i-lucide-trash-2',
          color: 'error',
          variant: 'ghost',
          square: true,
          'aria-label': 'Delete admin',
          onClick: () => openDeleteAdminConfirm(row.original),
        }),
      ])
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
const genderOptions = ['MALE', 'FEMALE']

// CREATE
const isCreateOpen = ref(false)
const isCreateSubmitting = ref(false)

const createState = reactive({
  firstName: '',
  lastName: '',
  email: '',
  password: '',
  gender: 'MALE',
})

type CreateSchema = typeof createState

function validateCreate(state: Partial<CreateSchema>): FormError[] {
  const errors: FormError[] = []
  if (!state.firstName?.trim()) errors.push({ name: 'firstName', message: 'Required' })
  if (!state.lastName?.trim()) errors.push({ name: 'lastName', message: 'Required' })
  if (!state.email?.trim()) errors.push({ name: 'email', message: 'Required' })
  if (!state.password) errors.push({ name: 'password', message: 'Required' })
  if (!state.gender) errors.push({ name: 'gender', message: 'Required' })
  return errors
}

function openCreateModal() {
  createState.email = ''
  createState.password = ''
  createState.firstName = ''
  createState.lastName = ''
  createState.gender = 'MALE'
  isCreateOpen.value = true
}

async function onSubmitCreate(event: FormSubmitEvent<CreateSchema>) {
  if (isCreateSubmitting.value) return
  isCreateSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/register`, {
      method: 'POST',
      headers: { Authorization: `${useAuthToken().value}` },
      body: {
        firstName: createState.firstName.trim(),
        lastName: createState.lastName.trim(),
        email: createState.email.trim(),
        password: createState.password,
        gender: createState.gender,
      },
    })

    toast.add({ title: 'Success', description: 'Admin account created.', color: 'success' })
    isCreateOpen.value = false
    await refreshNuxtData('admins')
  } catch (error) {
    console.error('Error creating admin:', error)
    toast.add({ title: 'Error', description: 'Failed to create admin account.', color: 'error' })
  } finally {
    isCreateSubmitting.value = false
  }
}


// END FORM SCRIPT

// DELETE admin
const adminToDelete = ref<Admin | null>(null)
const isDeleteAdminModalOpen = ref(false)
const isDeleteAdminSubmitting = ref(false)

function openDeleteAdminConfirm(admin: Admin) {
  adminToDelete.value = admin
  isDeleteAdminModalOpen.value = true
}

function closeDeleteAdminConfirm() {
  if (!isDeleteAdminSubmitting.value) {
    isDeleteAdminModalOpen.value = false
    adminToDelete.value = null
  }
}

async function confirmDeleteAdmin() {
  const id = adminToDelete.value?._id
  if (!id || isDeleteAdminSubmitting.value) return
  isDeleteAdminSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/admin/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `${useAuthToken().value}` },
    })
    toast.add({ title: 'Success', description: 'Admin deleted successfully.', color: 'success' })
    isDeleteAdminModalOpen.value = false
    adminToDelete.value = null
    await refreshNuxtData('admins')
  } catch (error) {
    console.error('Error deleting admin:', error)
    toast.add({ title: 'Error', description: 'Failed to delete admin.', color: 'error' })
  } finally {
    isDeleteAdminSubmitting.value = false
  }
}

</script>

<template>
  <UContainer>
    <UPageCard>

      <div class="flex items-center gap-4">
        <div class="text-lg font-bold">Admins</div>
        <div style="margin-left: auto">
          <UInput :model-value="table?.tableApi?.getColumn('name')?.getFilterValue() as string" class="max-w-sm mr-5"
            placeholder="Search admins..."
            @update:model-value="table?.tableApi?.getColumn('name')?.setFilterValue($event)" />
          <UButton
            label="Add New Admin"
            :loading="isCreateSubmitting"
            :disabled="isCreateSubmitting"
            @click="openCreateModal"
          />
        </div>
      </div>

                  <USeparator />

      <UModal v-model:open="isCreateOpen" :dismissible="!isCreateSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Create New Admin Account</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isCreateSubmitting"
              @click="isCreateOpen = false"
            />
          </div>
        </template>
        <template #body>
          <UForm :validate="validateCreate" :state="createState" class="space-y-4" @submit="onSubmitCreate">
            <UFormField label="First Name" name="firstName" required block>
              <UInput v-model="createState.firstName" class="w-full" placeholder="First name" />
            </UFormField>

            <UFormField label="Last Name" name="lastName" required block>
              <UInput v-model="createState.lastName" class="w-full" placeholder="Last name" />
            </UFormField>

            <UFormField label="Email Address" name="email" required block>
              <UInput v-model="createState.email" type="email" class="w-full" placeholder="Email" />
            </UFormField>

            <UFormField label="Password" name="password" required block>
              <UInput v-model="createState.password" type="password" class="w-full" placeholder="Password" />
            </UFormField>

            <UFormField label="Gender" name="gender" required block>
              <USelect
                v-model="createState.gender"
                :items="genderOptions"
                placeholder="Select gender"
                class="w-full"
              />
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton type="button" variant="outline" :disabled="isCreateSubmitting" @click="isCreateOpen = false">
                Cancel
              </UButton>
              <UButton type="submit" :loading="isCreateSubmitting" :disabled="isCreateSubmitting">
                Create Account
              </UButton>
            </div>
          </UForm>
        </template>
      </UModal>

      <!-- Delete Admin Confirmation Modal -->
      <UModal v-model:open="isDeleteAdminModalOpen" :dismissible="!isDeleteAdminSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Delete Admin</h3>
        </template>
        <template #body>
          <p v-if="adminToDelete">
            Are you sure you want to delete {{ adminToDelete.name }}? This action cannot be undone.
          </p>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              type="button"
              variant="outline"
              :disabled="isDeleteAdminSubmitting"
              @click="closeDeleteAdminConfirm"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="isDeleteAdminSubmitting"
              :disabled="isDeleteAdminSubmitting"
              @click="confirmDeleteAdmin"
            >
              Delete
            </UButton>
          </div>
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