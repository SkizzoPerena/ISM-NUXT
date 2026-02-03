<script lang="ts" setup>
import { h, resolveComponent, computed } from 'vue'
import type { TabsItem, FormError, FormSubmitEvent } from '@nuxt/ui'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

const UButton = resolveComponent('UButton')
const NuxtLink = resolveComponent('NuxtLink')

const route = useRoute()
const studentId = computed(() => route.query.id as string)

type SectionInfo = {
  _id: string
  name: string
}

type InstrumentInfo = {
  _id: string
  instrumentName: string
  proficiency: string
}

type JournalEntry = {
  _id?: string
  journalSection?: { journalId?: { _id: string; title?: string } }
  submittedAt?: string
  createdAt?: string
  updatedAt?: string
  [key: string]: unknown
}

type Assessment = {
  _id: string
  title: string
  instructions: string
  createdAt: string
}

type SpecialSubmission = {
  _id?: string
  submissionURL?: string
  submissionType?: string
  assessmentStudent?: { assessmentId?: { title?: string; instructions?: string } }
  [key: string]: unknown
}

type IndividualSubmission = {
  _id?: string
  submissionURL?: string
  submissionType?: string
  assessmentSection?: { assessmentId?: { title?: string; instructions?: string } }
  [key: string]: unknown
}

type GuardianInfo = {
  _id: string
  firstName: string
  lastName: string
  profileImageURL: string
}

type StudentDetail = {
  _id: string
  firstName: string
  lastName: string
  email: string
  gender: string
  profileImageURL: string
  assignedSections: SectionInfo[]
}

// Fetch student details from the API using the ID from the URL
const { data: student, status } = await useAsyncData<StudentDetail>(
  `student-${studentId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/student/${studentId.value}`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('API Response:', response._data)
    }
  }),
  {
    transform: (response: any): StudentDetail => {
      const studentData = response.data || response.student || response

      return {
        _id: studentData._id,
        firstName: studentData.firstName,
        lastName: studentData.lastName,
        email: studentData.email,
        gender: studentData.gender,
        profileImageURL: studentData.profileImageURL,
        assignedSections: studentData.assignedSections || [],
      }
    },
    watch: [studentId]
  }
)

// Fetch assigned guardians for the student
const { data: guardians, status: guardiansStatus } = await useAsyncData<GuardianInfo[]>(
  `student-guardians-${studentId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/student-guardian/${studentId.value}/guardians`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Guardians API Response:', response._data)
    }
  }),
  {
    transform: (response: any): GuardianInfo[] => {
      const guardianData = response.data || response.guardians || response
      return Array.isArray(guardianData) ? guardianData.map((g: any) => ({
        _id: g._id,
        firstName: g.firstName,
        lastName: g.lastName,
        profileImageURL: g.profileImageURL,
      })) : []
    },
    watch: [studentId]
  }
)

// Fetch assigned instruments for the student
const { data: instruments, status: instrumentsStatus } = await useAsyncData<InstrumentInfo[]>(
  `student-instruments-${studentId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/student-instrument/${studentId.value}`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Instruments API Response:', response._data)
    }
  }),
  {
    transform: (response: any): InstrumentInfo[] => {
      const instrumentData = response.data || response.studentInstruments || response
      return Array.isArray(instrumentData) ? instrumentData.map((item: any) => ({
        _id: item._id,
        instrumentName: item.instrument.instrumentName,
        proficiency: formatProficiency(item.proficiency),
      })) : []

    },
    watch: [studentId]
  }
)

