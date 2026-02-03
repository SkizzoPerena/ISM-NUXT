<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const { data, status } = await useAsyncData('sections',
  () => $fetch<Section[]>('https://noteworthy-z9k0.onrender.com/api/admin/sections', {
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
      const sectionData = response?.data || response?.sections || response
      const rows = Array.isArray(sectionData) ? sectionData : []
      return rows.map((section: any) => ({
        _id: section._id,
        name: section.name,
        assignedStudents: section.students,
        assignedTeachers: section.teachers,     }))
    },
    lazy: false,
  }
)

type Section = {
  _id: string
  name: string
  assignedStudents: any[]
  assignedTeachers: Teacher[]
}

const UAvatar = resolveComponent('UAvatar')
const NuxtLink = resolveComponent('NuxtLink')

type Teacher = {
  _id: string
  firstName: string
  lastName: string
  // ... other fields
}

const columns: TableColumn<Section>[] = [
  {
    accessorKey: 'name',
    header: 'Section Name',  
    cell: ({ row }) => h(NuxtLink, { to: `/profile-section?id=${row.original._id}` }, { default: () => row.getValue('name') })
  },
  {
    accessorKey: '_id',
    header: 'Section #',
    cell: ({ row }) => `#${row.getValue('_id')}`
  },
    {
    accessorKey: 'assignedTeachers',
    header: 'Teachers',
    cell: ({ row }) => {
  const teachers = row.getValue('assignedTeachers') as Teacher[]
  
  if (!teachers || !teachers.length) return ''
  return teachers.map(teacher => `${teacher.firstName} ${teacher.lastName}`).join(', ')
  }
  },
    {
    accessorKey: 'assignedStudents',
    header: 'Students',
    cell: ({ row }) => (row.getValue('assignedStudents') as any[])?.length
  },
]

// TABLE FILTER SCRIPT

const table = useTemplateRef('table')

const globalFilter = ref('')

// END TABLE FILTER SCRIPT

// FORM SCRIPT 

const isOpen = ref(false)

const state = reactive({
  sectionName: undefined
})

type Schema = typeof state

function validate(state: Partial<Schema>): FormError[] {
  const errors = []
  if (!state.sectionName) errors.push({ name: 'sectionName', message: 'Required' })
  return errors
}

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    await $fetch('https://noteworthy-z9k0.onrender.com/api/admin/sections', {
      method: 'POST',
      headers: {
        Authorization: `${useAuthToken().value}`
      },
      body: {
        name: state.sectionName
      }
    })
    
    toast.add({ title: 'Success', description: 'Section created successfully.', color: 'success' })
    isOpen.value = false
    state.sectionName = undefined
    
    // Refresh the sections list
    await refreshNuxtData('sections')
  } catch (error) {
    console.error('Error creating section:', error)
    toast.add({ title: 'Error', description: 'Failed to create section.', color: 'error' })
  }
}

// END FORM SCRIPT
</script>

<template>
  <UContainer>
    <UPageCard>

      <div class="flex items-center gap-4 mb-4">
        <div class="text-lg font-bold">sections</div>
        <div style="margin-left: auto">
          <UInput  v-model="globalFilter" class="max-w-sm mr-5"
            placeholder="Search sections..."
            />

          <UButton label="Add New Section" @click="isOpen = true" />

          <UModal v-model:open="isOpen" :dismissible="false">
            <template #header>
              <div class="flex items-center justify-between w-full">
                <h3 class="text-lg font-semibold">Add New Section</h3>
                <UButton icon="i-lucide-x" variant="ghost" @click="isOpen = false" />
              </div>
            </template>

            <template #body>
              <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
                <UFormField label="Section Name" name="sectionName" required block>
                  <UInput v-model="state.sectionName" placeholder="Enter section name" class="w-full" />
                </UFormField>

                <div class="flex gap-2 justify-end">
                  <UButton type="button" variant="outline" @click="isOpen = false">
                    Cancel
                  </UButton>
                  <UButton type="submit">
                    Create Section
                  </UButton>
                </div>
              </UForm>
            </template>
          </UModal>

        </div>
      </div>


      <UTable ref="table" v-model:global-filter="globalFilter" sticky :data="data || []" :columns="columns" :loading="status === 'pending'" class="flex-1 max-h-[70vh]" />
    </UPageCard>
  </UContainer>

</template>
