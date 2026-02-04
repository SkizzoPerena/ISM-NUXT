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
  assignmentId?: string // id of assessment-student record for DELETE
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

const guardianToUnassign = ref<GuardianInfo | null>(null)
const isUnassignGuardianOpen = ref(false)
const isUnassignGuardianSubmitting = ref(false)

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
const { data: student, status, refresh: refreshStudent } = await useAsyncData<StudentDetail>(
  `student-${studentId.value}`,
  () => $fetch(`${API_BASE}/api/admin/student/${studentId.value}`, {
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

// Fetch all sections (same endpoint as sections.vue) for Assign Section dropdown
type SectionOption = { _id: string; name: string }
const { data: allSections } = await useAsyncData<SectionOption[]>(
  'all-sections',
  () => $fetch(`${API_BASE}/api/admin/sections`, {
    headers: { Authorization: `${useAuthToken().value}` }
  }),
  {
    transform: (response: any) => {
      const sectionData = response?.data ?? response?.sections ?? response
      const rows = Array.isArray(sectionData) ? sectionData : []
      return rows.map((s: any) => ({ _id: s._id, name: s.name }))
    }
  }
)

// Assign Section: only when student has no assigned sections
const isAssignSectionOpen = ref(false)
const assignSectionSelectedId = ref<string | undefined>(undefined)
const isAssignSectionSubmitting = ref(false)
const toast = useToast()

function openAssignSectionModal() {
  isAssignSectionOpen.value = true
  assignSectionSelectedId.value = undefined
}

async function confirmAssignSection() {
  if (!studentId.value || !assignSectionSelectedId.value || isAssignSectionSubmitting.value) return
  isAssignSectionSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/sections/${assignSectionSelectedId.value}/assign-student/${studentId.value}`, {
      method: 'POST',
      headers: { Authorization: `${useAuthToken().value}` }
    })
    toast.add({ title: 'Success', description: 'Section assigned to student.', color: 'success' })
    isAssignSectionOpen.value = false
    assignSectionSelectedId.value = undefined
    await refreshStudent()
  } catch (error) {
    console.error('Error assigning section to student', error)
    toast.add({ title: 'Error', description: 'Failed to assign section.', color: 'error' })
  } finally {
    isAssignSectionSubmitting.value = false
  }
}

const assignSectionDropdownItems = computed(() =>
  (allSections.value ?? []).map((s) => ({ label: s.name, value: s._id }))
)

// Assign Instrument
const isAssignInstrumentOpen = ref(false)
type AvailableInstrumentOption = { _id: string; instrumentName: string }
const availableInstruments = ref<AvailableInstrumentOption[]>([])
const availableInstrumentsLoading = ref(false)
const assignInstrumentSelectedId = ref<string | undefined>(undefined)
const assignInstrumentProficiency = ref<string | undefined>(undefined)
const isAssignInstrumentSubmitting = ref(false)

const proficiencyOptions = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']

function openAssignInstrumentModal() {
  isAssignInstrumentOpen.value = true
  assignInstrumentSelectedId.value = undefined
  assignInstrumentProficiency.value = undefined
  availableInstrumentsLoading.value = true
  $fetch(`${API_BASE}/api/admin/instruments`, {
    headers: { Authorization: `${useAuthToken().value}` }
  })
    .then((response: any) => {
      const list = response?.data ?? response?.instruments ?? response
      const rows = Array.isArray(list) ? list : []
      availableInstruments.value = rows.map((i: any) => ({
        _id: i._id,
        instrumentName: i.instrumentName ?? i.name ?? ''
      }))
      availableInstrumentsLoading.value = false
    })
    .catch((error) => {
      console.error('Error loading instruments', error)
      availableInstrumentsLoading.value = false
      toast.add({ title: 'Error', description: 'Failed to load instruments.', color: 'error' })
    })
}

const assignInstrumentDropdownItems = computed(() =>
  availableInstruments.value.map((i) => ({ label: i.instrumentName, value: i._id }))
)

async function confirmAssignInstrument() {
  console.error('[Assign instrument] confirmAssignInstrument called')
  const sid = studentId.value
  const iid = assignInstrumentSelectedId.value
  const prof = assignInstrumentProficiency.value
  if (!sid || !iid || !prof || isAssignInstrumentSubmitting.value) return
  isAssignInstrumentSubmitting.value = true
  try {
    const body = { student: sid, instrument: iid, proficiency: prof }
    console.error('[Assign instrument] payload', body)
    await $fetch(`${API_BASE}/api/admin/student-instrument`, {
      method: 'POST',
      headers: { Authorization: `${useAuthToken().value}` },
      body,
    })
    toast.add({ title: 'Success', description: 'Instrument assigned to student.', color: 'success' })
    isAssignInstrumentOpen.value = false
    assignInstrumentSelectedId.value = undefined
    assignInstrumentProficiency.value = undefined
    await refreshInstruments()
  } catch (error: any) {
    console.error('[Assign instrument] error', error?.data ?? error?.message ?? error)
    toast.add({ title: 'Error', description: 'Failed to assign instrument.', color: 'error' })
  } finally {
    isAssignInstrumentSubmitting.value = false
  }
}

// Unassign instrument from student
const instrumentToUnassign = ref<InstrumentInfo | null>(null)
const isUnassignInstrumentOpen = ref(false)
const isUnassignInstrumentSubmitting = ref(false)

function openUnassignInstrumentConfirm(instrument: InstrumentInfo) {
  instrumentToUnassign.value = instrument
  isUnassignInstrumentOpen.value = true
}

function closeUnassignInstrumentConfirm() {
  if (!isUnassignInstrumentSubmitting.value) {
    isUnassignInstrumentOpen.value = false
    instrumentToUnassign.value = null
  }
}

async function confirmUnassignInstrument() {
  if (!instrumentToUnassign.value || isUnassignInstrumentSubmitting.value) return
  isUnassignInstrumentSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/student-instrument/${instrumentToUnassign.value._id}`, {
      method: 'DELETE',
      headers: { Authorization: `${useAuthToken().value}` },
    })
    isUnassignInstrumentOpen.value = false
    instrumentToUnassign.value = null
    toast.add({ title: 'Success', description: 'Instrument removed from student.', color: 'success' })
    await refreshInstruments()
  } catch (error: any) {
    console.error('[Unassign instrument] error', error?.data ?? error?.message ?? error)
    toast.add({ title: 'Error', description: 'Failed to remove instrument.', color: 'error' })
  } finally {
    isUnassignInstrumentSubmitting.value = false
  }
}

// Assign Special Assessment
const isAssignAssessmentOpen = ref(false)
const allAssessments = ref<{ _id: string; title: string }[]>([])
const allAssessmentsLoading = ref(false)
const assignAssessmentSelectedId = ref<string | undefined>(undefined)
const isAssignAssessmentSubmitting = ref(false)

function openAssignAssessmentModal() {
  isAssignAssessmentOpen.value = true
  assignAssessmentSelectedId.value = undefined
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

async function confirmAssignAssessment() {
  if (!studentId.value || !assignAssessmentSelectedId.value || isAssignAssessmentSubmitting.value) return
  isAssignAssessmentSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/assessment-students`, {
      method: 'POST',
      headers: { Authorization: `${useAuthToken().value}` },
      body: { studentId: studentId.value, assessmentId: assignAssessmentSelectedId.value },
    })
    toast.add({ title: 'Success', description: 'Assessment assigned to student.', color: 'success' })
    isAssignAssessmentOpen.value = false
    assignAssessmentSelectedId.value = undefined
    await refreshStudentAssessments()
    await refreshSpecialSubmissions()
  } catch (error: any) {
    toast.add({ title: 'Error', description: 'Failed to assign assessment.', color: 'error' })
  } finally {
    isAssignAssessmentSubmitting.value = false
  }
}

// Unassign Special Assessment
const assessmentToUnassign = ref<Assessment | null>(null)
const isUnassignAssessmentOpen = ref(false)
const isUnassignAssessmentSubmitting = ref(false)

function openUnassignAssessmentConfirm(assessment: Assessment) {
  assessmentToUnassign.value = assessment
  isUnassignAssessmentOpen.value = true
}

function closeUnassignAssessmentConfirm() {
  if (!isUnassignAssessmentSubmitting.value) {
    isUnassignAssessmentOpen.value = false
    assessmentToUnassign.value = null
  }
}

async function confirmUnassignAssessment() {
  const assignmentId = assessmentToUnassign.value?.assignmentId ?? assessmentToUnassign.value?._id
  if (!assignmentId || isUnassignAssessmentSubmitting.value) return
  isUnassignAssessmentSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/assessment-students/${assignmentId}`, {
      method: 'DELETE',
      headers: { Authorization: `${useAuthToken().value}` },
    })
    isUnassignAssessmentOpen.value = false
    assessmentToUnassign.value = null
    toast.add({ title: 'Success', description: 'Assessment removed from student.', color: 'success' })
    await refreshStudentAssessments()
    await refreshSpecialSubmissions()
  } catch (error: any) {
    toast.add({ title: 'Error', description: 'Failed to remove assessment.', color: 'error' })
  } finally {
    isUnassignAssessmentSubmitting.value = false
  }
}

