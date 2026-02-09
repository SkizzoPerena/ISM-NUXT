<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent, computed } from 'vue'
import type { TabsItem } from '@nuxt/ui'
import type { TableColumn } from '@nuxt/ui'
import type { AccordionItem } from '@nuxt/ui'

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
  assignmentId?: string // id of journal-section record for DELETE
}

type Assessment = {
  _id: string
  title: string
  createdAt: string // Assignment creation date
  instructions: string
  assignmentId?: string // id of assessment-section record for DELETE
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
const { data: journalEntries, status: journalEntriesStatus, refresh: refreshJournalEntries } = await useAsyncData<Journal[]>(
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

      const result: Journal[] = [];
      for (const assignment of assignments) {
        const journal = assignment.journalId;
        if (!journal) {
          console.warn('Journal assignment is missing journalId property:', assignment);
          continue;
        }
        result.push({
          _id: journal._id,
          title: journal.title,
          createdAt: assignment.createdAt,
          endDate: assignment.endDate,
          description: journal.description,
          assignmentId: assignment._id,
        });
      }
      return result;
    },
    watch: [sectionId]
  }
);

// Fetch assigned group assessments for the section
const { data: groupAssessments, status: groupAssessmentsStatus, refresh: refreshGroupAssessments } = await useAsyncData<Assessment[]>(
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

      const result: Assessment[] = [];
      for (const assignment of assignments) {
        const assessment = assignment.assessmentId;
        if (!assessment) {
          console.warn('Group assessment assignment is missing assessmentId property:', assignment);
          continue;
        }
        result.push({
          _id: assessment._id,
          title: assessment.title,
          createdAt: assignment.createdAt,
          instructions: assessment.instructions,
          assignmentId: assignment._id,
        });
      }
      return result;
    },
    watch: [sectionId]
  }
);

