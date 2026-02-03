<script setup lang="ts">

import { h, resolveComponent, computed } from 'vue'
import type { TabsItem } from '@nuxt/ui'
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const toast = useToast()

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
  createdAt: string // Assignment creation date
  startDate: string // Assignment start date
  endDate: string // Assignment due date
  description: string
}

type Assessment = {
  _id: string
  title: string
  createdAt: string // Assignment creation date
  instructions: string
}

type SectionDetail = {
  _id: string
  name: string
  students: Student[]
  teachers: Teacher[]
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

// Fetch assigned journals for the section
const { data: journalEntries, status: journalEntriesStatus } = await useAsyncData<Journal[]>(
  `section-journals-${sectionId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/journal-sections/section/${sectionId.value}`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Journal Entries API Response:', response._data)
    }
  }),
  {
    transform: (response: any): Journal[] => {
      // The API response contains an 'assignments' array.
      const assignments = response.assignments || response.data || response;
      if (!Array.isArray(assignments)) {
        console.error('Expected an array of journal assignments, but received:', assignments);
        return [];
      }

      // Map the assignment data to the 'Journal' type for the table.
      return assignments.map(assignment => {
        // The actual journal details are nested under the 'journalId' property.
        const journal = assignment.journalId;
        if (!journal) {
          console.warn('Journal assignment is missing journalId property:', assignment);
          return null; // or handle as needed
        }
        
        return {
          _id: journal._id, // This is the ID of the journal template
          title: journal.title,
          createdAt: assignment.createdAt, // The assignment creation date
          startDate: assignment.startDate,
          endDate: assignment.endDate, // The due date for this assignment
          description: journal.description,
        };
      }).filter((j): j is Journal => j !== null);
    },
    watch: [sectionId]
  }
);

// Fetch assigned group assessments for the section
const { data: groupAssessments, status: groupAssessmentsStatus } = await useAsyncData<Assessment[]>(
  `section-group-assessments-${sectionId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/assessment-sections/${sectionId.value}/group`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Group Assessments API Response:', response._data)
    }
  }),
  {
    transform: (response: any): Assessment[] => {
      const assignments = response.assignments || response.data || response;
      if (!Array.isArray(assignments)) {
        console.error('Expected an array of group assessment assignments, but received:', assignments);
        return [];
      }

      return assignments.map(assignment => {
        const assessment = assignment.assessmentId;
        if (!assessment) {
          console.warn('Group assessment assignment is missing assessmentId property:', assignment);
          return null;
        }
        
        return {
          _id: assessment._id,
          title: assessment.title,
          createdAt: assignment.createdAt,
          instructions: assessment.instructions,
        };
      }).filter((a): a is Assessment => a !== null);
    },
    watch: [sectionId]
  }
);

// Fetch assigned individual assessments for the section
const { data: individualAssessments, status: individualAssessmentsStatus } = await useAsyncData<Assessment[]>(
  `section-individual-assessments-${sectionId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/assessment-sections/${sectionId.value}/individual`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Individual Assessments API Response:', response._data)
    }
  }),
  {
    transform: (response: any): Assessment[] => {
      const assignments = response.assignments || response.data || response;
      if (!Array.isArray(assignments)) {
        console.error('Expected an array of individual assessment assignments, but received:', assignments);
        return [];
      }

      return assignments.map(assignment => {
        const assessment = assignment.assessmentId;
        if (!assessment) {
          console.warn('Individual assessment assignment is missing assessmentId property:', assignment);
          return null;
        }
        
        return {
          _id: assessment._id,
          title: assessment.title,
          createdAt: assignment.createdAt,
          instructions: assessment.instructions,
        };
      }).filter((a): a is Assessment => a !== null);
    },
    watch: [sectionId]
  }
);

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

const assessmentcolumns: TableColumn<Assessment>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => h('div', { class: 'flex items-center justify-between w-full' }, [
      // The NuxtLink for the title
      h(NuxtLink, { to: `/details-assessment?id=${row.original._id}`, class: 'font-medium hover:underline' }, { default: () => row.getValue('title') }),
      // The expand button
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
    ])
  },
]

// Each table needs its own state for expanded rows to function independently.
const groupAssessmentsExpanded = ref({})
const individualAssessmentsExpanded = ref({})
const journalsExpanded = ref({})

// END ASSESSMENTS TAB SCRIPT

// START JOURNALS TAB SCRIPT

// Data for journals will be fetched based on the section.
const journalData = computed<Journal[]>(() => {
  if (!journalEntries.value) return []
  return journalEntries.value
})

const journalcolumns: TableColumn<Journal>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => h(NuxtLink, { to: `/details-journal?id=${row.original._id}`, class: 'font-medium hover:underline' }, { default: () => row.getValue('title') })
  },
  {
    accessorKey: 'endDate',
    header: 'Schedule',
    cell: ({ row }) => {
      const startDateValue = row.original.startDate as string
      const endDateValue = row.original.endDate as string

      const formatDate = (dateString: string | undefined) => {
        if (!dateString) return 'N/A'
        const date = new Date(dateString)
        return new Intl.DateTimeFormat('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }).format(date)
      }

      return `${formatDate(startDateValue)} - ${formatDate(endDateValue)}`
    }
  },
  {
    id: 'actions',
    cell: ({ row }) => h('div', { class: 'flex items-center' }, [
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
      }),
      h(UButton, {
        color: 'red',
        variant: 'ghost',
        icon: 'i-lucide-trash-2',
        square: true,
        'aria-label': 'Delete',
        onClick: () => {
          toast.add({ title: 'Delete Action', description: `Delete triggered for journal: ${row.original.title}` })
          // TODO: Implement actual delete logic
        }
      })
    ])
  }
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
            <div class="text-lg font-bold" style="">Assigned Class-wide Assessments</div>

            <UTable v-model:expanded="groupAssessmentsExpanded" :data="groupAssessments || []" :columns="assessmentcolumns"
              :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1 mt-4 border-t border-default" :loading="groupAssessmentsStatus === 'pending'">
              <template #empty-state>
                <div class="flex flex-col items-center justify-center py-6 gap-3">
                  <span class="italic text-sm">No class-wide assessments assigned to this section.</span>
                </div>
              </template>
              <template #expanded="{ row }">
                <p class="p-4">{{ row.original.instructions }}</p>
              </template>
            </UTable>
          </UContainer>

          <UContainer class="mt-5">
            <div class="text-lg font-bold" style="">Assigned Individual Assessments</div>

            <UTable v-model:expanded="individualAssessmentsExpanded" :data="individualAssessments || []" :columns="assessmentcolumns"
              :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1 mt-4 border-t border-default" :loading="individualAssessmentsStatus === 'pending'">
              <template #empty-state>
                <div class="flex flex-col items-center justify-center py-6 gap-3">
                  <span class="italic text-sm">No individual assessments assigned to this section.</span>
                </div>
              </template>
              <template #expanded="{ row }">
                  <p class="p-4">{{ row.original.instructions }}</p>
              </template>
            </UTable>
          </UContainer>
        </template>

        <!-- JOURNALS TAB -->
        <template #journals="{ item }">
          <UContainer class="mt-5">
            <div class="text-lg font-bold" style="">Assigned Practice Journals</div>

            <UTable v-model:expanded="journalsExpanded" :data="journalData" :columns="journalcolumns"
              :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1 mt-4 border-t border-default" :loading="journalEntriesStatus === 'pending'">
              <template #empty-state>
                <div class="flex flex-col items-center justify-center py-6 gap-3">
                  <span class="italic text-sm">No journals assigned to this section.</span>
                </div>
              </template>
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