// Assign Guardian
const isAssignGuardianOpen = ref(false)

type AvailableGuardianOption = {
  _id: string
  firstName: string
  lastName: string
  profileImageURL?: string
}

const availableGuardians = ref<AvailableGuardianOption[]>([])
const availableGuardiansLoading = ref(false)
const assignGuardianSelectedId = ref<string | undefined>(undefined)
const isAssignGuardianSubmitting = ref(false)

function openAssignGuardianModal() {
  isAssignGuardianOpen.value = true
  assignGuardianSelectedId.value = undefined
  availableGuardiansLoading.value = true
  $fetch(`${API_BASE}/api/admin/guardian`, {
    headers: { Authorization: `${useAuthToken().value}` }
  })
    .then((response: any) => {
      const list = response?.data ?? response?.guardians ?? response
      const rows = Array.isArray(list) ? list : []
      availableGuardians.value = rows.map((g: any) => ({
        _id: g._id,
        firstName: g.firstName,
        lastName: g.lastName,
        profileImageURL: g.profileImageURL
      }))
      availableGuardiansLoading.value = false
    })
    .catch((error) => {
      console.error('Error loading available guardians', error)
      availableGuardiansLoading.value = false
      toast.add({ title: 'Error', description: 'Failed to load available guardians.', color: 'error' })
    })
}

