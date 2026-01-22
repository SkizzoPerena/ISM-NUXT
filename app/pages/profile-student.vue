<script lang="ts" setup>

definePageMeta({
  layout: 'dashboard',
})

const route = useRoute()
const studentId = computed(() => route.query.id as string)

type SectionInfo = {
  _id: string
  name: string
}

type InstrumentInfo = string // Assuming instruments are just strings (names)

type Journal = {
  _id: string
  title: string
  createdAt: string
  description: string
}

type StudentDetail = {
  _id: string
  firstName: string
  lastName: string
  email: string
  gender: string
  profileImageURL: string
  assignedSections: SectionInfo[]
  assignedInstruments: InstrumentInfo[]
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
        assignedInstruments: studentData.assignedInstruments || [], // Assuming array of strings
        assignedJournals: studentData.assignedJournals || [],
      }
    },
    watch: [studentId]
  }
)

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

      <UPageCard class="mt-8" v-if="student.assignedSections && student.assignedSections.length > 0">
        <template #header>
          <h3 class="text-lg font-semibold">Assigned Sections</h3>
        </template>

        <div class="space-y-2">
          <div v-for="section in student.assignedSections" :key="section._id">
            <NuxtLink :to="`/profile-section?id=${section._id}`" class="text-primary font-medium hover:underline">
              {{ section.name }}
            </NuxtLink>
          </div>
        </div>
      </UPageCard>

      <UPageCard class="mt-8" v-if="student.assignedInstruments && student.assignedInstruments.length > 0">
        <template #header>
          <h3 class="text-lg font-semibold">Assigned Instruments</h3>
        </template>

        <div class="space-y-2">
          <div v-for="instrument in student.assignedInstruments" :key="instrument">
            <span class="text-gray-900 dark:text-white">{{ instrument }}</span>
          </div>
        </div>
      </UPageCard>

      <UPageCard class="mt-8" v-if="student.assignedJournals && student.assignedJournals.length > 0">
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

    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load student profile.</p>
    </UPageCard>
  </UContainer>
</template>