// Fetch assigned individual assessments for the section
const { data: individualAssessments, status: individualAssessmentsStatus, refresh: refreshIndividualAssessments } = await useAsyncData<Assessment[]>(
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

      const result: Assessment[] = [];
      for (const assignment of assignments) {
        const assessment = assignment.assessmentId;
        if (!assessment) {
          console.warn('Individual assessment assignment is missing assessmentId property:', assignment);
          continue;
        }
        result.push({
          _id: assessment._id,
          title: assessment.title,
          createdAt: assignment.createdAt,
          instructions: assessment.instructions,
          assignmentId: assignment._id,
        });
      }
      return result;
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
    meta: { class: { td: 'w-3/4' } },

    cell: ({ row }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UAvatar, { src: row.original.avatar, alt: row.original.name }),
      h('div', undefined, [
        h(NuxtLink, { to: `/profile-student?id=${row.original.id}`, class: 'text-primary font-medium hover:underline' }, { default: () => row.getValue('name') }),
        h('p', { class: 'text-sm text-gray-500 dark:text-gray-400' }, row.original.email)
      ])
    ])
  },
  {
    accessorKey: 'gender',
    header: 'Gender',
    meta: { class: { td: 'w-1/4' } },
    cell: ({ row }) => row.original.gender ?? '—'
  },
  {
    id: 'unassign',
    header: '',
    cell: ({ row }) =>
      h(UButton, {
        icon: 'i-lucide-trash-2',
        color: 'error',
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
    meta: { class: { td: 'w-3/4' } },
    cell: ({ row }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UAvatar, { src: row.original.avatar, alt: row.original.name }),
      h('div', undefined, [
        h(NuxtLink, { to: `/profile-teacher?id=${row.original.id}`, class: 'text-primary font-medium hover:underline' }, { default: () => row.getValue('name') }),
        h('p', { class: 'text-sm text-gray-500 dark:text-gray-400' }, row.original.email)
      ])
    ])
  },
  {
    accessorKey: 'gender',
    header: 'Gender',
    meta: { class: { td: 'w-1/4' } },
    cell: ({ row }) => row.original.gender ?? '—'
  },
  {
    id: 'unassign',
    header: '',
    cell: ({ row }) =>
      h(UButton, {
        icon: 'i-lucide-trash-2',
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

// DELETE SECTION
const isDeleteSectionOpen = ref(false)
const isDeleteSectionSubmitting = ref(false)

function openDeleteSectionModal() {
  isDeleteSectionOpen.value = true
}

async function confirmDeleteSection() {
  if (!sectionId.value || isDeleteSectionSubmitting.value) return
  isDeleteSectionSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/sections/archive/${sectionId.value}`, {
      method: 'DELETE',
      headers: {
        Authorization: `${useAuthToken().value}`
      }
    })
    toast.add({ title: 'Success', description: 'Section archived successfully.', color: 'success' })
    isDeleteSectionOpen.value = false
    await navigateTo('/sections')
  } catch (error) {
    console.error('Error archiving section:', error)
    toast.add({ title: 'Error', description: 'Failed to archive section.', color: 'error' })
  } finally {
    isDeleteSectionSubmitting.value = false
  }
}

// END DELETE SECTION

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

// Assign Assessment to Section (class or individual output)
const isAssignAssessmentOpen = ref(false)
const allAssessments = ref<{ _id: string; title: string }[]>([])
const allAssessmentsLoading = ref(false)
const assignAssessmentSelectedId = ref<string | undefined>(undefined)
const assignAssessmentOutputType = ref<'class' | 'individual' | null>(null)

function openAssignAssessmentModal() {
  isAssignAssessmentOpen.value = true
  assignAssessmentSelectedId.value = undefined
  assignAssessmentOutputType.value = null
  allAssessmentsLoading.value = true
  $fetch(`${API_BASE}/api/admin/assessments`, {
    headers: { Authorization: `${useAuthToken().value}` }
  })
    .then((response: any) => {
      const list = response?.data ?? response?.assessments ?? response
      const rows = Array.isArray(list) ? list : []
      allAssessments.value = rows.map((a: any) => ({ _id: a._id, title: a.title ?? '' }))
      allAssessmentsLoading.value = false
    })
    .catch(() => {
      allAssessmentsLoading.value = false
      toast.add({ title: 'Error', description: 'Failed to load assessments.', color: 'error' })
    })
}

const assignAssessmentDropdownItems = computed(() =>
  allAssessments.value.map((a) => ({ label: a.title, value: a._id }))
)

const isAssignAssessmentSubmitting = ref(false)

async function confirmAssignAssessment() {
  if (!sectionId.value || !assignAssessmentSelectedId.value || !assignAssessmentOutputType.value || isAssignAssessmentSubmitting.value) return
  isAssignAssessmentSubmitting.value = true
  const outputType = assignAssessmentOutputType.value
  const url = outputType === 'individual'
    ? `${API_BASE}/api/admin/assessment-sections/assign/individual`
    : `${API_BASE}/api/admin/assessment-sections/assign/group`
  try {
    await $fetch(url, {
      method: 'POST',
      headers: { Authorization: `${useAuthToken().value}` },
      body: { sectionId: sectionId.value, assessmentId: assignAssessmentSelectedId.value },
    })
    toast.add({ title: 'Success', description: 'Assessment assigned to section.', color: 'success' })
    isAssignAssessmentOpen.value = false
    assignAssessmentSelectedId.value = undefined
    assignAssessmentOutputType.value = null
    if (outputType === 'individual') {
      await refreshIndividualAssessments()
    } else {
      await refreshGroupAssessments()
    }
  } catch (error: any) {
    toast.add({ title: 'Error', description: 'Failed to assign assessment.', color: 'error' })
  } finally {
    isAssignAssessmentSubmitting.value = false
  }
}

// Unassign Assessment (group or individual)
const assessmentToUnassign = ref<Assessment | null>(null)
const unassignAssessmentType = ref<'group' | 'individual' | null>(null)
const isUnassignAssessmentOpen = ref(false)
const isUnassignAssessmentSubmitting = ref(false)

function openUnassignAssessment(assessment: Assessment, type: 'group' | 'individual') {
  assessmentToUnassign.value = assessment
  unassignAssessmentType.value = type
  isUnassignAssessmentOpen.value = true
}

function closeUnassignAssessmentConfirm() {
  if (!isUnassignAssessmentSubmitting.value) {
    isUnassignAssessmentOpen.value = false
    assessmentToUnassign.value = null
    unassignAssessmentType.value = null
  }
}

async function confirmUnassignAssessment() {
  const assignmentId = assessmentToUnassign.value?.assignmentId ?? assessmentToUnassign.value?._id
  const type = unassignAssessmentType.value
  if (!assignmentId || !type || isUnassignAssessmentSubmitting.value) return
  isUnassignAssessmentSubmitting.value = true
  const url = type === 'individual'
    ? `${API_BASE}/api/admin/assessment-sections/unassign/individual/${assignmentId}`
    : `${API_BASE}/api/admin/assessment-sections/unassign/group/${assignmentId}`
  try {
    await $fetch(url, {
      method: 'DELETE',
      headers: { Authorization: `${useAuthToken().value}` },
    })
    toast.add({ title: 'Success', description: 'Assessment removed from section.', color: 'success' })
    isUnassignAssessmentOpen.value = false
    assessmentToUnassign.value = null
    unassignAssessmentType.value = null
    if (type === 'individual') {
      await refreshIndividualAssessments()
    } else {
      await refreshGroupAssessments()
    }
  } catch (error: any) {
    toast.add({ title: 'Error', description: 'Failed to remove assessment.', color: 'error' })
  } finally {
    isUnassignAssessmentSubmitting.value = false
  }
}

// Add Practice Journal to Section
const isAddJournalOpen = ref(false)
const availableJournals = ref<{ _id: string; title: string }[]>([])
const journalsLoading = ref(false)
const addJournalSelectedId = ref<string | undefined>(undefined)
const addJournalStartDate = ref<string>('')
const addJournalEndDate = ref<string>('')

function openAddJournalModal() {
  isAddJournalOpen.value = true
  addJournalSelectedId.value = undefined
  addJournalStartDate.value = ''
  addJournalEndDate.value = ''
  journalsLoading.value = true
  $fetch(`${API_BASE}/api/admin/journals`, {
    headers: { Authorization: `${useAuthToken().value}` }
  })
    .then((response: any) => {
      const list = response?.data ?? response?.journals ?? response
      const rows = Array.isArray(list) ? list : []
      availableJournals.value = rows
        .filter((j: any) => j && j._id && j.title)
        .map((j: any) => ({ _id: j._id, title: j.title ?? '' }))
      journalsLoading.value = false
    })
    .catch(() => {
      journalsLoading.value = false
      toast.add({ title: 'Error', description: 'Failed to load journals.', color: 'error' })
    })
}

const addJournalDropdownItems = computed(() =>
  availableJournals.value.map((j) => ({ label: j.title, value: j._id }))
)

// First allowed start date = today + 2 days (YYYY-MM-DD)
const minStartDate = computed(() => {
  const d = new Date()
  d.setDate(d.getDate() + 2)
  return d.toISOString().slice(0, 10)
})

// End date min = start date + 30 days; only meaningful when start date is set
const minEndDate = computed(() => {
  if (!addJournalStartDate.value) return ''
  const start = new Date(addJournalStartDate.value)
  start.setDate(start.getDate() + 30)
  return start.toISOString().slice(0, 10)
})

const endDateDisabled = computed(() => !addJournalStartDate.value)

// Assign button valid only when journal + start + end set and end >= start + 30
const isAddJournalFormValid = computed(() => {
  if (!addJournalSelectedId.value || !addJournalStartDate.value || !addJournalEndDate.value) return false
  const minEnd = minEndDate.value
  if (!minEnd) return false
  return addJournalEndDate.value >= minEnd
})

const isAddJournalSubmitting = ref(false)

async function confirmAssignJournal() {
  if (!sectionId.value || !addJournalSelectedId.value || !addJournalStartDate.value || !addJournalEndDate.value || !isAddJournalFormValid.value || isAddJournalSubmitting.value) return
  isAddJournalSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/journal-sections/assign`, {
      method: 'POST',
      headers: { Authorization: `${useAuthToken().value}` },
      body: {
        sectionId: sectionId.value,
        journalId: addJournalSelectedId.value,
        startDate: addJournalStartDate.value,
        endDate: addJournalEndDate.value,
      },
    })
    toast.add({ title: 'Success', description: 'Journal assigned to section.', color: 'success' })
    isAddJournalOpen.value = false
    addJournalSelectedId.value = undefined
    addJournalStartDate.value = ''
    addJournalEndDate.value = ''
    await refreshJournalEntries()
  } catch (error: any) {
    toast.add({ title: 'Error', description: 'Failed to assign journal.', color: 'error' })
  } finally {
    isAddJournalSubmitting.value = false
  }
}

// Unassign Journal from Section
const journalToUnassign = ref<Journal | null>(null)
const isUnassignJournalOpen = ref(false)
const isUnassignJournalSubmitting = ref(false)

function openUnassignJournal(journal: Journal) {
  journalToUnassign.value = journal
  isUnassignJournalOpen.value = true
}

function closeUnassignJournalConfirm() {
  if (!isUnassignJournalSubmitting.value) {
    isUnassignJournalOpen.value = false
    journalToUnassign.value = null
  }
}

async function confirmUnassignJournal() {
  const assignmentId = journalToUnassign.value?.assignmentId ?? journalToUnassign.value?._id
  if (!assignmentId || isUnassignJournalSubmitting.value) return
  isUnassignJournalSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/journal-sections/${assignmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `${useAuthToken().value}` },
    })
    toast.add({ title: 'Success', description: 'Journal removed from section.', color: 'success' })
    isUnassignJournalOpen.value = false
    journalToUnassign.value = null
    await refreshJournalEntries()
  } catch (error: any) {
    toast.add({ title: 'Error', description: 'Failed to remove journal.', color: 'error' })
  } finally {
    isUnassignJournalSubmitting.value = false
  }
}