const assignGuardianDropdownItems = computed(() =>
  availableGuardians.value.map((g) => ({ label: `${g.firstName} ${g.lastName}`, value: g._id }))
)

async function confirmAssignGuardian() {
  if (!studentId.value || !assignGuardianSelectedId.value || isAssignGuardianSubmitting.value) return
  isAssignGuardianSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/student-guardian/assign`, {
      method: 'POST',
      headers: { Authorization: `${useAuthToken().value}` },
      body: {
        studentId: studentId.value,
        guardianId: assignGuardianSelectedId.value
      }
    })
    toast.add({ title: 'Success', description: 'Guardian assigned to student.', color: 'success' })
    isAssignGuardianOpen.value = false
    assignGuardianSelectedId.value = undefined
    await refreshGuardians()
  } catch (error) {
    console.error('Error assigning guardian', error)
    toast.add({ title: 'Error', description: 'Failed to assign guardian.', color: 'error' })
  } finally {
    isAssignGuardianSubmitting.value = false
  }
}

// Unassign section from student
const isUnassignSectionOpen = ref(false)
const sectionToUnassign = ref<SectionInfo | null>(null)
const isUnassignSectionSubmitting = ref(false)

function openUnassignSectionConfirm(section: SectionInfo) {
  sectionToUnassign.value = section
  isUnassignSectionOpen.value = true
}

function closeUnassignSectionConfirm() {
  if (!isUnassignSectionSubmitting.value) {
    isUnassignSectionOpen.value = false
    sectionToUnassign.value = null
  }
}

async function confirmUnassignSection() {
  if (!studentId.value || !sectionToUnassign.value || isUnassignSectionSubmitting.value) return
  isUnassignSectionSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/sections/${sectionToUnassign.value._id}/unassign-student/${studentId.value}`, {
      method: 'PATCH',
      headers: { Authorization: `${useAuthToken().value}` }
    })
    toast.add({ title: 'Success', description: 'Section removed from student.', color: 'success' })
    isUnassignSectionOpen.value = false
    sectionToUnassign.value = null
    await refreshStudent()
  } catch (error) {
    console.error('Error unassigning section', error)
    toast.add({ title: 'Error', description: 'Failed to remove section.', color: 'error' })
  } finally {
    isUnassignSectionSubmitting.value = false
  }
}

