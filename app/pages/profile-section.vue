<script setup lang="ts">
import type { FormError, FormSubmitEvent } from '@nuxt/ui'
import { h, resolveComponent, computed } from 'vue'
import type { TabsItem } from '@nuxt/ui'
import type { TableColumn } from '@nuxt/ui'

const UBadge = resolveComponent('UBadge')
const UButton = resolveComponent('UButton')
const toast = useToast()
const UCheckbox = resolveComponent('UCheckbox')


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

// Fetch all students to populate the "Add Student" modal **WIP**
const { data: allStudents } = await useAsyncData(
  'all-students',
  () => $fetch(`${API_BASE}/api/admin/student`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    }
  }),
  {
    transform: (response: any): { id: string, label: string }[] => {
      const students = response.data || response.students || response
      if (!Array.isArray(students)) return []
      return students.map((s: any) => ({
        id: s._id,
        label: `${s.firstName} ${s.lastName} (${s.email})` // Add email for uniqueness
      }))
    },
    lazy: true // Can be lazy as it's for a modal
  }
)

// Fetch all teachers to populate the "Add Teacher" modal **WIP**
const { data: allTeachers } = await useAsyncData(
  'all-teachers',
  () => $fetch(`${API_BASE}/api/admin/teacher`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    }
  }),
  {
    transform: (response: any): { id: string, label: string }[] => {
      const teachers = response.data || response.teachers || response
      if (!Array.isArray(teachers)) return []
      return teachers.map((t: any) => ({
        id: t._id,
        label: `${t.firstName} ${t.lastName} (${t.email})` // Add email for uniqueness
      }))
    },
    lazy: true // Can be lazy as it's for a modal
  }
)

// Fetch all assessments to populate the "Add Assessment" modal **WIP**
const { data: allAssessments } = await useAsyncData(
  'all-assessments',
  () => $fetch(`${API_BASE}/api/admin/assessments`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    }
  }),
  {
    transform: (response: any): { id: string, label: string }[] => {
      const assessments = response.data || response.assessments || response
      if (!Array.isArray(assessments)) return []
      return assessments.map((a: any) => ({
        id: a._id,
        label: a.title
      }))
    },
    lazy: true
  }
)

// Fetch all journals to populate the "Add Journal" modal **WIP**
const { data: allJournals } = await useAsyncData( 
  'all-journals',
  () => $fetch(`${API_BASE}/api/admin/journals`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    }
  }),
  {
    transform: (response: any): { id: string, label: string }[] => {
      const journals = response.data || response.journals || response
      if (!Array.isArray(journals)) return []
      return journals.map((j: any) => ({
        id: j._id,
        label: j.title
      }))
    },
    lazy: true
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


// START ASSESSMENT MODAL SCRIPT
const isAddAssessmentModalOpen = ref(false)
const isAddingAssessment = ref(false)
const assessmentTypeToAdd = ref<'GROUP' | 'INDIVIDUAL'>('GROUP')
const addAssessmentState = reactive({
  assessment: undefined as string | undefined,
})

function validateAddAssessment(state: typeof addAssessmentState): FormError[] {
  const errors: FormError[] = []
  if (!state.assessment) {
    errors.push({ name: 'assessment', message: 'Please select an assessment' })
  }
  return errors
}

function openAddAssessmentModal(type: 'GROUP' | 'INDIVIDUAL') {
  assessmentTypeToAdd.value = type
  isAddAssessmentModalOpen.value = true
}

async function onAddAssessmentSubmit() {
  if (!addAssessmentState.assessment) {
    toast.add({ title: 'Validation Error', description: 'Please select an assessment to add.', color: 'warning' })
    return
  }
  if (!sectionId.value) return

  isAddingAssessment.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/assessment-sections`, {
      method: 'POST',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
      body: {
        assessmentId: addAssessmentState.assessment,
        sectionId: sectionId.value,
        assignmentType: assessmentTypeToAdd.value,
      },
    })

    toast.add({ title: 'Success', description: 'Assessment assigned to section.', color: 'success' })
    isAddAssessmentModalOpen.value = false
    addAssessmentState.assessment = undefined // Reset form

    if (assessmentTypeToAdd.value === 'GROUP') {
      await refreshNuxtData(`section-group-assessments-${sectionId.value}`)
    } else {
      await refreshNuxtData(`section-individual-assessments-${sectionId.value}`)
    }
  } catch (error) {
    console.error('Error assigning assessment to section:', error)
    toast.add({ title: 'Error', description: 'Failed to assign assessment to the section.', color: 'error' })
  } finally {
    isAddingAssessment.value = false
  }
}
// END ASSESSMENT MODAL SCRIPT

// START JOURNAL MODAL SCRIPT
const isAddJournalModalOpen = ref(false)
const isAddingJournal = ref(false)
const addJournalState = reactive({
  journal: undefined as string | undefined,
  startDate: '',
  endDate: '',
})

function validateAddJournal(state: typeof addJournalState): FormError[] {
  const errors: FormError[] = []
  if (!state.journal) errors.push({ name: 'journal', message: 'Please select a journal' })
  if (!state.startDate) errors.push({ name: 'startDate', message: 'Start date is required' })
  if (!state.endDate) errors.push({ name: 'endDate', message: 'End date is required' })
  return errors
}

async function onAddJournalSubmit() {
  const validationErrors = validateAddJournal(addJournalState)
  if (validationErrors.length > 0) {
    toast.add({ title: 'Validation Error', description: 'Please fill all required fields.', color: 'warning' })
    return
  }
  if (!sectionId.value) return

  isAddingJournal.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/journal-sections`, {
      method: 'POST',
      headers: { Authorization: `${useAuthToken().value}` },
      body: { journalId: addJournalState.journal, sectionId: sectionId.value, startDate: addJournalState.startDate, endDate: addJournalState.endDate },
    })
    toast.add({ title: 'Success', description: 'Journal assigned to section.', color: 'success' })
    isAddJournalModalOpen.value = false
    Object.assign(addJournalState, { journal: undefined, startDate: '', endDate: '' }) // Reset form
    await refreshNuxtData(`section-journals-${sectionId.value}`)
  } catch (error) {
    console.error('Error assigning journal to section:', error)
    toast.add({ title: 'Error', description: 'Failed to assign journal to the section.', color: 'error' })
  } finally {
    isAddingJournal.value = false
  }
}
// END JOURNAL MODAL SCRIPT

