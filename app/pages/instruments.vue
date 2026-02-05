<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent, computed } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com' // Assuming BASE_URL is this

const { data, status, refresh } = await useAsyncData('instruments',
  () => $fetch<Instrument[]>(`${API_BASE}/api/admin/instruments`, {
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
    transform: (response: any): Instrument[] => {
      const instrumentData = response?.data || response?.instruments || response
      const rows = Array.isArray(instrumentData) ? instrumentData : []
      console.log('Instruments API Response:', rows); // Added console.log as requested
      return rows.map((instrument: any) => ({
        _id: instrument._id,
        instrumentName: instrument.instrumentName,
        description: instrument.description,
        createdAt: instrument.createdAt,
      }))
    },
    // Set to false to ensure data is fetched on initial load
    lazy: false,
    // Re-fetch data if the component is re-mounted or route changes (if applicable)
    watch: [],
  }
)

type Instrument = {
  _id: string
  instrumentName: string
  description: string
  createdAt: string
    }

const UAvatar = resolveComponent('UAvatar')
const NuxtLink = resolveComponent('NuxtLink')
const UButton = resolveComponent('UButton')

const columns: TableColumn<Instrument>[] = [
  {
    accessorKey: 'instrumentName',
    header: 'Instrument Name',
    meta: { class: { td: 'w-3/4' } },
    },
  {
    accessorKey: 'createdAt',
    header: 'Created At',
    meta: { class: { td: 'w-1/4' } },
    cell: ({ row }) => {
      const dateValue = row.getValue('createdAt') as string
      if (!dateValue) return ''
      const date = new Date(dateValue)
      return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).format(date)
    }
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) =>
      h('div', { class: 'flex items-center gap-1' }, [
        h(UButton, {
          icon: 'i-lucide-pencil',
          color: 'success',
          variant: 'ghost',
          square: true,
          'aria-label': 'Edit instrument',
          onClick: () => openEditModal(row.original),
        }),
        h(UButton, {
          icon: 'i-lucide-trash-2',
          color: 'error',
          variant: 'ghost',
          square: true,
          'aria-label': 'Delete instrument',
          onClick: () => openDeleteConfirm(row.original),
        }),
      ])
  },
]

// TABLE FILTER SCRIPT

const table = useTemplateRef('table')

const expanded = ref({})

const globalFilter = ref('')

const columnFilters = computed(() => [
  {
    id: 'instrumentName',
    value: ''
  }
])

// END TABLE FILTER SCRIPT

// FORM SCRIPT 
const toast = useToast()

// CREATE
const isCreateOpen = ref(false)
const isCreateSubmitting = ref(false)

const createState = reactive({
  instrumentName: '',
  description: '',
})

type CreateSchema = typeof createState

function validateCreate(state: Partial<CreateSchema>): FormError[] {
  const errors: FormError[] = []
  if (!state.instrumentName?.trim()) errors.push({ name: 'instrumentName', message: 'Required' })
  return errors
}