// Fetch assigned guardians for the student
const { data: guardians, status: guardiansStatus, refresh: refreshGuardians } = await useAsyncData<GuardianInfo[]>(
  `student-guardians-${studentId.value}`,
  () => $fetch(`${API_BASE}/api/admin/student-guardian/${studentId.value}/guardians`, {
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

function openUnassignGuardianConfirm(guardian: GuardianInfo) {
  guardianToUnassign.value = guardian
  isUnassignGuardianOpen.value = true
}

function closeUnassignGuardianConfirm() {
  if (!isUnassignGuardianSubmitting.value) {
    isUnassignGuardianOpen.value = false
    guardianToUnassign.value = null
  }
}

async function confirmUnassignGuardian() {
  if (!studentId.value || !guardianToUnassign.value || isUnassignGuardianSubmitting.value) return
  isUnassignGuardianSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/student-guardian/unassign`, {
      method: 'DELETE',
      headers: { Authorization: `${useAuthToken().value}` },
      body: {
        studentId: studentId.value,
        guardianId: guardianToUnassign.value._id,
      },
    })
    toast.add({ title: 'Success', description: 'Guardian removed from student.', color: 'success' })
    isUnassignGuardianOpen.value = false
    guardianToUnassign.value = null
    await refreshGuardians()
  } catch (error) {
    console.error('Error unassigning guardian', error)
    toast.add({ title: 'Error', description: 'Failed to remove guardian.', color: 'error' })
  } finally {
    isUnassignGuardianSubmitting.value = false
  }
}

// Fetch assigned instruments for the student
const { data: instruments, status: instrumentsStatus, refresh: refreshInstruments } = await useAsyncData<InstrumentInfo[]>(
  `student-instruments-${studentId.value}`,
  () => $fetch(`${API_BASE}/api/admin/student-instrument/${studentId.value}`, {
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
const { data: studentAssessments, status: studentAssessmentsStatus, refresh: refreshStudentAssessments } = await useAsyncData<Assessment[]>(
  `student-assessments-${studentId.value}`,
  () => $fetch(`${API_BASE}/api/admin/assessment-students/${studentId.value}`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Student Assessments API Response:', response._data)
    }
  }),
  {
    transform: (response: any): Assessment[] => {
      const assignments = response.assignments || response.data || response;
      if (!Array.isArray(assignments)) {
        console.error('Expected an array of student assessments, but received:', assignments);
        return [];
      }
      const result: Assessment[] = [];
      for (const assignment of assignments) {
        const assessment = assignment.assessmentId;
        if (!assessment || !assessment._id) {
          console.warn('Assessment assignment is missing assessmentId or its _id:', assignment);
          continue;
        }
        result.push({
          _id: assessment._id,
          assignmentId: assignment._id,
          title: assessment.title,
          createdAt: assignment.createdAt,
          instructions: assessment.instructions,
        });
      }
      return result;
    },
    watch: [studentId]
  }
);

// Fetch special submissions for the student
const { data: specialSubmissionsRaw, status: specialSubmissionsStatus, refresh: refreshSpecialSubmissions } = await useAsyncData<SpecialSubmission[]>(
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
    cell: ({ row }) => h(NuxtLink, { to: `/details-assessment?id=${row.original._id}`, class: 'text-primary font-medium hover:underline' }, { default: () => row.getValue('title') })
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
  {
    id: 'unassign',
    header: '',
    cell: ({ row }) =>
      row.original.assignmentId
        ? h(UButton, {
            icon: 'i-lucide-trash-2',
            color: 'error' as const,
            variant: 'ghost',
            square: true,
            'aria-label': 'Remove assessment from student',
            onClick: () => openUnassignAssessmentConfirm(row.original)
          })
        : null
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
                  icon="i-lucide-trash-2"
                  color="error"
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
                    <div v-for="section in student.assignedSections" :key="section._id" class="flex items-center gap-2 w-full">
                      <NuxtLink :to="`/profile-section?id=${section._id}`" class="text-primary font-medium hover:underline">
                        {{ section.name }}
                      </NuxtLink>
                      <UButton
                        icon="i-lucide-trash-2"
                        variant="ghost"
                        color="error"
                        aria-label="Remove section from student"
                        class="ml-auto shrink-0"
                        @click="openUnassignSectionConfirm(section)"
                      />
                    </div>
                  </div>
                </UContainer>
                <UContainer v-else-if="status === 'success'">
                  <h3 class="text-lg font-semibold">Assigned Sections</h3>
                  <p class="mt-4">No sections assigned to this student.</p>
                  <UButton
                    label="Assign Section"
                    icon="i-lucide-folder-plus"
                    class="mt-4"
                    @click="openAssignSectionModal"
                  />
                </UContainer>
              </div>

              <div>
                <UContainer v-if="instruments && instruments.length > 0">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">Assigned Instruments</h3>
                    <UButton
                      icon="i-lucide-plus"
                      variant="ghost"
                      color="success"
                      square
                      aria-label="Assign instrument"
                      @click="openAssignInstrumentModal"
                    />
                  </div>

                  <div class="space-y-2 mt-4">
                    <div v-for="instrument in instruments" :key="instrument._id" class="flex items-center gap-2">
                      <span class="text-gray-900 dark:text-white">
                        {{ instrument.instrumentName }}
                        <UBadge v-if="instrument.proficiency" :color="getProficiencyColor(instrument.proficiency)" variant="subtle" class="ml-2">{{ instrument.proficiency }}</UBadge>
                      </span>
                      <UButton
                        icon="i-lucide-trash-2"
                        color="error"
                        variant="ghost"
                        square
                        aria-label="Remove instrument from student"
                        class="ml-auto shrink-0"
                        @click="openUnassignInstrumentConfirm(instrument)"
                      />
                    </div>
                  </div>
                </UContainer>
                <UContainer v-else-if="instrumentsStatus === 'success'">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">Assigned Instruments</h3>
                    <UButton
                      icon="i-lucide-plus"
                      variant="ghost"
                      color="success"
                      square
                      aria-label="Assign instrument"
                      @click="openAssignInstrumentModal"
                    />
                  </div>
                  <p class="mt-4">No instruments assigned to this student.</p>
                </UContainer>
              </div>

              <div>
                <UContainer v-if="guardians && guardians.length > 0">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">Assigned Guardians</h3>
                    <UButton
                      icon="i-lucide-plus"
                      variant="ghost"
                      color="success"
                      square
                      aria-label="Assign guardian"
                      @click="openAssignGuardianModal"
                    />
                  </div>

                  <div class="space-y-4 mt-4">
                    <div v-for="guardian in guardians" :key="guardian._id" class="flex items-center gap-4">
                      <UAvatar :src="guardian.profileImageURL" :alt="`${guardian.firstName} ${guardian.lastName}`" />
                      <div>
                        <NuxtLink :to="`/profile-guardian?id=${guardian._id}`" class="text-primary font-medium hover:underline">
                          {{ guardian.firstName }} {{ guardian.lastName }}
                        </NuxtLink>
                      </div>
                      <UButton
                        icon="i-lucide-trash-2"
                        variant="ghost"
                        color="error"
                        aria-label="Remove guardian from student"
                        class="ml-auto shrink-0"
                        @click="openUnassignGuardianConfirm(guardian)"
                      />
                    </div>
                  </div>
                </UContainer>
                <UContainer v-else-if="guardiansStatus === 'success'">
                  <div class="flex items-center justify-between">
                    <h3 class="text-lg font-semibold">Assigned Guardians</h3>
                    <UButton
                      icon="i-lucide-plus"
                      variant="ghost"
                      color="success"
                      square
                      aria-label="Assign guardian"
                      @click="openAssignGuardianModal"
                    />
                  </div>
                  <p class="mt-4">No guardians assigned to this student.</p>
                </UContainer>
              </div>
            </UPageGrid>
          </template>

          <!-- ASSESSMENTS TAB -->
          <template #assessments="{ item }">
            <UContainer class="mt-5">
              <div class="flex items-center justify-between">
                <div class="text-lg font-semibold">Assigned Special Assessments</div>
                <UButton
                  icon="i-lucide-plus"
                  variant="ghost"
                  color="success"
                  square
                  aria-label="Assign assessment"
                  @click="openAssignAssessmentModal"
                />
              </div>

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
              color="error"
              :loading="isDeleteSubmitting"
              :disabled="isDeleteSubmitting"
              @click="onDeleteStudent"
            >
              Delete
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- Assign Section Modal -->
      <UModal v-model:open="isAssignSectionOpen" :dismissible="!isAssignSectionSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Assign Section</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isAssignSectionSubmitting"
              @click="isAssignSectionOpen = false"
            />
          </div>
        </template>
        <template #body>
          <form class="space-y-4" @submit.prevent="confirmAssignSection">
            <UFormField label="Section" name="sectionId" required block>
              <USelect
                v-model="assignSectionSelectedId"
                :items="assignSectionDropdownItems"
                placeholder="Select a section"
                class="w-full"
              />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton
                type="button"
                variant="outline"
                :disabled="isAssignSectionSubmitting"
                @click="isAssignSectionOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                :loading="isAssignSectionSubmitting"
                :disabled="!assignSectionSelectedId || isAssignSectionSubmitting"
              >
                Assign Section
              </UButton>
            </div>
          </form>
        </template>
      </UModal>

      <!-- Unassign Section Confirmation Modal -->
      <UModal v-model:open="isUnassignSectionOpen" :dismissible="!isUnassignSectionSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Remove section from student</h3>
        </template>
        <template #body>
          <p v-if="sectionToUnassign">
            Are you sure you want to remove {{ sectionToUnassign.name }} from this student?
          </p>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              type="button"
              variant="outline"
              :disabled="isUnassignSectionSubmitting"
              @click="closeUnassignSectionConfirm"
            >
              Cancel
            </UButton>
            <UButton
              :loading="isUnassignSectionSubmitting"
              :disabled="isUnassignSectionSubmitting"
              @click="confirmUnassignSection"
            >
              Remove
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- Assign Instrument Modal -->
      <UModal v-model:open="isAssignInstrumentOpen" :dismissible="!isAssignInstrumentSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Assign Instrument</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isAssignInstrumentSubmitting"
              @click="isAssignInstrumentOpen = false"
            />
          </div>
        </template>
        <template #body>
          <form class="space-y-4" @submit.prevent="confirmAssignInstrument">
            <UFormField label="Instrument" name="instrumentId" required block>
              <USelect
                v-model="assignInstrumentSelectedId"
                :items="assignInstrumentDropdownItems"
                placeholder="Select an instrument"
                class="w-full"
                :loading="availableInstrumentsLoading"
                :disabled="availableInstrumentsLoading"
              />
            </UFormField>
            <UFormField label="Proficiency" name="proficiency" required block>
              <USelect
                v-model="assignInstrumentProficiency"
                :items="proficiencyOptions.map((p) => ({ label: p, value: p }))"
                placeholder="Select proficiency"
                class="w-full"
              />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton
                type="button"
                variant="outline"
                :disabled="isAssignInstrumentSubmitting"
                @click="isAssignInstrumentOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                type="button"
                :loading="isAssignInstrumentSubmitting"
                :disabled="!assignInstrumentSelectedId || !assignInstrumentProficiency || isAssignInstrumentSubmitting"
                @click="confirmAssignInstrument()"
              >
                Assign Instrument
              </UButton>
            </div>
          </form>
        </template>
      </UModal>

      <!-- Unassign Instrument Confirmation Modal -->
      <UModal v-model:open="isUnassignInstrumentOpen" :dismissible="!isUnassignInstrumentSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Remove instrument from student</h3>
        </template>
        <template #body>
          <p v-if="instrumentToUnassign">
            Are you sure you want to remove {{ instrumentToUnassign.instrumentName }} from this student?
          </p>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              type="button"
              variant="outline"
              :disabled="isUnassignInstrumentSubmitting"
              @click="closeUnassignInstrumentConfirm"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="isUnassignInstrumentSubmitting"
              :disabled="isUnassignInstrumentSubmitting"
              @click="confirmUnassignInstrument"
            >
              Remove
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- Assign Special Assessment Modal -->
      <UModal v-model:open="isAssignAssessmentOpen" :dismissible="!isAssignAssessmentSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Assign Special Assessment</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isAssignAssessmentSubmitting"
              @click="isAssignAssessmentOpen = false"
            />
          </div>
        </template>
        <template #body>
          <form class="space-y-4" @submit.prevent="confirmAssignAssessment">
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
            <div class="flex justify-end gap-2">
              <UButton
                type="button"
                variant="outline"
                :disabled="isAssignAssessmentSubmitting"
                @click="isAssignAssessmentOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                type="button"
                :loading="isAssignAssessmentSubmitting"
                :disabled="!assignAssessmentSelectedId || isAssignAssessmentSubmitting"
                @click="confirmAssignAssessment()"
              >
                Assign Assessment
              </UButton>
            </div>
          </form>
        </template>
      </UModal>

      <!-- Unassign Special Assessment Confirmation Modal -->
      <UModal v-model:open="isUnassignAssessmentOpen" :dismissible="!isUnassignAssessmentSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Remove assessment from student</h3>
        </template>
        <template #body>
          <p v-if="assessmentToUnassign">
            Are you sure you want to remove {{ assessmentToUnassign.title }} from this student?
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

      <!-- Assign Guardian Modal -->
      <UModal v-model:open="isAssignGuardianOpen" :dismissible="!isAssignGuardianSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Assign Guardian</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isAssignGuardianSubmitting"
              @click="isAssignGuardianOpen = false"
            />
          </div>
        </template>
        <template #body>
          <form class="space-y-4" @submit.prevent="confirmAssignGuardian">
            <UFormField label="Guardian" name="guardianId" required block>
              <USelect
                v-model="assignGuardianSelectedId"
                :items="assignGuardianDropdownItems"
                placeholder="Select a guardian"
                class="w-full"
                :loading="availableGuardiansLoading"
                :disabled="availableGuardiansLoading"
              />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton
                type="button"
                variant="outline"
                :disabled="isAssignGuardianSubmitting"
                @click="isAssignGuardianOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                :loading="isAssignGuardianSubmitting"
                :disabled="!assignGuardianSelectedId || isAssignGuardianSubmitting"
              >
                Assign Guardian
              </UButton>
            </div>
          </form>
        </template>
      </UModal>

      <!-- Unassign Guardian Confirmation Modal -->
      <UModal v-model:open="isUnassignGuardianOpen" :dismissible="!isUnassignGuardianSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Remove guardian from student</h3>
        </template>
        <template #body>
          <p v-if="guardianToUnassign">
            Are you sure you want to remove {{ guardianToUnassign.firstName }} {{ guardianToUnassign.lastName }} from this student?
          </p>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              type="button"
              variant="outline"
              :disabled="isUnassignGuardianSubmitting"
              @click="closeUnassignGuardianConfirm"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="isUnassignGuardianSubmitting"
              :disabled="isUnassignGuardianSubmitting"
              @click="confirmUnassignGuardian"
            >
              Remove
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