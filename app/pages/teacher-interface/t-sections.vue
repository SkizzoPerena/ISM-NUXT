<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 't-dashboard',
})

const { data, status } = await useAsyncData('sections',
  () => $fetch<Section[]>('https://noteworthy-z9k0.onrender.com/api/teacher/sections', {
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
        }))
    },
    lazy: false,
  }
)

type Section = {
  _id: string
  name: string
  assignedStudents: any[]
  
}

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
    cell: ({ row }) => h(NuxtLink, { to: `/teacher-interface/t-profile-section?id=${row.original._id}`, class: 'text-primary font-medium hover:underline' }, { default: () => row.getValue('name') })
  },
  {
    accessorKey: '_id',
    header: 'Section #',
    cell: ({ row }) => `#${row.getValue('_id')}`
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


</script>

<template>
  <UContainer>
    <UPageCard>

      <div class="flex items-center gap-4">
        <div class="text-lg font-bold">Sections</div>
        <div style="margin-left: auto">
          <UInput  v-model="globalFilter" class="max-w-sm mr-5"
            placeholder="Search sections..."
            />



        </div>
      </div>
      <USeparator />


      <UTable ref="table" v-model:global-filter="globalFilter" sticky :data="data || []" :columns="columns" :loading="status === 'pending'" class="flex-1 max-h-[70vh]" />
    </UPageCard>
  </UContainer>

</template>