async function onSubmitCreate(event: FormSubmitEvent<CreateSchema>) {
  if (isCreateSubmitting.value) return
  isCreateSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/instruments`, {
      method: 'POST',
      headers: { Authorization: `${useAuthToken().value}` },
      body: {
        instrumentName: createState.instrumentName,
      },
    })

    toast.add({ title: 'Success', description: 'Instrument created successfully.', color: 'success' })
    isCreateOpen.value = false
    createState.instrumentName = ''
    createState.description = ''
    await refresh() // Refresh the instruments list
  } catch (error) {
    console.error('Error creating Instrument:', error)
    toast.add({ title: 'Error', description: 'Failed to create Instrument.', color: 'error' })
  } finally {
    isCreateSubmitting.value = false
  }
}

// EDIT instrument
const instrumentToEdit = ref<Instrument | null>(null)
const isEditModalOpen = ref(false)
const isEditSubmitting = ref(false)
const editInstrumentName = ref('')

function openEditModal(instrument: Instrument) {
  instrumentToEdit.value = instrument
  editInstrumentName.value = instrument.instrumentName
  isEditModalOpen.value = true
}

function closeEditModal() {
  if (!isEditSubmitting.value) {
    isEditModalOpen.value = false
    instrumentToEdit.value = null
    editInstrumentName.value = ''
  }
}

async function confirmUpdateInstrument() {
  const id = instrumentToEdit.value?._id
  const name = editInstrumentName.value?.trim()
  if (!id || !name || isEditSubmitting.value) return
  isEditSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/instruments/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `${useAuthToken().value}` },
      body: { instrumentName: name },
    })
    toast.add({ title: 'Success', description: 'Instrument updated.', color: 'success' })
    isEditModalOpen.value = false
    instrumentToEdit.value = null
    editInstrumentName.value = ''
    await refresh()
  } catch (error) {
    console.error('Error updating instrument:', error)
    toast.add({ title: 'Error', description: 'Failed to update instrument.', color: 'error' })
  } finally {
    isEditSubmitting.value = false
  }
}

// DELETE (archive) instrument
const instrumentToDelete = ref<Instrument | null>(null)
const isDeleteModalOpen = ref(false)
const isDeleteSubmitting = ref(false)

function openDeleteConfirm(instrument: Instrument) {
  instrumentToDelete.value = instrument
  isDeleteModalOpen.value = true
}

function closeDeleteConfirm() {
  if (!isDeleteSubmitting.value) {
    isDeleteModalOpen.value = false
    instrumentToDelete.value = null
  }
}

async function confirmDeleteInstrument() {
  const id = instrumentToDelete.value?._id
  if (!id || isDeleteSubmitting.value) return
  isDeleteSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/instruments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `${useAuthToken().value}` },
    })
    toast.add({ title: 'Success', description: 'Instrument archived.', color: 'success' })
    isDeleteModalOpen.value = false
    instrumentToDelete.value = null
    await refresh()
  } catch (error) {
    console.error('Error archiving instrument:', error)
    toast.add({ title: 'Error', description: 'Failed to archive instrument.', color: 'error' })
  } finally {
    isDeleteSubmitting.value = false
  }
}

// END FORM SCRIPT
</script>

<template>
  <UContainer>
    <UPageCard>

      <div class="flex items-center gap-4 mb-4">
        <div class="text-lg font-bold">Instruments</div>
        <div style="margin-left: auto">
          <UInput :model-value="table?.tableApi?.getColumn('instrumentName')?.getFilterValue() as string" class="max-w-sm mr-5"
            placeholder="Search instruments..."
            @update:model-value="table?.tableApi?.getColumn('name')?.setFilterValue($event)" />
          <UButton
            label="Add New Instrument"
            :loading="isCreateSubmitting"
            :disabled="isCreateSubmitting"
            @click="isCreateOpen = true"
          />
        </div>
      </div>

      <UModal v-model:open="isCreateOpen" :dismissible="!isCreateSubmitting" title="Add New Instrument">
        <template #body>
          <UForm :validate="validateCreate" :state="createState" class="space-y-4" @submit="onSubmitCreate">
            <UFormField label="Instrument Name" name="instrumentName" required block>
              <UInput v-model="createState.instrumentName" placeholder="e.g., Guitar" class="w-full" />
            </UFormField>


            <UButton type="submit" block :loading="isCreateSubmitting" :disabled="isCreateSubmitting">
              Add Instrument
            </UButton>
          </UForm>
        </template>
      </UModal>

      <!-- Edit instrument -->
      <UModal v-model:open="isEditModalOpen" :dismissible="!isEditSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Update instrument</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isEditSubmitting"
              @click="closeEditModal"
            />
          </div>
        </template>
        <template #body>
          <div class="space-y-4">
            <UFormField label="Instrument name" name="instrumentName" required block>
              <UInput
                v-model="editInstrumentName"
                placeholder="e.g., Guitar"
                class="w-full"
                :disabled="isEditSubmitting"
              />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton
                type="button"
                variant="outline"
                :disabled="isEditSubmitting"
                @click="closeEditModal"
              >
                Cancel
              </UButton>
              <UButton
                :loading="isEditSubmitting"
                :disabled="!editInstrumentName?.trim() || isEditSubmitting"
                @click="confirmUpdateInstrument"
              >
                Update
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Delete instrument confirmation -->
      <UModal v-model:open="isDeleteModalOpen" :dismissible="!isDeleteSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Archive instrument</h3>
        </template>
        <template #body>
          <p v-if="instrumentToDelete">
            Are you sure you want to archive {{ instrumentToDelete.instrumentName }}?
          </p>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              type="button"
              variant="outline"
              :disabled="isDeleteSubmitting"
              @click="closeDeleteConfirm"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="isDeleteSubmitting"
              :disabled="isDeleteSubmitting"
              @click="confirmDeleteInstrument"
            >
              Archive
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
        <UTable
          ref="table"
          v-model:expanded="expanded"
          v-model:column-filters="columnFilters"
          sticky :data="data || []" :columns="columns" :loading="status === 'pending'" class="flex-1" >
        </UTable>
      </ClientOnly>
    </UPageCard>
  </UContainer>

</template>