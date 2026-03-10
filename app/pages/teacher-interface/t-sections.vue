<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent } from 'vue'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 't-dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

const { data, status } = await useAsyncData(
  'sections-with-student-counts',
  async () => {
    // 1. Fetch all sections
    const sectionsResponse: any = await $fetch(`${API_BASE}/api/teacher/sections`, {
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
    })

    const sections = sectionsResponse?.data || sectionsResponse?.sections || []
    if (!Array.isArray(sections)) return []

    // 2. For each section, fetch its students and get the count
    const sectionsWithCounts = await Promise.all(
      sections.map(async (section: any) => {
        const studentsResponse: any = await $fetch(`${API_BASE}/api/teacher/students/section/${section._id}`, {
          headers: {
            Authorization: `${useAuthToken().value}`,
          },
        })
        const students = studentsResponse?.data || studentsResponse?.students || []
        return {
          _id: section._id,
          name: section.name,
          studentCount: Array.isArray(students) ? students.length : 0,
        }
      })
    )
    return sectionsWithCounts
  },
  {
    lazy: false,
  }
)

type Section = {
  _id: string
  name: string
  studentCount: number
}

const NuxtLink = resolveComponent('NuxtLink')

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
    accessorKey: 'studentCount',
    header: 'Students',
    cell: ({ row }) => row.getValue('studentCount')
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