// START ASSESSMENT TAB SCRIPT

const groupAssessmentColumns: TableColumn<Assessment>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    meta: { class: { td: 'w-1/2' } },
    cell: ({ row }) => h(NuxtLink, { to: `/details-assessment?id=${row.original._id}`, class: 'text-primary font-medium hover:underline' }, { default: () => row.getValue('title') })
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    meta: { class: { td: 'w-1/2' } },
    cell: ({ row }) => {
      const dateValue = row.getValue('createdAt') as string
      if (!dateValue) return ''
      const date = new Date(dateValue)
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
      h('div', { class: 'flex items-center' }, [
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
          color: 'error',
          variant: 'ghost',
          icon: 'i-lucide-trash-2',
          square: true,
          'aria-label': 'Unassign Assessment',
          onClick: () => openUnassignAssessment(row.original, 'group'),
        })])
  },
]

const individualAssessmentColumns: TableColumn<Assessment>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    meta: { class: { td: 'w-1/2' } },
    cell: ({ row }) => h(NuxtLink, { to: `/details-assessment?id=${row.original._id}`, class: 'text-primary font-medium hover:underline' }, { default: () => row.getValue('title') })
  },
  {
    accessorKey: 'createdAt',
    header: 'Date',
    meta: { class: { td: 'w-1/2' } },
    cell: ({ row }) => {
      const dateValue = row.getValue('createdAt') as string
      if (!dateValue) return ''
      const date = new Date(dateValue)
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
      h('div', { class: 'flex items-center' }, [
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
          color: 'error',
          variant: 'ghost',
          icon: 'i-lucide-trash-2',
          square: true,
          'aria-label': 'Unassign Assessment',
          onClick: () => openUnassignAssessment(row.original, 'individual'),
        })])
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
    cell: ({ row }) => {
      const title = row.original.assessmentSection?.assessmentId?.title ?? '—'
      const submissionId = row.original._id
      if (!submissionId) return title
      return h(NuxtLink, { to: `/details-submissions-group?id=${submissionId}`, class: 'text-primary font-medium hover:underline' }, { default: () => title })
    }
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

