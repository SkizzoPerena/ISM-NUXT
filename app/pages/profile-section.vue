<script setup lang="ts">

import { h, resolveComponent, computed } from 'vue'
import type { TabsItem } from '@nuxt/ui'
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')


definePageMeta({
  layout: 'dashboard',
})

// Get route to access query params
const route = useRoute()
const sectionId = computed(() => route.query.id as string)

// Define types for the data we expect from the API
type Student = {
  _id: string
  firstName: string
  lastName: string
  email: string
  profileImageURL: string
  // other fields
}

type Teacher = {
  _id: string
  firstName: string
  lastName: string
  profileImageURL?: string
  // other fields
}

// This is the new/updated type for a single journal
type Journal = {
  _id: string
  title: string
  createdAt: string
  description: string
}

type SectionDetail = {
  _id: string
  name: string
  students: Student[]
  teachers: Teacher[]
  journals: Journal[]
}

// Fetch section details from the API using the ID from the URL
const { data: section, status } = await useAsyncData<SectionDetail>(
  `section-${sectionId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/sections/${sectionId.value}`, {
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
    transform: (response: any): SectionDetail => {
      // The API response for a single item is likely nested under a 'data' or 'section' key.
      // This ensures we get the actual section object.
      return response.data || response.section || response
    },
    // This ensures the data re-fetches if you navigate between sections without a full page reload
    watch: [sectionId]
  }
)

const items = [
  {
    label: 'People',
    description: 'Make changes to your account here. Click save when you\'re done.',
    icon: 'i-lucide-users',
    slot: 'people' as const
  },
  {
    label: 'Assessments',
    description: 'Change your password here. After saving, you\'ll be logged out.',
    icon: 'i-lucide-text-search',
    slot: 'assessment' as const
  },
  {
    label: 'Journals',
    description: 'Make changes to your account here. Click save when you\'re done.',
    icon: 'i-lucide-notebook-pen',
    slot: 'journals' as const
  },
] satisfies TabsItem[]


// PEOPLE TAB SCRIPT

const studentData = computed(() => {
  if (!section.value?.students) return []
  // Map the fetched student data to the format the table expects.
  return section.value.students.map(s => ({
    avatar: s.profileImageURL,
    name: `${s.firstName} ${s.lastName}`,
    id: s._id,
    email: s.email,
  }))
})

const UAvatar = resolveComponent('UAvatar')
const NuxtLink = resolveComponent('NuxtLink')


const columns: TableColumn<any>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UAvatar, { src: row.original.avatar, alt: row.original.name }),
      h('div', undefined, [
        h(NuxtLink, { to: `/profile-student?id=${row.original.id}`, class: 'font-medium'}, { default: () => row.getValue('name') }),
        h('p', { class: 'text-sm text-gray-500 dark:text-gray-400' }, row.original.email)
      ])
    ])
  },
  {
    accessorKey: 'id',
    header: 'Student #',
    cell: ({ row }) => `#${row.getValue('id')}`
  },
]

const teacherData = computed(() => {
  if (!section.value?.teachers) return []
  return section.value.teachers.map(t => ({
    id: t._id,
    name: `${t.firstName} ${t.lastName}`,
    avatar: t.profileImageURL
  }))
})

const teacher_columns: TableColumn<any>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UAvatar, { src: row.original.avatar, alt: row.original.name }),
      h(NuxtLink, { to: `/profile-teacher?id=${row.original.id}`, class: 'font-medium' }, { default: () => row.getValue('name') })
    ])  },
]

const table = useTemplateRef('table')

// END PEOPLE TAB SCRIPT

// START ASSESSMENT TAB SCRIPT

type Assessments = {
  id: string
  date: string
}

// Data for assessments will be fetched based on the section.
// For now, we'll initialize them as empty arrays.
const classassessmentdata = ref<Assessments[]>([])

const indiassessmentdata = ref<Assessments[]>([])

