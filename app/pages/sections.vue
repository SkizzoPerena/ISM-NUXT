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

const state = reactive({
  email: undefined,
  password: undefined
})

type Schema = typeof state

function validate(state: Partial<Schema>): FormError[] {
  const errors = []
  if (!state.email) errors.push({ name: 'email', message: 'Required' })
  if (!state.password) errors.push({ name: 'password', message: 'Required' })
  return errors
}

const toast = useToast()
async function onSubmit(event: FormSubmitEvent<Schema>) {
  toast.add({ title: 'Success', description: 'The form has been submitted.', color: 'success' })
  console.log(event.data)
}

const SAAB = ref(['Male', 'Female'])

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

          <UModal :dismissible="false" title="Add New Section">

            <UButton label="Add New Section" />

            <template #body>
              <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
                <UFormField label="First Name" name="firstname" required block>
                  <UInput placeholder="Juan" class="w-full" />
                </UFormField>

                <UFormField label="Last Name" name="lastname" required block>
                  <UInput placeholder="Dela Cruz" class="w-full" />
                </UFormField>


                <UFormField label="Email Address" name="email" required block>
                  <UInput v-model="state.email" placeholder="user@email.com" class="w-full" />
                </UFormField>

                <UFormField label="Password" name="password" required>
                  <UInput v-model="state.password" type="password" placeholder="password" class="w-full" />
                </UFormField>
                <UFormField label="Sex assigned at birth" name="SAAB" required>
                  <USelect placeholder="Select sex" :items="SAAB" class="w-full" />
                </UFormField>

                <UButton type="submit" block>
                  Add section
                </UButton>
              </UForm>
            </template>

          </UModal>

        </div>
      </div>


      <UTable ref="table" v-model:global-filter="globalFilter" sticky :data="data || []" :columns="columns" :loading="status === 'pending'" class="flex-1 max-h-[70vh]" />
    </UPageCard>
  </UContainer>

</template>
