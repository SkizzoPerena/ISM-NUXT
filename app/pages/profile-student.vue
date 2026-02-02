<script lang="ts" setup>
import { h, resolveComponent, computed } from 'vue'
import type { TabsItem, FormError, FormSubmitEvent } from '@nuxt/ui'
import type { TableColumn } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

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

type Journal = {
  _id: string
  title: string
  description: string
  endDate: string
}

type Assessment = {
  _id: string
  title: string
  instructions: string
  createdAt: string
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

// Fetch all assigned journals from all sections the student is in
const { data: studentJournals, status: studentJournalsStatus } = await useAsyncData<Journal[]>(
  `student-journals-${studentId.value}`,
  async () => {
    if (!student.value?.assignedSections?.length) {
      return [];
    }

    // Create a fetch promise for each section
    const journalPromises = student.value.assignedSections.map(section =>
      $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/journal-sections/section/${section._id}`, {
        headers: { Authorization: `${useAuthToken().value}` }
      })
    );

    // Wait for all fetches to complete
    const sectionJournalsResponses = await Promise.all(journalPromises);

    // Combine assignments from all sections into a single array
    const allAssignments = sectionJournalsResponses.flatMap((response: any) => response.assignments || []);

    // Deduplicate journals using a Map, in case a journal is assigned in multiple sections
    const uniqueJournals = new Map<string, any>();
    for (const assignment of allAssignments) {
      if (assignment.journalId && !uniqueJournals.has(assignment.journalId._id)) {
        uniqueJournals.set(assignment.journalId._id, assignment);
      }
    }

    return Array.from(uniqueJournals.values());
  },
  {
    transform: (assignments: any[]): Journal[] => {
      return assignments.map(assignment => {
        const journal = assignment.journalId;
        if (!journal) return null;
        return {
          _id: journal._id,
          title: journal.title,
          endDate: assignment.endDate, // due date
          description: journal.description,
        };
      }).filter((j): j is Journal => j !== null);
    },
    watch: [student] // Re-run if student data changes
  }
);

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
    description: 'Assigned practice journals.',
    icon: 'i-lucide-notebook-pen',
    slot: 'journals' as const
  },
] satisfies TabsItem[]

const journalsExpanded = ref({})
const assessmentsExpanded = ref({})

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
              <div class="text-lg font-semibold" style="">Assigned Assessments</div>

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
          </template>

          <!-- JOURNALS TAB -->
          <template #journals="{ item }">
            <UContainer class="mt-5">
              <div class="text-lg font-semibold" style="">Assigned Practice Journals</div>

              <UTable v-model:expanded="journalsExpanded" :data="studentJournals || []" :columns="journalcolumns"
                :ui="{ tr: 'data-[expanded=true]:bg-elevated/50', thead: 'hidden' }" class="flex-1 mt-4 border-t border-default" :loading="studentJournalsStatus === 'pending'">
                <template #empty-state>
                  <div class="flex flex-col items-center justify-center py-6 gap-3">
                    <span class="italic text-sm">No journals assigned to this student.</span>
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