// PEOPLE TAB SCRIPT

const isAddStudentModalOpen = ref(false)
const isAddingStudent = ref(false)
const addStudentState = reactive({
  student: undefined as string | undefined,
})

function validateAddStudent(state: typeof addStudentState): FormError[] {
  const errors: FormError[] = []
  if (!state.student) {
    errors.push({ name: 'student', message: 'Please select a student' })
  }
  return errors
}

const isAddTeacherModalOpen = ref(false)
const isAddingTeacher = ref(false)
const addTeacherState = reactive({
  teacher: undefined as string | undefined,
})

function validateAddTeacher(state: typeof addTeacherState): FormError[] {
  const errors: FormError[] = []
  if (!state.teacher) {
    errors.push({ name: 'teacher', message: 'Please select a teacher' })
  }
  return errors
}

const selectedStudents = ref<any[]>([])

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

// Filter out students who are already in the current section
const availableStudents = computed(() => {
  if (!allStudents.value || !section.value?.students) return []
  const currentStudentIds = new Set(section.value.students.map(s => s._id))
  return allStudents.value.filter(s => !currentStudentIds.has(s.id))
})

// Filter out teachers who are already in the current section
const availableTeachers = computed(() => {
  if (!allTeachers.value || !section.value?.teachers) return []
  const currentTeacherIds = new Set(section.value.teachers.map(t => t._id))
  return allTeachers.value.filter(t => !currentTeacherIds.has(t.id))
})


const UAvatar = resolveComponent('UAvatar')
const NuxtLink = resolveComponent('NuxtLink')


