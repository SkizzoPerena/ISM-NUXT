<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent, computed } from 'vue'
import type { TabsItem } from '@nuxt/ui'
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')


definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

// Get route to access query params
const route = useRoute()
const sectionId = computed(() => route.query.id as string)

// Define types for the data we expect from the API
type Student = {
  _id: string
  firstName: string
  lastName: string
  email: string
  gender?: string
  profileImageURL: string
  // other fields
}

type Teacher = {
  _id: string
  firstName: string
  lastName: string
  email?: string
  gender?: string
  profileImageURL?: string
  // other fields
}

// This is the new/updated type for a single journal
type Journal = {
  _id: string
  title: string
  createdAt: string // Assignment creation date
  endDate: string // Assignment due date
  description: string
}

type Assessment = {
  _id: string
  title: string
  createdAt: string // Assignment creation date
  instructions: string
}

type GroupSubmission = {
  _id?: string
  submissionURL?: string
  submissionType?: string
  assessmentSection?: { assessmentId?: { title?: string } }
  [key: string]: unknown
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
  () => $fetch(`${API_BASE}/api/admin/sections/${sectionId.value}`, {
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
  () => $fetch(`${API_BASE}/api/admin/journal-sections/section/${sectionId.value}`, {
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
  () => $fetch(`${API_BASE}/api/admin/assessment-sections/${sectionId.value}/group`, {
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
  () => $fetch(`${API_BASE}/api/admin/assessment-sections/${sectionId.value}/individual`, {
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

// Fetch group submissions for the section
const { data: groupSubmissionsRaw, status: groupSubmissionsStatus } = await useAsyncData<GroupSubmission[]>(
  `section-group-submissions-${sectionId.value}`,
  () => $fetch(`${API_BASE}/api/admin/group-submission/section/${sectionId.value}`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Group Submissions API Response:', response._data)
    }
  }),
  {
    transform: (response: any): GroupSubmission[] => {
      const list = response?.groupAssessmentSubmissions ?? response?.data ?? response?.groupSubmissions ?? response
      return Array.isArray(list) ? list : []
    },
    watch: [sectionId]
  }
)

// Pending: submissionURL is empty AND submissionType is not equal to "LIVE"
function isPendingSubmission(entry: GroupSubmission): boolean {
  const urlEmpty = !entry.submissionURL || String(entry.submissionURL).trim() === ''
  const notLive = entry.submissionType !== 'LIVE'
  return urlEmpty && notLive
}

const pendingSubmissions = computed(() => {
  const list = groupSubmissionsRaw.value ?? []
  return list.filter(isPendingSubmission)
})

const submittedSubmissions = computed(() => {
  const list = groupSubmissionsRaw.value ?? []
  return list.filter((entry) => !isPendingSubmission(entry))
})

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
    gender: s.gender ?? '—',
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
    accessorKey: 'gender',
    header: 'Gender',
    cell: ({ row }) => row.original.gender ?? '—'
  },
]

const teacherData = computed(() => {
  if (!section.value?.teachers) return []
  return section.value.teachers.map(t => ({
    id: t._id,
    name: `${t.firstName} ${t.lastName}`,
    email: t.email ?? '—',
    avatar: t.profileImageURL,
    gender: t.gender ?? '—',
  }))
})

const teacher_columns: TableColumn<any>[] = [
  {
    accessorKey: 'name',
    header: 'Name',
    cell: ({ row }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UAvatar, { src: row.original.avatar, alt: row.original.name }),
      h('div', undefined, [
        h(NuxtLink, { to: `/profile-teacher?id=${row.original.id}`, class: 'font-medium' }, { default: () => row.getValue('name') }),
        h('p', { class: 'text-sm text-gray-500 dark:text-gray-400' }, row.original.email)
      ])
    ])
  },
  {
    accessorKey: 'gender',
    header: 'Gender',
    cell: ({ row }) => row.original.gender ?? '—'
  },
]

const table = useTemplateRef('table')

// END PEOPLE TAB SCRIPT

// EDIT SECTION FORM
const isEditOpen = ref(false)
const editState = reactive({ sectionName: '' })

type EditSchema = typeof editState

function validateEdit(state: Partial<EditSchema>): FormError[] {
  const errors: FormError[] = []
  if (!state.sectionName) errors.push({ name: 'sectionName', message: 'Required' })
  return errors
}

const toast = useToast()

function openEditModal() {
  editState.sectionName = section.value?.name ?? ''
  isEditOpen.value = true
}

async function onSubmitEdit(event: FormSubmitEvent<EditSchema>) {
  if (!sectionId.value) return
  try {
    await $fetch(`${API_BASE}/api/admin/sections/${sectionId.value}`, {
      method: 'PATCH',
      headers: {
        Authorization: `${useAuthToken().value}`
      },
      body: {
        name: editState.sectionName
      }
    })
    toast.add({ title: 'Success', description: 'Section updated successfully.', color: 'success' })
    isEditOpen.value = false
    await refreshNuxtData(`section-${sectionId.value}`)
  } catch (error) {
    console.error('Error updating section:', error)
    toast.add({ title: 'Error', description: 'Failed to update section.', color: 'error' })
  }
}

// END EDIT SECTION FORM

// START ASSESSMENT TAB SCRIPT

const assessmentcolumns: TableColumn<Assessment>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => h(NuxtLink, { to: `/details-assessment?id=${row.original._id}`, class: 'font-medium hover:underline' }, { default: () => row.getValue('title') })
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    cell: ({ row }) => {
      const dateValue = row.getValue('createdAt') as string
      if (!dateValue) return ''
      const date = new Date(dateValue)
      // Format to something like: "Oct 10, 2026, 20:15"
      const formattedDate = new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        hour12: false
      }).format(date)
      return `Created: ${formattedDate}`
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

// Each table needs its own state for expanded rows to function independently.
const groupAssessmentsExpanded = ref({})
const individualAssessmentsExpanded = ref({})
const journalsExpanded = ref({})

// Group submissions table columns (submissionURL, submissionType)
// Fixed widths so header spacing stays consistent when the list is empty
const groupSubmissionColumns: TableColumn<GroupSubmission>[] = [
  {
    accessorKey: 'assessmentSection',
    header: 'Assessment Title',
    meta: { class: { th: 'w-1/3 min-w-[180px]', td: 'w-1/3 min-w-[180px]' } },
    cell: ({ row }) => row.original.assessmentSection?.assessmentId?.title ?? '—'
  },
  {
    accessorKey: 'submissionURL',
    header: 'Submission URL',
    meta: { class: { th: 'w-1/2 min-w-[200px]', td: 'w-1/2 min-w-[200px]' } },
    cell: ({ row }) => {
      const url = row.original.submissionURL
      if (!url || String(url).trim() === '') return h('span', { class: 'text-gray-500 dark:text-gray-400 italic' }, '—')
      return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'text-primary hover:underline' }, url)
    }
  },
  {
    accessorKey: 'submissionType',
    header: 'Type',
    meta: { class: { th: 'w-24 min-w-[80px]', td: 'w-24 min-w-[80px]' } },
    cell: ({ row }) => row.original.submissionType ?? '—'
  }
]

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
    header: 'Date',
    cell: ({ row }) => {
      const dateValue = row.getValue('endDate') as string
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
      <div class="flex items-center justify-between w-full" style="border-bottom: 0; margin-top: auto; padding-bottom: 0;">
        <UPageHeader :title="section.name" style="border-bottom: 0; padding-bottom: 0;" />
        <UButton icon="i-lucide-pencil" variant="ghost" aria-label="Edit section" @click="openEditModal" />
      </div>

      <UModal v-model:open="isEditOpen" :dismissible="false">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Edit Section</h3>
            <UButton icon="i-lucide-x" variant="ghost" @click="isEditOpen = false" />
          </div>
        </template>
        <template #body>
          <UForm :validate="validateEdit" :state="editState" class="space-y-4" @submit="onSubmitEdit">
            <UFormField label="Section Name" name="sectionName" required block>
              <UInput v-model="editState.sectionName" placeholder="Enter section name" class="w-full" />
            </UFormField>
            <div class="flex gap-2 justify-end">
              <UButton type="button" variant="outline" @click="isEditOpen = false">
                Cancel
              </UButton>
              <UButton type="submit">
                Update Section
              </UButton>
            </div>
          </UForm>
        </template>
      </UModal>
    </UPageCard>

    <UPageCard class="mt-6">
      <UTabs :items="items" variant="link" :ui="{ trigger: 'grow' }" class="gap-4 w-full">

        <!-- PEOPLE TAB -->
        <template #people="{ item }">
          <UPageGrid class="mt-5 grid-cols-1 lg:grid-cols-2">
            <UContainer class="min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-lg font-semibold">Students ({{ studentData.length }})</span>
                <UButton icon="i-lucide-plus" variant="ghost" color="neutral" square aria-label="Add student to section" />
              </div>
              <UTable sticky ref="table" :data="studentData" :columns="columns" :loading="status === 'pending'" />
            </UContainer>
            <UContainer class="min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-xl font-semibold">Teachers ({{ teacherData.length }})</span>
                <UButton icon="i-lucide-plus" variant="ghost" color="neutral" square aria-label="Add teacher to section" />
              </div>
              <UTable :data="teacherData" ref="table" :columns="teacher_columns" :loading="status === 'pending'" />
            </UContainer>
          </UPageGrid>
        </template>

        <!-- ASSESSMENTS TAB -->
        <template #assessment="{ item }">
          <UContainer class="mt-5">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold">Class-wide Assessments</span>
              <UButton icon="i-lucide-plus" variant="ghost" color="neutral" square aria-label="Add class-wide assessment" />
            </div>

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
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold">Individual Assessments</span>
              <UButton icon="i-lucide-plus" variant="ghost" color="neutral" square aria-label="Add individual assessment" />
            </div>

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

          <UContainer class="mt-8">
            <div class="text-lg font-semibold">Class Submissions</div>

            <div class="mt-4">
              <div class="text-base font-medium text-gray-500 dark:text-gray-400 mb-2">Pending ({{ pendingSubmissions.length }})</div>
              <UTable
                :data="pendingSubmissions"
                :columns="groupSubmissionColumns"
                class="border-t border-default w-full table-fixed"
                :loading="groupSubmissionsStatus === 'pending'"
              >
                <template #empty-state>
                  <div class="flex flex-col items-center justify-center py-6 gap-3">
                    <span class="italic text-sm">No pending group submissions.</span>
                  </div>
                </template>
              </UTable>
            </div>

            <div class="mt-6">
              <div class="text-base font-medium text-gray-500 dark:text-gray-400 mb-2">Submitted ({{ submittedSubmissions.length }})</div>
              <UTable
                :data="submittedSubmissions"
                :columns="groupSubmissionColumns"
                class="border-t border-default w-full table-fixed"
                :loading="groupSubmissionsStatus === 'pending'"
              >
                <template #empty-state>
                  <div class="flex flex-col items-center justify-center py-6 gap-3">
                    <span class="italic text-sm">No submitted group submissions.</span>
                  </div>
                </template>
              </UTable>
            </div>
          </UContainer>
        </template>

        <!-- JOURNALS TAB -->
        <template #journals="{ item }">
          <UContainer class="mt-5">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold">Assigned Practice Journals</span>
              <UButton icon="i-lucide-plus" variant="ghost" color="neutral" square aria-label="Add practice journal" />
            </div>

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
