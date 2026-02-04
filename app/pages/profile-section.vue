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
  {
    id: 'unassign',
    header: '',
    cell: ({ row }) =>
      h(UButton, {
        icon: 'i-lucide-trash',
        color: 'red',
        variant: 'ghost',
        square: true,
        'aria-label': 'Unassign student from section',
        onClick: () => openUnassignStudentConfirm(row.original)
      })
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
  {
    id: 'unassign',
    header: '',
    cell: ({ row }) =>
      h(UButton, {
        icon: 'i-lucide-trash',
        color: 'error',
        variant: 'ghost',
        square: true,
        'aria-label': 'Unassign teacher from section',
        onClick: () => openUnassignTeacherConfirm(row.original)
      })
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

// ADD STUDENT TO SECTION (sectionless students)
const isAddStudentOpen = ref(false)
const sectionlessStudents = ref<{ _id: string; firstName: string; lastName: string; email?: string }[]>([])
const sectionlessStudentsLoading = ref(false)
const addStudentSelectedId = ref<string | undefined>(undefined)
const isAddStudentSubmitting = ref(false)

function openAddStudentModal() {
  isAddStudentOpen.value = true
  addStudentSelectedId.value = undefined
  sectionlessStudentsLoading.value = true
  $fetch(`${API_BASE}/api/admin/student/sectionless/all`, {
    headers: { Authorization: `${useAuthToken().value}` }
  })
    .then((data: any) => {
      const list = data?.data ?? data?.students ?? data
      sectionlessStudents.value = Array.isArray(list) ? list : []
      sectionlessStudentsLoading.value = false
    })
    .catch(() => {
      sectionlessStudentsLoading.value = false
      toast.add({ title: 'Error', description: 'Failed to load sectionless students.', color: 'error' })
    })
}

const addStudentDropdownItems = computed(() =>
  sectionlessStudents.value.map((s) => ({ label: `${s.firstName} ${s.lastName}`, value: s._id }))
)

async function confirmAddStudent() {
  if (!sectionId.value || !addStudentSelectedId.value || isAddStudentSubmitting.value) return
  isAddStudentSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/sections/${sectionId.value}/assign-student/${addStudentSelectedId.value}`, {
      method: 'POST',
      headers: { Authorization: `${useAuthToken().value}` }
    })
    toast.add({ title: 'Success', description: 'Student added to section.', color: 'success' })
    isAddStudentOpen.value = false
    addStudentSelectedId.value = undefined
    await refreshNuxtData(`section-${sectionId.value}`)
  } catch (error) {
    console.error('Error adding student to section', error)
    toast.add({ title: 'Error', description: 'Failed to add student to section.', color: 'error' })
  } finally {
    isAddStudentSubmitting.value = false
  }
}

// ADD TEACHER TO SECTION (teachers list)
const isAddTeacherOpen = ref(false)
const teachersList = ref<{ _id: string; firstName: string; lastName: string }[]>([])
const teachersListLoading = ref(false)
const addTeacherSelectedId = ref<string | undefined>(undefined)
const isAddTeacherSubmitting = ref(false)

function openAddTeacherModal() {
  isAddTeacherOpen.value = true
  addTeacherSelectedId.value = undefined
  teachersListLoading.value = true
  $fetch(`${API_BASE}/api/admin/teacher`, {
    headers: { Authorization: `${useAuthToken().value}` }
  })
    .then((response: any) => {
      const list = response?.data ?? response?.teachers ?? response
      const rows = Array.isArray(list) ? list : []
      teachersList.value = rows.map((t: any) => ({
        _id: t._id,
        firstName: t.firstName,
        lastName: t.lastName
      }))
      teachersListLoading.value = false
    })
    .catch(() => {
      teachersListLoading.value = false
      toast.add({ title: 'Error', description: 'Failed to load teachers.', color: 'error' })
    })
}

const addTeacherDropdownItems = computed(() =>
  teachersList.value.map((t) => ({ label: `${t.firstName} ${t.lastName}`, value: t._id }))
)

async function confirmAddTeacher() {
  if (!sectionId.value || !addTeacherSelectedId.value || isAddTeacherSubmitting.value) return
  isAddTeacherSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/sections/${sectionId.value}/assign-teacher/${addTeacherSelectedId.value}`, {
      method: 'POST',
      headers: { Authorization: `${useAuthToken().value}` }
    })
    toast.add({ title: 'Success', description: 'Teacher added to section.', color: 'success' })
    isAddTeacherOpen.value = false
    addTeacherSelectedId.value = undefined
    await refreshNuxtData(`section-${sectionId.value}`)
  } catch (error) {
    console.error('Error adding teacher to section', error)
    toast.add({ title: 'Error', description: 'Failed to add teacher to section.', color: 'error' })
  } finally {
    isAddTeacherSubmitting.value = false
  }
}

// Unassign teacher from section
const teacherToUnassign = ref<{ id: string; name: string } | null>(null)
const isUnassignTeacherOpen = ref(false)
const isUnassignTeacherSubmitting = ref(false)

function openUnassignTeacherConfirm(teacher: { id: string; name: string }) {
  teacherToUnassign.value = teacher
  isUnassignTeacherOpen.value = true
}

function closeUnassignTeacherConfirm() {
  isUnassignTeacherOpen.value = false
  teacherToUnassign.value = null
}

