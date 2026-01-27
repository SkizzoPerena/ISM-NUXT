<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

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
  createdAt: string
  description: string
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
  assignedJournals: Journal[]
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
        assignedJournals: studentData.assignedJournals || [],
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



</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading student profile...</p>
    </UPageCard>
    <template v-else-if="student">
      <UPageCard>
        <div class="flex items-center">
          <NuxtImg :src="student.profileImageURL || 'https://placehold.co/400x400'" :alt="`${student.firstName} ${student.lastName}`" width="200" height="200" class="rounded-full" fit="fill" preload/>
          <UContainer class="ml-8">
            <UPageHeader :title="`${student.firstName} ${student.lastName}`" style="border-bottom: 0; padding-bottom: 0;">
              <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="email">{{ student.email }}</div>
              <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="_id">#{{ student._id }}</div>
            </UPageHeader>
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
              <UPageCard>
                <template #header>
                  <h3 class="text-lg font-semibold">Assessments</h3>
                </template>
                <p>No assessments available for this student yet.</p>
              </UPageCard>
            </UContainer>
          </template>

          <!-- JOURNALS TAB -->
          <template #journals="{ item }">
            <UPageCard class="mt-5" v-if="student.assignedJournals && student.assignedJournals.length > 0">
              <template #header>
                <h3 class="text-lg font-semibold">Assigned Journals</h3>
              </template>

              <div class="space-y-2">
                <div v-for="journal in student.assignedJournals" :key="journal._id">
                  <NuxtLink :to="`/journals?id=${journal._id}`" class="text-primary font-medium hover:underline">
                    {{ journal.title }}
                  </NuxtLink>
                </div>
              </div>
            </UPageCard>
            <UPageCard class="mt-5" v-else-if="status === 'success'">
              <template #header>
                <h3 class="text-lg font-semibold">Assigned Journals</h3>
              </template>
              <p>No journals assigned to this student.</p>
            </UPageCard>
          </template>
        </UTabs>
      </UPageCard>

    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load student profile.</p>
    </UPageCard>
  </UContainer>
</template>