const assessmentAccordionItems = computed(() => [
  {
    label: `Class Assessments (${groupAssessments.value?.length || 0})`,
    slot: 'class-assessments',
    defaultOpen: true,
  },
  {
    label: `Individual Assessments (${individualAssessments.value?.length || 0})`,
    slot: 'individual-assessments',
  },
])

const submissionAccordionItems = computed(() => [

  {
    label: `Pending Submissions (${pendingSubmissions.value.length})`,
    slot: 'pending-submissions',
  },
  {
    label: `Submitted Submissions (${submittedSubmissions.value.length})`,
    slot: 'submitted-submissions',
  },
])

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
    meta: { class: { td: 'w-1/2' } },
    cell: ({ row }) => h(NuxtLink, { to: `/details-journal?id=${row.original._id}`, class: 'text-primary font-medium hover:underline' }, { default: () => row.getValue('title') })
  },
  {
    accessorKey: 'endDate',
    header: 'Date',
    meta: { class: { td: 'w-1/2' } },
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
      h('div', { class: 'flex items-center' }, [
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
          color: 'error',
          variant: 'ghost',
          icon: 'i-lucide-trash-2',
          square: true,
          'aria-label': 'Unassign journal',
          onClick: () => openUnassignJournal(row.original),
        })])
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
      <div class="flex items-center justify-between w-full"
        style="border-bottom: 0; margin-top: auto; padding-bottom: 0;">
        <UPageHeader :title="section.name" style="border-bottom: 0; padding-bottom: 0;" />
        <div class="flex items-center gap-1">
          <UButton icon="i-lucide-pencil" variant="ghost" aria-label="Edit section" @click="openEditModal" />
          <UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Delete section" @click="openDeleteSectionModal" />
        </div>
      </div>

      <UModal v-model:open="isDeleteSectionOpen" :dismissible="!isDeleteSectionSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Delete Section</h3>
            <UButton icon="i-lucide-x" variant="ghost" :disabled="isDeleteSectionSubmitting" @click="isDeleteSectionOpen = false" />
          </div>
        </template>
        <template #body>
          <p class="text-default mb-4">Are you sure you want to archive this section? This action cannot be undone.</p>
          <div class="flex gap-2 justify-end">
            <UButton type="button" variant="outline" :disabled="isDeleteSectionSubmitting" @click="isDeleteSectionOpen = false">
              Cancel
            </UButton>
            <UButton color="error" :loading="isDeleteSectionSubmitting" @click="confirmDeleteSection">
              Delete Section
            </UButton>
          </div>
        </template>
      </UModal>

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
            <UButton icon="i-lucide-x" variant="ghost" :disabled="isAddStudentSubmitting"
              @click="isAddStudentOpen = false" />
          </div>
        </template>
        <template #body>
          <form class="space-y-4" @submit.prevent="confirmAddStudent">
            <UFormField label="Sectionless student" name="studentId" required block>
              <USelect v-model="addStudentSelectedId" :items="addStudentDropdownItems" placeholder="Select a student"
                class="w-full" :loading="sectionlessStudentsLoading" :disabled="sectionlessStudentsLoading" />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton type="button" variant="outline" :disabled="isAddStudentSubmitting"
                @click="isAddStudentOpen = false">
                Cancel
              </UButton>
              <UButton type="submit" :loading="isAddStudentSubmitting"
                :disabled="!addStudentSelectedId || isAddStudentSubmitting">
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
            <UButton icon="i-lucide-x" variant="ghost" :disabled="isAddTeacherSubmitting"
              @click="isAddTeacherOpen = false" />
          </div>
        </template>
        <template #body>
          <form class="space-y-4" @submit.prevent="confirmAddTeacher">
            <UFormField label="Teacher" name="teacherId" required block>
              <USelect v-model="addTeacherSelectedId" :items="addTeacherDropdownItems" placeholder="Select a teacher"
                class="w-full" :loading="teachersListLoading" :disabled="teachersListLoading" />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton type="button" variant="outline" :disabled="isAddTeacherSubmitting"
                @click="isAddTeacherOpen = false">
                Cancel
              </UButton>
              <UButton type="submit" :loading="isAddTeacherSubmitting"
                :disabled="!addTeacherSelectedId || isAddTeacherSubmitting">
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
            <UButton type="button" variant="outline" :disabled="isUnassignTeacherSubmitting"
              @click="closeUnassignTeacherConfirm">
              Cancel
            </UButton>
            <UButton color="error" :loading="isUnassignTeacherSubmitting" :disabled="isUnassignTeacherSubmitting"
              @click="confirmUnassignTeacher">
              Remove
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- Unassign Student Confirmation Modal -->
      <!-- Assign Assessment Modal -->
      <UModal v-model:open="isAssignAssessmentOpen" :dismissible="!isAssignAssessmentSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Assign Assessment</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isAssignAssessmentSubmitting"
              @click="isAssignAssessmentOpen = false"
            />
          </div>
        </template>
        <template #body>
          <div class="space-y-6">
            <UFormField label="Assessment" name="assessmentId" required block>
              <USelect
                v-model="assignAssessmentSelectedId"
                :items="assignAssessmentDropdownItems"
                placeholder="Select an assessment"
                class="w-full"
                :loading="allAssessmentsLoading"
                :disabled="allAssessmentsLoading"
              />
            </UFormField>

            <UFormField label="Assign as" name="outputType" block>
              <div class="flex gap-3">
                <UButton
                  :color="assignAssessmentOutputType === 'class' ? 'primary' : 'neutral'"
                  :variant="assignAssessmentOutputType === 'class' ? 'solid' : 'outline'"
                  class="flex-1"
                  :disabled="isAssignAssessmentSubmitting"
                  @click="assignAssessmentOutputType = 'class'"
                >
                  Class output
                </UButton>
                <UButton
                  :color="assignAssessmentOutputType === 'individual' ? 'primary' : 'neutral'"
                  :variant="assignAssessmentOutputType === 'individual' ? 'solid' : 'outline'"
                  class="flex-1"
                  :disabled="isAssignAssessmentSubmitting"
                  @click="assignAssessmentOutputType = 'individual'"
                >
                  Individual output
                </UButton>
              </div>
            </UFormField>

            <div class="flex justify-end gap-2 pt-2">
              <UButton
                variant="outline"
                :disabled="isAssignAssessmentSubmitting"
                @click="isAssignAssessmentOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                :loading="isAssignAssessmentSubmitting"
                :disabled="!assignAssessmentSelectedId || !assignAssessmentOutputType || isAssignAssessmentSubmitting"
                @click="confirmAssignAssessment"
              >
                Assign
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Unassign Assessment Confirmation Modal -->
      <UModal v-model:open="isUnassignAssessmentOpen" :dismissible="!isUnassignAssessmentSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Remove assessment from section</h3>
        </template>
        <template #body>
          <p v-if="assessmentToUnassign">
            Are you sure you want to remove {{ assessmentToUnassign.title }} from this section
            ({{ unassignAssessmentType === 'group' ? 'class' : 'individual' }} output)?
          </p>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              type="button"
              variant="outline"
              :disabled="isUnassignAssessmentSubmitting"
              @click="closeUnassignAssessmentConfirm"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="isUnassignAssessmentSubmitting"
              :disabled="isUnassignAssessmentSubmitting"
              @click="confirmUnassignAssessment"
            >
              Remove
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- Add Practice Journal Modal -->
      <UModal v-model:open="isAddJournalOpen" :dismissible="!isAddJournalSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Assign Practice Journal</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isAddJournalSubmitting"
              @click="isAddJournalOpen = false"
            />
          </div>
        </template>
        <template #body>
          <div class="space-y-6">
            <UFormField label="Journal" name="journalId" required block>
              <USelect
                v-model="addJournalSelectedId"
                :items="addJournalDropdownItems"
                placeholder="Select a journal"
                class="w-full"
                :loading="journalsLoading"
                :disabled="journalsLoading || isAddJournalSubmitting"
              />
            </UFormField>

            <UFormField label="Start date" name="startDate" required block>
              <UInput
                v-model="addJournalStartDate"
                type="date"
                :min="minStartDate"
                class="w-full"
                :disabled="isAddJournalSubmitting"
                @update:model-value="addJournalEndDate = ''"
              />
              <template #help>
                <span class="text-xs text-gray-500 dark:text-gray-400">Earliest allowed: {{ minStartDate }} (today + 2 days)</span>
              </template>
            </UFormField>

            <UFormField label="End date" name="endDate" required block>
              <UInput
                v-model="addJournalEndDate"
                type="date"
                :min="minEndDate"
                :disabled="endDateDisabled || isAddJournalSubmitting"
                class="w-full"
              />
              <template #help>
                <span v-if="endDateDisabled" class="text-xs text-gray-500 dark:text-gray-400">Select a start date first.</span>
                <span v-else class="text-xs text-gray-500 dark:text-gray-400">Must be at least 30 days after start date.</span>
              </template>
            </UFormField>

            <div class="flex justify-end gap-2 pt-2">
              <UButton
                variant="outline"
                :disabled="isAddJournalSubmitting"
                @click="isAddJournalOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                :loading="isAddJournalSubmitting"
                :disabled="!isAddJournalFormValid || isAddJournalSubmitting"
                @click="confirmAssignJournal"
              >
                Assign
              </UButton>
            </div>
          </div>
        </template>
      </UModal>

      <!-- Unassign Journal Confirmation Modal -->
      <UModal v-model:open="isUnassignJournalOpen" :dismissible="!isUnassignJournalSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Remove journal from section</h3>
        </template>
        <template #body>
          <p v-if="journalToUnassign">
            Are you sure you want to remove {{ journalToUnassign.title }} from this section?
          </p>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              type="button"
              variant="outline"
              :disabled="isUnassignJournalSubmitting"
              @click="closeUnassignJournalConfirm"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="isUnassignJournalSubmitting"
              :disabled="isUnassignJournalSubmitting"
              @click="confirmUnassignJournal"
            >
              Remove
            </UButton>
          </div>
        </template>
      </UModal>

      <UModal v-model:open="isUnassignStudentOpen" :dismissible="!isUnassignStudentSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Remove student from section</h3>
        </template>
        <template #body>
          <p v-if="studentToUnassign">
            Are you sure you want to remove {{ studentToUnassign.name }} from this section?
          </p>
          <div class="flex justify-end gap-2 mt-6">
            <UButton type="button" variant="outline" :disabled="isUnassignStudentSubmitting"
              @click="closeUnassignStudentConfirm">
              Cancel
            </UButton>
            <UButton color="red" :loading="isUnassignStudentSubmitting" :disabled="isUnassignStudentSubmitting"
              @click="confirmUnassignStudent">
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
                <UButton icon="i-lucide-plus" variant="ghost" color="success" square aria-label="Add student to section"
                  @click="openAddStudentModal" />
              </div>
              <UTable sticky ref="table" :data="studentData" :columns="columns" :loading="status === 'pending'" />
            </UContainer>
            <UContainer class="min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-xl font-semibold">Teachers ({{ teacherData.length }})</span>
                <UButton icon="i-lucide-plus" variant="ghost" color="success" square aria-label="Add teacher to section"
                  @click="openAddTeacherModal" />
              </div>
              <UTable :data="teacherData" ref="table" :columns="teacher_columns" :loading="status === 'pending'" />
            </UContainer>
          </UPageGrid>
        </template>

        <!-- ASSESSMENTS TAB -->
        <template #assessment="{ item }">

          <!-- Assessment Accordion -->
          <UContainer class="mt-5">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold">Assessments</span>
              <UButton
                icon="i-lucide-plus"
                variant="ghost"
                color="success"
                square
                aria-label="Add Assessment"
                @click="openAssignAssessmentModal"
              />
            </div>

            <UAccordion :items="assessmentAccordionItems" multiple>
              <template #class-assessments>

                <UTable v-model:expanded="groupAssessmentsExpanded" :data="groupAssessments || []"
                  :columns="groupAssessmentColumns" :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', }"
                  class="flex-1 mt-4 border-t border-default" :loading="groupAssessmentsStatus === 'pending'">
                  <template #empty-state>
                    <div class="flex flex-col items-center justify-center py-6 gap-3">
                      <span class="italic text-sm">No class-wide assessments assigned to this section.</span>
                    </div>
                  </template>
                  <template #expanded="{ row }">
                    <p class="p-4">{{ row.original.instructions }}</p>
                  </template>
                </UTable>

              </template>

              <template #individual-assessments>


                <UTable v-model:expanded="individualAssessmentsExpanded" :data="individualAssessments || []"
                  :columns="individualAssessmentColumns" :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', }"
                  class="flex-1 mt-4 border-t border-default" :loading="individualAssessmentsStatus === 'pending'">
                  <template #empty-state>
                    <div class="flex flex-col items-center justify-center py-6 gap-3">
                      <span class="italic text-sm">No individual assessments assigned to this section.</span>
                    </div>
                  </template>
                  <template #expanded="{ row }">
                    <p class="p-4">{{ row.original.instructions }}</p>
                  </template>
                </UTable>

              </template>
            </UAccordion>

          </UContainer>

          <!-- End Assessment Accordion -->

          <!-- Submission Accordion -->

          <UContainer class="mt-8">
            <div class="text-lg font-semibold">Class Submissions</div>


            <UAccordion :items="submissionAccordionItems" multiple>
              <template #pending-submissions>
                <UTable :data="pendingSubmissions" :columns="groupSubmissionColumns"
                  class="border-t border-default w-full table-fixed" :loading="groupSubmissionsStatus === 'pending'">
                  <template #empty-state>
                    <div class="flex flex-col items-center justify-center py-6 gap-3">
                      <span class="italic text-sm">No pending group submissions.</span>
                    </div>
                  </template>
                </UTable>
              </template>

              <template #submitted-submissions>


                <div class="text-base font-medium text-gray-500 dark:text-gray-400 mb-2">Submitted ({{
                  submittedSubmissions.length }})</div>
                <UTable :data="submittedSubmissions" :columns="groupSubmissionColumns"
                  class="border-t border-default w-full table-fixed" :loading="groupSubmissionsStatus === 'pending'">
                  <template #empty-state>
                    <div class="flex flex-col items-center justify-center py-6 gap-3">
                      <span class="italic text-sm">No submitted group submissions.</span>
                    </div>
                  </template>
                </UTable>
              </template>
            </UAccordion>
          </UContainer>

          <!-- End Submission Accordion -->

        </template>

        <!-- JOURNALS TAB -->
        <template #journals="{ item }">
          <UContainer class="mt-5">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold">Assigned Practice Journals ({{ journalData.length }})</span>
              <UButton
                icon="i-lucide-plus"
                variant="ghost"
                color="success"
                square
                aria-label="Add practice journal"
                @click="openAddJournalModal"
              />
            </div>

            <UTable v-model:expanded="journalsExpanded" :data="journalData" :columns="journalcolumns"
              :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', }" class="flex-1 mt-4 border-t border-default"
              :loading="journalEntriesStatus === 'pending'">
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