// Fetch assigned assessments for the student
const { data: studentAssessments, status: studentAssessmentsStatus } = await useAsyncData<Assessment[]>(
  `student-assessments-${studentId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/assessment-students/${studentId.value}`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Student Assessments API Response:', response._data)
    }
  }),
  {
    transform: (response: any): Assessment[] => {
      // The response contains an 'assignments' array.
      const assignments = response.assignments || response.data || response;
      if (!Array.isArray(assignments)) {
        console.error('Expected an array of student assessments, but received:', assignments);
        return [];
      }
      return assignments.map((assignment: any) => {
        // The actual assessment details are nested under 'assessmentId'
        const assessment = assignment.assessmentId;
        // Ensure the nested assessment object and its _id exist before processing.
        if (!assessment || !assessment._id) {
          console.warn('Assessment assignment is missing assessmentId or its _id:', assignment);
          return null;
        }
        return {
          _id: assessment._id,
          title: assessment.title,
          createdAt: assignment.createdAt, // Use the assignment creation date
          instructions: assessment.instructions,
        };
      }).filter((a): a is Assessment => a !== null);
    },
    watch: [studentId]
  }
);

// Fetch special submissions for the student
const { data: specialSubmissionsRaw, status: specialSubmissionsStatus } = await useAsyncData<SpecialSubmission[]>(
  `student-special-submissions-${studentId.value}`,
  () => $fetch(`${API_BASE}/api/admin/special-submission/student/${studentId.value}`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Special Submissions API Response:', response._data)
    }
  }),
  {
    transform: (response: any): SpecialSubmission[] => {
      const list = response?.specialAssessmentSubmissions ?? response?.data ?? response?.specialSubmissions ?? response?.submissions ?? response
      return Array.isArray(list) ? list : []
    },
    watch: [studentId]
  }
);

// Pending: submissionURL is empty AND submissionType is not equal to "LIVE" (same logic as profile-section.vue)
function isPendingSpecialSubmission(entry: SpecialSubmission): boolean {
  const urlEmpty = !entry.submissionURL || String(entry.submissionURL).trim() === ''
  const notLive = entry.submissionType !== 'LIVE'
  return urlEmpty && notLive
}

const pendingSpecialSubmissions = computed(() => {
  const list = specialSubmissionsRaw.value ?? []
  return list.filter(isPendingSpecialSubmission)
})

const submittedSpecialSubmissions = computed(() => {
  const list = specialSubmissionsRaw.value ?? []
  return list.filter((entry) => !isPendingSpecialSubmission(entry))
})

// Fetch individual submissions for the student
const { data: individualSubmissionsRaw, status: individualSubmissionsStatus } = await useAsyncData<IndividualSubmission[]>(
  `student-individual-submissions-${studentId.value}`,
  () => $fetch(`${API_BASE}/api/admin/individual-submission/student/${studentId.value}`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Individual Submissions API Response:', response._data)
    }
  }),
  {
    transform: (response: any): IndividualSubmission[] => {
      const list = response?.individualAssessmentSubmissions ?? response?.data ?? response?.individualSubmissions ?? response?.submissions ?? response
      return Array.isArray(list) ? list : []
    },
    watch: [studentId]
  }
)

function isPendingIndividualSubmission(entry: IndividualSubmission): boolean {
  const urlEmpty = !entry.submissionURL || String(entry.submissionURL).trim() === ''
  const notLive = entry.submissionType !== 'LIVE'
  return urlEmpty && notLive
}

const pendingIndividualSubmissions = computed(() => {
  const list = individualSubmissionsRaw.value ?? []
  return list.filter(isPendingIndividualSubmission)
})

const submittedIndividualSubmissions = computed(() => {
  const list = individualSubmissionsRaw.value ?? []
  return list.filter((entry) => !isPendingIndividualSubmission(entry))
})

// Fetch all answered practice journal entries for the student
const { data: journalEntries, status: journalEntriesStatus } = await useAsyncData<JournalEntry[]>(
  `student-journal-entries-${studentId.value}`,
  () => $fetch(`${API_BASE}/api/admin/journal-entry/student/${studentId.value}`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Journal Entries API Response:', response._data)
    }
  }),
  {
    transform: (response: any): JournalEntry[] => {
      const list = response?.data ?? response?.journalEntries ?? response?.entries ?? response
      return Array.isArray(list) ? list : []
    },
    watch: [studentId]
  }
);

