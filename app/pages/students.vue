<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const { data, status } = await useAsyncData('students',
  () => $fetch<Student[]>('https://noteworthy-z9k0.onrender.com/api/admin/student', {
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
      const studentData = response?.data || response?.students || response
      const rows = Array.isArray(studentData) ? studentData : []
      return rows.map((student: any) => ({
        _id: student._id,
        assignedInstruments: student.assignedInstruments,
        assignedSections: student.assignedSections,
        email: student.email,
        name: student.firstName + ' ' + student.lastName,
        gender: student.gender,
        profileImageURL: student.profileImageURL,      }))
    },
    lazy: false,
  }
)

type Student = {
  _id: string
  assignedInstruments: string[]
  assignedSections: any[] // The image shows [{...}], implying an array of objects
  email: string
  name: string
  gender: string
  profileImageURL: string
}

const UAvatar = resolveComponent('UAvatar')

type Section = {
  _id: string
  name: string
  // ... other fields
}

const columns: TableColumn<Student>[] = [
  {
    accessorKey: 'profileImageURL',
    header: '',
    // Using `resolveComponent` with a string name can be unreliable during SSR hydration.
    // It's much safer to reference the auto-imported component constructor `UAvatar` directly.
    cell: ({ row }) => h(UAvatar, { src: row.original.profileImageURL, alt: row.original.name })
  },
  {
    accessorKey: 'name',
    header: 'Name',  
  },
  {
    accessorKey: '_id',
    header: 'Student #',
    cell: ({ row }) => `#${row.getValue('_id')}`
  },
  {
    accessorKey: 'email',
    header: 'Email'
  },
  {
    accessorKey: 'gender',
    header: 'Gender'
  },
    {
    accessorKey: 'assignedSections',
    header: 'Section',
    cell: ({ row }) => {
  const sections = row.getValue('assignedSections') as Section[]
  
  if (!sections) return ''
  return sections.map(section => section.name).join(', ')
  }
  },
    {
    accessorKey: 'assignedInstruments',
    header: 'Instruments',
    cell: ({ row }) => (row.getValue('assignedInstruments') as any[])?.length
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
        <div class="text-lg font-bold">Students</div>
        <div style="margin-left: auto">
          <UInput :model-value="table?.tableApi?.getColumn('name')?.getFilterValue() as string" class="max-w-sm mr-5"
            placeholder="Search students..."
            @update:model-value="table?.tableApi?.getColumn('name')?.setFilterValue($event)" />

          <UModal :dismissible="false" title="Add New Student">

            <UButton label="Add New Student" />

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
                  Add Student
                </UButton>
              </UForm>
            </template>

          </UModal>

        </div>
      </div>


      <UTable ref="table" v-model:column-filters="columnFilters" sticky :data="data || []" :columns="columns" :loading="status === 'pending'" class="flex-1 max-h-[70vh]" />
    </UPageCard>
  </UContainer>

</template>