const columns: TableColumn<any>[] = [
  {
    accessorKey: 'name',
    header: ({ table }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Select all'
      }),
      h('span', {}, 'Name')
    ]),
    cell: ({ row }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'aria-label': 'Select row'
      }),
      h(UAvatar, { src: row.original.avatar, alt: row.original.name }),
      h('div', undefined, [
        h(NuxtLink, { to: `/profile-student?id=${row.original.id}`, class: 'font-medium' }, { default: () => row.getValue('name') }),
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

async function onAddStudentSubmit() {
  if (!addStudentState.student) {
    toast.add({ title: 'Validation Error', description: 'Please select a student to add.', color: 'warning' })
    return
  }
  if (!sectionId.value) return

  isAddingStudent.value = true
  try {
    // The API likely expects the full array of student IDs for the section.
    const currentStudentIds = section.value?.students.map(s => s._id) || []
    const updatedStudentIds = [...currentStudentIds, addStudentState.student]

    await $fetch(`${API_BASE}/api/admin/sections/${sectionId.value}`, {
      method: 'PATCH',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
      body: {
        students: updatedStudentIds,
      },
    })

    toast.add({ title: 'Success', description: 'Student added to section.', color: 'success' })
    isAddStudentModalOpen.value = false
    addStudentState.student = undefined // Reset form
    await refreshNuxtData(`section-${sectionId.value}`) // Refresh section data
  } catch (error) {
    console.error('Error adding student to section:', error)
    toast.add({ title: 'Error', description: 'Failed to add student to the section.', color: 'error' })
  } finally {
    isAddingStudent.value = false
  }
}

async function onAddTeacherSubmit() {
  if (!addTeacherState.teacher) {
    toast.add({ title: 'Validation Error', description: 'Please select a teacher to add.', color: 'warning' })
    return
  }
  if (!sectionId.value) return

  isAddingTeacher.value = true
  try {
    const currentTeacherIds = section.value?.teachers.map(t => t._id) || []
    const updatedTeacherIds = [...currentTeacherIds, addTeacherState.teacher]

    await $fetch(`${API_BASE}/api/admin/sections/${sectionId.value}`, {
      method: 'PATCH',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
      body: {
        teachers: updatedTeacherIds,
      },
    })

    toast.add({ title: 'Success', description: 'Teacher added to section.', color: 'success' })
    isAddTeacherModalOpen.value = false
    addTeacherState.teacher = undefined // Reset form
    await refreshNuxtData(`section-${sectionId.value}`) // Refresh section data
  } catch (error) {
    console.error('Error adding teacher to section:', error)
    toast.add({ title: 'Error', description: 'Failed to add teacher to the section.', color: 'error' })
  } finally {
    isAddingTeacher.value = false
  }
}

function handleDeleteSelectedStudents() {
  if (selectedStudents.value.length === 0)
    return

  const studentNames = selectedStudents.value.map(s => s.name).join(', ')
  toast.add({
    title: 'Delete Students',
    description: `Delete action triggered for: ${studentNames}`,
    color: 'error',
  })
  // TODO: Implement bulk student deletion from section logic
}

function handleDeleteSelectedAssessments(type: 'GROUP' | 'INDIVIDUAL') {
  const selection = type === 'GROUP' ? selectedGroupAssessments.value : selectedIndividualAssessments.value
  if (selection.length === 0) return

  const assessmentTitles = selection.map(a => a.title).join(', ')
  toast.add({
    title: `Delete ${type.toLowerCase()} assessments`,
    description: `Delete action triggered for: ${assessmentTitles}`,
    color: 'error',
  })
  // TODO: Implement bulk assessment deletion from section logic
}

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
const selectedGroupAssessments = ref<any[]>([])
const selectedIndividualAssessments = ref<any[]>([])

const assessmentcolumns: TableColumn<Assessment>[] = [
  {
    accessorKey: 'title',
    header: ({ table }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Select all'
      }),
      h('span', {}, 'Class Assessments')
    ]),
    cell: ({ row }) => h('div', { class: 'flex items-center justify-between w-full' }, [
      h('div', { class: 'flex items-center gap-3' }, [
        h(UCheckbox, {
          modelValue: row.getIsSelected(),
          'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
          'aria-label': 'Select row'
        }),
        h(NuxtLink, { to: `/details-assessment?id=${row.original._id}`, class: 'font-medium hover:underline' }, { default: () => row.getValue('title') })
      ]),
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
      ])
    ])
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
const selectedJournals = ref<any[]>([])

// Data for journals will be fetched based on the section.
const journalData = computed<Journal[]>(() => {
  if (!journalEntries.value) return []
  return journalEntries.value
})

const journalcolumns: TableColumn<Journal>[] = [
  {
    accessorKey: 'title',
    header: ({ table }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UCheckbox, {
        modelValue: table.getIsSomePageRowsSelected() ? 'indeterminate' : table.getIsAllPageRowsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => table.toggleAllPageRowsSelected(!!value),
        'aria-label': 'Select all'
      }),
      h('span', {}, 'Title')
    ]),
    cell: ({ row }) => h('div', { class: 'flex items-center gap-3' }, [
      h(UCheckbox, {
        modelValue: row.getIsSelected(),
        'onUpdate:modelValue': (value: boolean | 'indeterminate') => row.toggleSelected(!!value),
        'aria-label': 'Select row'
      }),
      h(NuxtLink, { to: `/details-journal?id=${row.original._id}`, class: 'font-medium hover:underline' }, { default: () => row.getValue('title') })
    ])
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

      const scheduleText = `${formatDate(startDateValue)} - ${formatDate(endDateValue)}`

      return h('div', { class: 'flex items-center justify-between w-full' }, [
        h('span', {}, scheduleText),
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
    }
  }
]