// Helper function to format proficiency strings
function formatProficiency(proficiency: string): string {
  if (!proficiency) return '';
  const lower = proficiency.toLowerCase();
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

function getProficiencyColor(proficiency: string) {
  if (!proficiency) return 'neutral' // Changed from 'gray' to 'neutral'

  const lower = proficiency.toLowerCase()
  switch (lower) {
    case 'beginner':
      return 'secondary'
    case 'intermediate':
      return 'primary'
    case 'advanced':
    case 'expert':
      return 'warning'
    default:
      return 'neutral'
  }
}

const items = [
  {
    label: 'Assignments',
    description: 'Assigned sections, instruments, and guardians.',
    icon: 'i-lucide-clipboard-list',
    slot: 'assignments' as const
  },
  {
    label: 'Assessments',
    description: 'Student assessment records.',
    icon: 'i-lucide-text-search',
    slot: 'assessments' as const
  },
  {
    label: 'Journals',
    description: 'Practice journals.',
    icon: 'i-lucide-notebook-pen',
    slot: 'journals' as const
  },
] satisfies TabsItem[]

const journalEntriesExpanded = ref({})
const assessmentsExpanded = ref({})
const submittedSpecialExpanded = ref({})
const pendingSpecialExpanded = ref({})
const submittedIndividualExpanded = ref({})
const pendingIndividualExpanded = ref({})

const journalEntryColumns: TableColumn<JournalEntry>[] = [
  {
    accessorKey: 'journalSection',
    header: 'Journal Title',
    cell: ({ row }) => row.original.journalSection?.journalId?.title ?? '—'
  },
  {
    accessorKey: 'updatedAt',
    header: 'Date Last Modified',
    cell: ({ row }) => {
      const dateValue = row.original.updatedAt ?? row.original.submittedAt ?? row.original.createdAt
      if (!dateValue) return '—'
      const date = new Date(dateValue)
      return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false }).format(date)
    }
  },
]

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
      const formattedDate = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: 'numeric', hour12: false }).format(date)
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