async function confirmUnassignTeacher() {
  if (!sectionId.value || !teacherToUnassign.value || isUnassignTeacherSubmitting.value) return
  isUnassignTeacherSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/sections/${sectionId.value}/unassign-teacher/${teacherToUnassign.value.id}`, {
      method: 'PATCH',
      headers: { Authorization: `${useAuthToken().value}` }
    })
    toast.add({ title: 'Success', description: 'Teacher removed from section.', color: 'success' })
    closeUnassignTeacherConfirm()
    await refreshNuxtData(`section-${sectionId.value}`)
  } catch (error) {
    console.error('Error unassigning teacher from section', error)
    toast.add({ title: 'Error', description: 'Failed to remove teacher from section.', color: 'error' })
  } finally {
    isUnassignTeacherSubmitting.value = false
  }
}

// Unassign student from section
const studentToUnassign = ref<{ id: string; name: string } | null>(null)
const isUnassignStudentOpen = ref(false)
const isUnassignStudentSubmitting = ref(false)

function openUnassignStudentConfirm(student: { id: string; name: string }) {
  studentToUnassign.value = student
  isUnassignStudentOpen.value = true
}

function closeUnassignStudentConfirm() {
  isUnassignStudentOpen.value = false
  studentToUnassign.value = null
}

async function confirmUnassignStudent() {
  if (!sectionId.value || !studentToUnassign.value || isUnassignStudentSubmitting.value) return
  isUnassignStudentSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/sections/${sectionId.value}/unassign-student/${studentToUnassign.value.id}`, {
      method: 'PATCH',
      headers: { Authorization: `${useAuthToken().value}` }
    })
    toast.add({ title: 'Success', description: 'Student removed from section.', color: 'success' })
    closeUnassignStudentConfirm()
    await refreshNuxtData(`section-${sectionId.value}`)
  } catch (error) {
    console.error('Error unassigning student from section', error)
    toast.add({ title: 'Error', description: 'Failed to remove student from section.', color: 'error' })
  } finally {
    isUnassignStudentSubmitting.value = false
  }
}

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

      <!-- Add Student to Section Modal -->
      <UModal v-model:open="isAddStudentOpen" :dismissible="!isAddStudentSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Add Student to Section</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isAddStudentSubmitting"
              @click="isAddStudentOpen = false"
            />
          </div>
        </template>
        <template #body>
          <form class="space-y-4" @submit.prevent="confirmAddStudent">
            <UFormField label="Sectionless student" name="studentId" required block>
              <USelect
                v-model="addStudentSelectedId"
                :items="addStudentDropdownItems"
                placeholder="Select a student"
                class="w-full"
                :loading="sectionlessStudentsLoading"
                :disabled="sectionlessStudentsLoading"
              />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton
                type="button"
                variant="outline"
                :disabled="isAddStudentSubmitting"
                @click="isAddStudentOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                :loading="isAddStudentSubmitting"
                :disabled="!addStudentSelectedId || isAddStudentSubmitting"
              >
                Add Student
              </UButton>
            </div>
          </form>
        </template>
      </UModal>

      <!-- Add Teacher to Section Modal -->
      <UModal v-model:open="isAddTeacherOpen" :dismissible="!isAddTeacherSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Add Teacher to Section</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isAddTeacherSubmitting"
              @click="isAddTeacherOpen = false"
            />
          </div>
        </template>
        <template #body>
          <form class="space-y-4" @submit.prevent="confirmAddTeacher">
            <UFormField label="Teacher" name="teacherId" required block>
              <USelect
                v-model="addTeacherSelectedId"
                :items="addTeacherDropdownItems"
                placeholder="Select a teacher"
                class="w-full"
                :loading="teachersListLoading"
                :disabled="teachersListLoading"
              />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton
                type="button"
                variant="outline"
                :disabled="isAddTeacherSubmitting"
                @click="isAddTeacherOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                :loading="isAddTeacherSubmitting"
                :disabled="!addTeacherSelectedId || isAddTeacherSubmitting"
              >
                Add Teacher
              </UButton>
            </div>
          </form>
        </template>
      </UModal>

      <!-- Unassign Teacher Confirmation Modal -->
      <UModal v-model:open="isUnassignTeacherOpen" :dismissible="!isUnassignTeacherSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Remove teacher from section</h3>
        </template>
        <template #body>
          <p v-if="teacherToUnassign">
            Are you sure you want to remove {{ teacherToUnassign.name }} from this section?
          </p>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              type="button"
              variant="outline"
              :disabled="isUnassignTeacherSubmitting"
              @click="closeUnassignTeacherConfirm"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="isUnassignTeacherSubmitting"
              :disabled="isUnassignTeacherSubmitting"
              @click="confirmUnassignTeacher"
            >
              Remove
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- Unassign Student Confirmation Modal -->
      <UModal v-model:open="isUnassignStudentOpen" :dismissible="!isUnassignStudentSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Remove student from section</h3>
        </template>
        <template #body>
          <p v-if="studentToUnassign">
            Are you sure you want to remove {{ studentToUnassign.name }} from this section?
          </p>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              type="button"
              variant="outline"
              :disabled="isUnassignStudentSubmitting"
              @click="closeUnassignStudentConfirm"
            >
              Cancel
            </UButton>
            <UButton
              color="red"
              :loading="isUnassignStudentSubmitting"
              :disabled="isUnassignStudentSubmitting"
              @click="confirmUnassignStudent"
            >
              Remove
            </UButton>
          </div>
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
                <UButton icon="i-lucide-plus" variant="ghost" color="neutral" square aria-label="Add student to section" @click="openAddStudentModal" />
              </div>
              <UTable sticky ref="table" :data="studentData" :columns="columns" :loading="status === 'pending'" />
            </UContainer>
            <UContainer class="min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-xl font-semibold">Teachers ({{ teacherData.length }})</span>
                <UButton
                  icon="i-lucide-plus"
                  variant="ghost"
                  color="neutral"
                  square
                  aria-label="Add teacher to section"
                  @click="openAddTeacherModal"
                />
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