function handleDeleteSelectedJournals() {
  if (selectedJournals.value.length === 0)
    return
  const journalTitles = selectedJournals.value.map(j => j.title).join(', ')
  toast.add({ title: 'Delete Journals', description: `Delete action triggered for: ${journalTitles}`, color: 'error' })
}

// END JOURNALS TAB SCRIPT
</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="h-40 flex items-center justify-center">
      <p>Loading section...</p>
    </UPageCard>
    <UPageCard v-else-if="section" class="h-40 flex flex-col">
      <div class="flex items-end w-full mt-auto">
        <UPageHeader :title="section.name" style="border-bottom: 0; padding-bottom: 0;" class="mr-2"/>
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
                <div class="flex items-center gap-2"> <UButton color="success" variant="subtle" label="Add Student" @click="isAddStudentModalOpen = true" />
                  <UButton icon="i-lucide-trash-2" color="error" variant="subtle" square
                    :disabled="selectedStudents.length === 0" @click="handleDeleteSelectedStudents" />
                </div>
              </div>
              <UTable sticky ref="table" :data="studentData" :columns="columns" :loading="status === 'pending'" />
            </UContainer>
            <UContainer class="min-w-0">
              <div class="flex items-center justify-between">
                <span class="text-xl font-semibold">Teachers ({{ teacherData.length }})</span>
                <div class="flex items-center gap-2"> <UButton color="success" variant="subtle" label="Add Teacher" @click="isAddTeacherModalOpen = true" />
                  <UButton icon="i-lucide-trash-2" color="error" variant="subtle" square disabled />
                </div>
              </div>
              <UTable :data="teacherData" ref="table" :columns="teacher_columns" :loading="status === 'pending'" />
            </UContainer>
          </UPageGrid>
        </template>

        <!-- ASSESSMENTS TAB -->


        <template #assessment="{ item }">
          <UContainer class="mt-5">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold">Assessments</span>
                              <div class="flex justify-end gap-2 mb-2">
                  <UButton color="success" variant="subtle" label="Add Assessment" @click="openAddAssessmentModal('GROUP')" />
                  <UButton icon="i-lucide-trash-2" color="error" variant="subtle" square :disabled="selectedGroupAssessments.length === 0" @click="handleDeleteSelectedAssessments('GROUP')" />
                </div>
            </div>
            <UAccordion :items="assessmentAccordionItems" multiple>
              <template #class-assessments>
                <UTable v-model:expanded="groupAssessmentsExpanded" :data="groupAssessments || []"
                  :columns="assessmentcolumns" :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }"
                  class="flex-1 border-t border-default" :loading="groupAssessmentsStatus === 'pending'">
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
                  :columns="assessmentcolumns" :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }"
                  class="flex-1  border-t border-default" :loading="individualAssessmentsStatus === 'pending'">
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

            <div class="flex items-center justify-between mt-5">
              <span class="text-lg font-semibold">Assessment Submissions</span>

            </div>
            <UAccordion :items="submissionAccordionItems" multiple>
              <template #pending-submissions>
                <UTable :data="pendingSubmissions" :columns="groupSubmissionColumns" class="w-full table-fixed"
                  :loading="groupSubmissionsStatus === 'pending'">
                  <template #empty-state>
                    <div class="flex flex-col items-center justify-center py-6 gap-3">
                      <span class="italic text-sm">No pending group submissions.</span>
                    </div>
                  </template>
                </UTable>
              </template>

              <template #submitted-submissions>
                <UTable :data="submittedSubmissions" :columns="groupSubmissionColumns" class="w-full table-fixed"
                  :loading="groupSubmissionsStatus === 'pending'">
                  <template #empty-state>
                    <div class="flex flex-col items-center justify-center py-6 gap-3">
                      <span class="italic text-sm">No submitted group submissions.</span>
                    </div>
                  </template>
                </UTable>
              </template>
            </UAccordion>
          </UContainer>
        </template>

        <!-- JOURNALS TAB -->
        <template #journals="{ item }">
          <UContainer class="mt-5">
            <div class="flex items-center justify-between">
              <span class="text-lg font-semibold">Assigned Practice Journals</span>
              <div class="flex items-center gap-2">
                <UButton color="success" variant="subtle" label="Add Practice Journal" @click="isAddJournalModalOpen = true" />
                <UButton icon="i-lucide-trash-2" color="error" variant="subtle" square :disabled="selectedJournals.length === 0" @click="handleDeleteSelectedJournals" />
              </div>
            </div>

            <UTable v-model:expanded="journalsExpanded" :data="journalData"
              :columns="journalcolumns" :ui="{ tr: 'data-[expanded=true]:bg-elevated/50' }"
              class="flex-1 mt-4 border-t border-default" :loading="journalEntriesStatus === 'pending'">
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

    <!-- Add Student Modal -->
    <UModal v-model:open="isAddStudentModalOpen" :dismissible="!isAddingStudent">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-lg font-semibold">Add Student</h3>
          <UButton icon="i-lucide-x" variant="ghost" :disabled="isAddingStudent" @click="isAddStudentModalOpen = false" />
        </div>
      </template>
      <template #body>
        <UForm :validate="validateAddStudent" :state="addStudentState" class="space-y-4" @submit="onAddStudentSubmit">
          <UFormField label="Student Name" name="student" required block>
            <USelectMenu
              v-model="addStudentState.student"
              :options="availableStudents"
              placeholder="Select a student to add"
              searchable
              value-attribute="id"
              option-attribute="label"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton type="button" variant="outline" :disabled="isAddingStudent" @click="isAddStudentModalOpen = false">
              Cancel
            </UButton>
            <UButton type="submit" :loading="isAddingStudent" :disabled="isAddingStudent">
              Add Student
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Add Teacher Modal -->
    <UModal v-model:open="isAddTeacherModalOpen" :dismissible="!isAddingTeacher">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-lg font-semibold">Add Teacher</h3>
          <UButton icon="i-lucide-x" variant="ghost" :disabled="isAddingTeacher" @click="isAddTeacherModalOpen = false" />
        </div>
      </template>
      <template #body>
        <UForm :validate="validateAddTeacher" :state="addTeacherState" class="space-y-4" @submit="onAddTeacherSubmit">
          <UFormField label="Teacher Name" name="teacher" required block>
            <USelectMenu
              v-model="addTeacherState.teacher"
              :options="availableTeachers"
              placeholder="Select a teacher to add"
              searchable
              value-attribute="id"
              option-attribute="label"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton type="button" variant="outline" :disabled="isAddingTeacher" @click="isAddTeacherModalOpen = false">
              Cancel
            </UButton>
            <UButton type="submit" :loading="isAddingTeacher" :disabled="isAddingTeacher">
              Add Teacher
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Add Assessment Modal -->
    <UModal v-model:open="isAddAssessmentModalOpen" :dismissible="!isAddingAssessment">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-lg font-semibold">Add Assessment to Section</h3>
          <UButton icon="i-lucide-x" variant="ghost" :disabled="isAddingAssessment" @click="isAddAssessmentModalOpen = false" />
        </div>
      </template>
      <template #body>
        <UForm :validate="validateAddAssessment" :state="addAssessmentState" class="space-y-4" @submit="onAddAssessmentSubmit">
          <UFormField label="Assessment" name="assessment" required block>
            <USelectMenu
              v-model="addAssessmentState.assessment"
              :options="allAssessments"
              placeholder="Select an assessment"
              searchable
              value-attribute="id"
              option-attribute="label"
              class="w-full"
            />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton type="button" variant="outline" :disabled="isAddingAssessment" @click="isAddAssessmentModalOpen = false">
              Cancel
            </UButton>
            <UButton type="submit" :loading="isAddingAssessment" :disabled="isAddingAssessment">
              Add Assessment
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>

    <!-- Add Journal Modal -->
    <UModal v-model:open="isAddJournalModalOpen" :dismissible="!isAddingJournal">
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-lg font-semibold">Add Journal to Section</h3>
          <UButton icon="i-lucide-x" variant="ghost" :disabled="isAddingJournal" @click="isAddJournalModalOpen = false" />
        </div>
      </template>
      <template #body>
        <UForm :validate="validateAddJournal" :state="addJournalState" class="space-y-4" @submit="onAddJournalSubmit">
          <UFormField label="Journal" name="journal" required block>
            <USelectMenu v-model="addJournalState.journal" :options="allJournals" placeholder="Select a journal" searchable value-attribute="id" option-attribute="label" class="w-full" />
          </UFormField>
          <UFormField label="Start Date" name="startDate" required>
            <UInput v-model="addJournalState.startDate" type="date" />
          </UFormField>
          <UFormField label="End Date" name="endDate" required>
            <UInput v-model="addJournalState.endDate" type="date" />
          </UFormField>
          <div class="flex justify-end gap-2">
            <UButton type="button" variant="outline" :disabled="isAddingJournal" @click="isAddJournalModalOpen = false">
              Cancel
            </UButton>
            <UButton type="submit" :loading="isAddingJournal" :disabled="isAddingJournal">
              Add Journal
            </UButton>
          </div>
        </UForm>
      </template>
    </UModal>
  </UContainer>
</template>