const assessmentcolumns: TableColumn<Assessments>[] = [
  {
    accessorKey: 'id',
    header: '',
  },
  {
    accessorKey: 'date',
    header: 'Date',
  },
  {
    id: 'expand',
    cell: ({ row }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-chevron-down',
        square: true,
        'aria-label': 'Expand',
        ui: {
          leadingIcon: [
            'transition-transform',
            row.getIsExpanded() ? 'duration-200 rotate-180' : ''
          ]
        },
        onClick: () => row.toggleExpanded()
      })
  },
]
const expanded = ref({ 1: true })

// END ASSESSMENTS TAB SCRIPT

// START JOURNALS TAB SCRIPT

// Data for journals will be fetched based on the section.
const journalData = computed(() => {
  if (!section.value?.journals) return []
  // The data structure from the API should already match what the table needs.
  return section.value.journals
})

const journalcolumns: TableColumn<Journal>[] = [
  {
    accessorKey: 'title',
    header: '',
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => {
      const dateValue = row.getValue('createdAt') as string
      if (!dateValue) return ''
      const date = new Date(dateValue)
      // Format to something like: "Oct 10, 2026, 20:15"
      const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false }).format(date)
      return `Due: ${formattedDate}`
    }
  },
  {
    id: 'expand',
    cell: ({ row }) =>
      h(UButton, {
        color: 'neutral',
        variant: 'ghost',
        icon: 'i-lucide-chevron-down',
        square: true,
        'aria-label': 'Expand',
        ui: {
          leadingIcon: [
            'transition-transform',
            row.getIsExpanded() ? 'duration-200 rotate-180' : ''
          ]
        },
        onClick: () => row.toggleExpanded()
      })
  },
]

// END JOURNALS TAB SCRIPT
</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="h-40 flex items-center justify-center">
      <p>Loading section...</p>
    </UPageCard>
    <UPageCard v-else-if="section" class="h-40">
      <UPageHeader :title="section.name" style="border-bottom: 0; margin-top: auto; padding-bottom: 0;" />
    </UPageCard>

    <UPageCard class="mt-6">
      <UTabs :items="items" variant="link" :ui="{ trigger: 'grow' }" class="gap-4 w-full">

        <!-- PEOPLE TAB -->
        <template #people="{ item }">
          <UPageGrid class="mt-5">
            <UContainer class="lg:col-span-2">
              <div class="text-lg font-bold">Students ({{ studentData.length }})</div>
              <UTable sticky ref="table" :data="studentData" :columns="columns" :loading="status === 'pending'" />
            </UContainer>
            <UContainer>
              <div class="text-xl font-bold">Teachers ({{ teacherData.length }})</div>
              <UTable :data="teacherData" ref="table" :columns="teacher_columns" :loading="status === 'pending'" />
            </UContainer>
          </UPageGrid>
        </template>

        <!-- ASSESSMENTS TAB -->
        <template #assessment="{ item }">
          <UContainer class="mt-5">
            <div class="text-lg font-bold" style="">Class-wide Assessments</div>

            <UTable v-model:expanded="expanded" :data="classassessmentdata" :columns="assessmentcolumns"
              :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1">
              <template #expanded="{ row }">
                <pre>Insert assessment description here</pre>
              </template>
            </UTable>
          </UContainer>

          <UContainer class="mt-5">
            <div class="text-lg font-bold" style="">Individual Assessments</div>

            <UTable v-model:expanded="expanded" :data="indiassessmentdata" :columns="assessmentcolumns"
              :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1">
              <template #expanded="{ row }">
                  <pre>Insert assessment description here</pre>
              </template>
            </UTable>
          </UContainer>
        </template>

        <!-- JOURNALS TAB -->
                 <template #journals="{ item }">
          <UContainer class="mt-5">
            <div class="text-lg font-bold" style="">Assigned Practice Journals</div>

            <UTable v-model:expanded="expanded" :data="journalData" :columns="journalcolumns"
              :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1 mt-4 border-t border-default" :loading="status === 'pending'">
              <template #expanded="{ row }">
                <p class="p-4">{{ row.original.description }}</p>
              </template>
            </UTable>
          </UContainer>

        </template>
      </UTabs>
    </UPageCard>

  </UContainer>
</template>
