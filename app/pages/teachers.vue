<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const { data, status } = await useAsyncData('teachers',
  () => $fetch<Teacher[]>('https://noteworthy-z9k0.onrender.com/api/admin/teacher', {
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
  name: string
  gender: string
  profileImageURL: string
  assignedSections: string[]
}

const UAvatar = resolveComponent('UAvatar')

const columns: TableColumn<Teacher>[] = [
  {
    accessorKey: 'profileImageURL',
    header: '',
    // Using `resolveComponent` with a string name can be unreliable during SSR hydration.
    // It's much safer to reference the auto-imported component constructor `UAvatar` directly.
    cell: ({ row }) => h(UAvatar, { src: row.original.profileImageURL })
  },
  {
    accessorKey: 'name',
    header: 'Name'
  },
  {
    accessorKey: '_id',
    header: 'Teacher #',
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
    header: 'Sections',
    cell: ({ row }) => (row.getValue('assignedSections') as any[])?.length
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



// END FORM SCRIPT
</script>

<template>
  <UContainer>
    <UPageCard>

      <div class="flex items-center gap-4 mb-4">
        <div class="text-lg font-bold">Teachers</div>
        <div style="margin-left: auto">
          <UInput :model-value="table?.tableApi?.getColumn('name')?.getFilterValue() as string" class="max-w-sm mr-5"
            placeholder="Search students..."
            @update:model-value="table?.tableApi?.getColumn('name')?.setFilterValue($event)" />
        </div>
      </div>


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