// Special submissions – pending: Title + expand only; submitted: Title + Upload Type + expand
const specialSubmissionColumns: TableColumn<SpecialSubmission>[] = [
  {
    accessorKey: 'assessmentStudent',
    header: 'Assessment Title',
    meta: { class: { th: 'min-w-[180px]', td: 'min-w-[180px]' } },
    cell: ({ row }) => row.original.assessmentStudent?.assessmentId?.title ?? '—'
  },
  {
    id: 'expand',
    meta: { class: { th: 'w-12', td: 'w-12' } },
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

const submittedSpecialSubmissionColumns: TableColumn<SpecialSubmission>[] = [
  {
    accessorKey: 'assessmentStudent',
    header: 'Assessment Title',
    meta: { class: { th: 'min-w-[140px] max-w-[200px]', td: 'min-w-[140px] max-w-[200px]' } },
    cell: ({ row }) => row.original.assessmentStudent?.assessmentId?.title ?? '—'
  },
  {
    accessorKey: 'submissionURL',
    header: 'Submission URL',
    meta: { class: { th: 'min-w-[120px]', td: 'min-w-[120px]' } },
    cell: ({ row }) => {
      const url = row.original.submissionURL
      if (!url || String(url).trim() === '') return h('span', { class: 'text-gray-500 dark:text-gray-400 italic' }, '—')
      return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'text-primary hover:underline break-all' }, url)
    }
  },
  {
    accessorKey: 'submissionType',
    header: 'Upload Type',
    meta: { class: { th: 'w-24 min-w-[80px]', td: 'w-24 min-w-[80px]' } },
    cell: ({ row }) => row.original.submissionType ?? '—'
  },
  {
    id: 'expand',
    meta: { class: { th: 'w-12', td: 'w-12' } },
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

// Individual submissions – submitted: Title + Submission URL + Upload Type + expand; pending: Title + expand only
const submittedIndividualSubmissionColumns: TableColumn<IndividualSubmission>[] = [
  {
    accessorKey: 'assessmentSection',
    header: 'Assessment Title',
    meta: { class: { th: 'min-w-[140px] max-w-[200px]', td: 'min-w-[140px] max-w-[200px]' } },
    cell: ({ row }) => row.original.assessmentSection?.assessmentId?.title ?? '—'
  },
  {
    accessorKey: 'submissionURL',
    header: 'Submission URL',
    meta: { class: { th: 'min-w-[120px]', td: 'min-w-[120px]' } },
    cell: ({ row }) => {
      const url = row.original.submissionURL
      if (!url || String(url).trim() === '') return h('span', { class: 'text-gray-500 dark:text-gray-400 italic' }, '—')
      return h('a', { href: url, target: '_blank', rel: 'noopener noreferrer', class: 'text-primary hover:underline break-all' }, url)
    }
  },
  {
    accessorKey: 'submissionType',
    header: 'Upload Type',
    meta: { class: { th: 'w-24 min-w-[80px]', td: 'w-24 min-w-[80px]' } },
    cell: ({ row }) => row.original.submissionType ?? '—'
  },
  {
    id: 'expand',
    meta: { class: { th: 'w-12', td: 'w-12' } },
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

const pendingIndividualSubmissionColumns: TableColumn<IndividualSubmission>[] = [
  {
    accessorKey: 'assessmentSection',
    header: 'Assessment Title',
    meta: { class: { th: 'min-w-[180px]', td: 'min-w-[180px]' } },
    cell: ({ row }) => row.original.assessmentSection?.assessmentId?.title ?? '—'
  },
  {
    id: 'expand',
    meta: { class: { th: 'w-12', td: 'w-12' } },
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

// EDIT / DELETE STUDENT
const isEditOpen = ref(false)
const isDeleteOpen = ref(false)
const isEditSubmitting = ref(false)
const isDeleteSubmitting = ref(false)

const editState = reactive({
  firstName: '',
  lastName: '',
  email: '',
  gender: '',
})

type EditSchema = typeof editState

function validateEdit(state: Partial<EditSchema>): FormError[] {
  const errors: FormError[] = []
  if (!state.firstName) errors.push({ name: 'firstName', message: 'Required' })
  if (!state.lastName) errors.push({ name: 'lastName', message: 'Required' })
  if (!state.email) errors.push({ name: 'email', message: 'Required' })
  if (!state.gender) errors.push({ name: 'gender', message: 'Required' })
  return errors
}

const genderOptions = ref(['Male', 'Female'])
const toast = useToast()

function openEditModal() {
  if (!student.value) return
  editState.firstName = student.value.firstName
  editState.lastName = student.value.lastName
  editState.email = student.value.email
  editState.gender = student.value.gender
  isEditOpen.value = true
}

async function onSubmitEdit(event: FormSubmitEvent<EditSchema>) {
  if (!studentId.value || isEditSubmitting.value) return
  isEditSubmitting.value = true
  try {
    await $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/student/${studentId.value}`, {
      method: 'PATCH',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
      body: {
        firstName: editState.firstName,
        lastName: editState.lastName,
        email: editState.email,
        gender: editState.gender,
      },
    })

    toast.add({
      title: 'Success',
      description: 'Student updated successfully.',
      color: 'success',
    })

    isEditOpen.value = false
    await refreshNuxtData(`student-${studentId.value}`)
  } catch (error) {
    console.error('Error updating student:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to update student.',
      color: 'error',
    })
  } finally {
    isEditSubmitting.value = false
  }
}

async function onDeleteStudent() {
  if (!studentId.value || isDeleteSubmitting.value) return
  isDeleteSubmitting.value = true
  try {
    await $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/student/${studentId.value}`, {
      method: 'DELETE',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
    })

    toast.add({
      title: 'Deleted',
      description: 'Student deleted successfully.',
      color: 'success',
    })

    isDeleteOpen.value = false
    await navigateTo('/students')
  } catch (error) {
    console.error('Error deleting student:', error)
    toast.add({
      title: 'Error',
      description: 'Failed to delete student.',
      color: 'error',
    })
  } finally {
    isDeleteSubmitting.value = false
  }
}

</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading student profile...</p>
    </UPageCard>
    <template v-else-if="student">
      <UPageCard>
        <div class="flex items-center">
          <NuxtImg
            :src="student.profileImageURL || 'https://placehold.co/400x400'"
            :alt="`${student.firstName} ${student.lastName}`"
            width="200"
            height="200"
            class="rounded-full"
            fit="fill"
            preload
          />
          <UContainer class="ml-8 w-full">
            <div class="flex items-start justify-between w-full">
              <UPageHeader
                :title="`${student.firstName} ${student.lastName}`"
                style="border-bottom: 0; padding-bottom: 0;"
              >
                <div
                  class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400"
                  id="email"
                >
                  {{ student.email }}
                </div>
                <div
                  class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400"
                  id="_id"
                >
                  #{{ student._id }}
                </div>
              </UPageHeader>

              <div class="flex items-start gap-2">
                <UButton
                  icon="i-lucide-pencil"
                  variant="ghost"
                  aria-label="Edit student"
                  @click="openEditModal"
                />
                <UButton
                  icon="i-lucide-trash"
                  color="red"
                  variant="ghost"
                  aria-label="Delete student"
                  @click="isDeleteOpen = true"
                />
              </div>
            </div>
          </UContainer>
        </div>
      </UPageCard>

      <UPageCard class="mt-6">
        <UTabs :items="items" variant="link" :ui="{ trigger: 'grow' }" class="gap-4 w-full">

          <!-- ASSIGNMENTS TAB -->
          <template #assignments="{ item }">
            <UPageGrid class="mt-5">
              <div>
                <UContainer v-if="student.assignedSections && student.assignedSections.length > 0">
                  <h3 class="text-lg font-semibold">Assigned Sections</h3>

                  <div class="space-y-2 mt-4">
                    <div v-for="section in student.assignedSections" :key="section._id">
                      <NuxtLink :to="`/profile-section?id=${section._id}`" class="text-primary font-medium hover:underline">
                        {{ section.name }}
                      </NuxtLink>
                    </div>
                  </div>
                </UContainer>
                <UContainer v-else-if="status === 'success'">
                  <h3 class="text-lg font-semibold">Assigned Sections</h3>
                  <p class="mt-4">No sections assigned to this student.</p>
                </UContainer>
              </div>

              <div>
                <UContainer v-if="instruments && instruments.length > 0">
                  <h3 class="text-lg font-semibold">Assigned Instruments</h3>

                  <div class="space-y-2 mt-4">
                    <div v-for="instrument in instruments" :key="instrument._id">
                      <span class="text-gray-900 dark:text-white">
                        {{ instrument.instrumentName }}
                        <UBadge v-if="instrument.proficiency" :color="getProficiencyColor(instrument.proficiency)" variant="subtle" class="ml-2">{{ instrument.proficiency }}</UBadge>
                      </span>
                    </div>
                  </div>
                </UContainer>
                <UContainer v-else-if="instrumentsStatus === 'success'">
                  <h3 class="text-lg font-semibold">Assigned Instruments</h3>
                  <p class="mt-4">No instruments assigned to this student.</p>
                </UContainer>
              </div>

              <div>
                <UContainer v-if="guardians && guardians.length > 0">
                  <h3 class="text-lg font-semibold">Assigned Guardians</h3>

                  <div class="space-y-4 mt-4">
                    <div v-for="guardian in guardians" :key="guardian._id" class="flex items-center gap-4">
                      <UAvatar :src="guardian.profileImageURL" :alt="`${guardian.firstName} ${guardian.lastName}`" />
                      <div>
                        <NuxtLink :to="`/profile-guardian?id=${guardian._id}`" class="text-primary font-medium hover:underline">
                          {{ guardian.firstName }} {{ guardian.lastName }}
                        </NuxtLink>
                      </div>
                    </div>
                  </div>
                </UContainer>
                <UContainer v-else-if="guardiansStatus === 'success'">
                  <h3 class="text-lg font-semibold">Assigned Guardians</h3>
                  <p class="mt-4">No guardians assigned to this student.</p>
                </UContainer>
              </div>
            </UPageGrid>
          </template>

          <!-- ASSESSMENTS TAB -->
          <template #assessments="{ item }">
            <UContainer class="mt-5">
              <div class="text-lg font-semibold">Assigned Special Assessments</div>

              <UTable v-model:expanded="assessmentsExpanded" :data="studentAssessments || []" :columns="assessmentcolumns"
                :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1 mt-4 border-t border-default" :loading="studentAssessmentsStatus === 'pending'">
                <template #empty-state>
                  <div class="flex flex-col items-center justify-center py-6 gap-3">
                    <span class="italic text-sm">No assessments assigned to this student.</span>
                  </div>
                </template>
                <template #expanded="{ row }">
                  <p class="p-4">{{ row.original.instructions }}</p>
                </template>
              </UTable>
            </UContainer>

            <UContainer class="mt-8">
              <div class="text-lg font-semibold mb-2">Submitted Special Assessments ({{ submittedSpecialSubmissions.length }})</div>
              <UTable
                v-model:expanded="submittedSpecialExpanded"
                :data="submittedSpecialSubmissions"
                :columns="submittedSpecialSubmissionColumns"
                :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
                class="border-t border-default w-full table-fixed mt-4"
                :loading="specialSubmissionsStatus === 'pending'"
              >
                <template #empty-state>
                  <div class="flex flex-col items-center justify-center py-6 gap-3">
                    <span class="italic text-sm">No submitted special assessments.</span>
                  </div>
                </template>
                <template #expanded="{ row }">
                  <p class="p-4">{{ row.original.assessmentStudent?.assessmentId?.instructions ?? '—' }}</p>
                </template>
              </UTable>
            </UContainer>

            <UContainer class="mt-8">
              <div class="text-lg font-semibold mb-2">Pending Special Assessments ({{ pendingSpecialSubmissions.length }})</div>
              <UTable
                v-model:expanded="pendingSpecialExpanded"
                :data="pendingSpecialSubmissions"
                :columns="specialSubmissionColumns"
                :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
                class="border-t border-default w-full table-fixed mt-4"
                :loading="specialSubmissionsStatus === 'pending'"
              >
                <template #empty-state>
                  <div class="flex flex-col items-center justify-center py-6 gap-3">
                    <span class="italic text-sm">No pending special assessments.</span>
                  </div>
                </template>
                <template #expanded="{ row }">
                  <p class="p-4">{{ row.original.assessmentStudent?.assessmentId?.instructions ?? '—' }}</p>
                </template>
              </UTable>
            </UContainer>

            <UContainer class="mt-8">
              <div class="text-lg font-semibold mb-2">Submitted Individual Assessments ({{ submittedIndividualSubmissions.length }})</div>
              <UTable
                v-model:expanded="submittedIndividualExpanded"
                :data="submittedIndividualSubmissions"
                :columns="submittedIndividualSubmissionColumns"
                :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
                class="border-t border-default w-full table-fixed mt-4"
                :loading="individualSubmissionsStatus === 'pending'"
              >
                <template #empty-state>
                  <div class="flex flex-col items-center justify-center py-6 gap-3">
                    <span class="italic text-sm">No submitted individual assessments.</span>
                  </div>
                </template>
                <template #expanded="{ row }">
                  <p class="p-4">{{ row.original.assessmentSection?.assessmentId?.instructions ?? '—' }}</p>
                </template>
              </UTable>
            </UContainer>

            <UContainer class="mt-8">
              <div class="text-lg font-semibold mb-2">Pending Individual Assessments ({{ pendingIndividualSubmissions.length }})</div>
              <UTable
                v-model:expanded="pendingIndividualExpanded"
                :data="pendingIndividualSubmissions"
                :columns="pendingIndividualSubmissionColumns"
                :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
                class="border-t border-default w-full table-fixed mt-4"
                :loading="individualSubmissionsStatus === 'pending'"
              >
                <template #empty-state>
                  <div class="flex flex-col items-center justify-center py-6 gap-3">
                    <span class="italic text-sm">No pending individual assessments.</span>
                  </div>
                </template>
                <template #expanded="{ row }">
                  <p class="p-4">{{ row.original.assessmentSection?.assessmentId?.instructions ?? '—' }}</p>
                </template>
              </UTable>
            </UContainer>
          </template>

          <!-- JOURNALS TAB -->
          <template #journals="{ item }">
            <UContainer class="mt-5">
              <div class="text-lg font-semibold">Answered Practice Journals</div>

              <UTable
                v-model:expanded="journalEntriesExpanded"
                :data="journalEntries || []"
                :columns="journalEntryColumns"
                :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
                class="flex-1 mt-4 border-t border-default"
                :loading="journalEntriesStatus === 'pending'"
              >
                <template #empty-state>
                  <div class="flex flex-col items-center justify-center py-6 gap-3">
                    <span class="italic text-sm">No answered journal entries yet.</span>
                  </div>
                </template>
              </UTable>
            </UContainer>
          </template>
        </UTabs>
      </UPageCard>

      <!-- Edit Student Modal -->
      <UModal v-model:open="isEditOpen" :dismissible="!isEditSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Edit Student</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isEditSubmitting"
              @click="isEditOpen = false"
            />
          </div>
        </template>
        <template #body>
          <UForm
            :validate="validateEdit"
            :state="editState"
            class="space-y-4"
            @submit="onSubmitEdit"
          >
            <UFormField label="First Name" name="firstName" required block>
              <UInput v-model="editState.firstName" class="w-full" />
            </UFormField>

            <UFormField label="Last Name" name="lastName" required block>
              <UInput v-model="editState.lastName" class="w-full" />
            </UFormField>

            <UFormField label="Email Address" name="email" required block>
              <UInput v-model="editState.email" type="email" class="w-full" />
            </UFormField>

            <UFormField label="Gender" name="gender" required block>
              <USelect
                v-model="editState.gender"
                :items="genderOptions"
                placeholder="Select gender"
                class="w-full"
              />
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton
                type="button"
                variant="outline"
                :disabled="isEditSubmitting"
                @click="isEditOpen = false"
              >
                Cancel
              </UButton>
              <UButton type="submit" :loading="isEditSubmitting" :disabled="isEditSubmitting">
                Update Student
              </UButton>
            </div>
          </UForm>
        </template>
      </UModal>

      <!-- Delete Confirmation Modal -->
      <UModal v-model:open="isDeleteOpen" :dismissible="!isDeleteSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Delete Student</h3>
        </template>
        <template #body>
          <p>Are you sure you want to delete this student? This action cannot be undone.</p>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              type="button"
              variant="outline"
              :disabled="isDeleteSubmitting"
              @click="isDeleteOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              color="red"
              :loading="isDeleteSubmitting"
              :disabled="isDeleteSubmitting"
              @click="onDeleteStudent"
            >
              Delete
            </UButton>
          </div>
        </template>
      </UModal>

    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load student profile.</p>
    </UPageCard>
  </UContainer>
</template>