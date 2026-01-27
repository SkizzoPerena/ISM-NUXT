<script lang="ts" setup>

definePageMeta({
  layout: 'dashboard',
})

const route = useRoute()
const guardianId = computed(() => route.query.id as string)

// This will be the info for the students linked to the guardian
type StudentInfo = {
  _id: string
  firstName: string
  lastName: string
  profileImageURL: string
}

type GuardianDetail = {
  _id: string
  firstName: string
  lastName: string
  email: string
  gender: string
  profileImageURL: string
}

// Fetch guardian details from the API using the ID from the URL
const { data: guardian, status } = await useAsyncData<GuardianDetail>(
  `guardian-${guardianId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/guardian/${guardianId.value}`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('API Response:', response._data)
    }
  }),
  {
    transform: (response: any): GuardianDetail => {
      const guardianData = response.data || response.guardian || response

      return {
        _id: guardianData._id,
        firstName: guardianData.firstName,
        lastName: guardianData.lastName,
        email: guardianData.email,
        gender: guardianData.gender,
        profileImageURL: guardianData.profileImageURL,
      }
    },
    watch: [guardianId]
  }
)

// Fetch assigned students (wards) for the guardian
const { data: students, status: studentsStatus } = await useAsyncData<StudentInfo[]>(
  `guardian-students-${guardianId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/student-guardian/${guardianId.value}/students`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Students API Response:', response._data)
    }
  }),
  {
    transform: (response: any): StudentInfo[] => {
      const studentData = response.data || response.students || response
      return Array.isArray(studentData) ? studentData.map((s: any) => ({
        _id: s._id,
        firstName: s.firstName,
        lastName: s.lastName,
        profileImageURL: s.profileImageURL,
      })) : []
    },
    watch: [guardianId]
  }
)

</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading guardian profile...</p>
    </UPageCard>
    <template v-else-if="guardian">
      <UPageCard>
        <div class="flex items-center">
          <NuxtImg :src="guardian.profileImageURL || 'https://placehold.co/400x400'" :alt="`${guardian.firstName} ${guardian.lastName}`" width="200" height="200" class="rounded-full" fit="fill" preload/>
          <UContainer class="ml-8">
            <UPageHeader :title="`${guardian.firstName} ${guardian.lastName}`" style="border-bottom: 0; padding-bottom: 0;">
              <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="email">{{ guardian.email }}</div>
              <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="_id">#{{ guardian._id }}</div>
            </UPageHeader>
          </UContainer>
        </div>
      </UPageCard>

      <UPageCard class="mt-8" v-if="students && students.length > 0">
        <template #header>
          <h3 class="text-lg font-semibold">Assigned Students</h3>
        </template>

        <div class="space-y-4">
          <div v-for="student in students" :key="student._id" class="flex items-center gap-4">
            <UAvatar :src="student.profileImageURL" :alt="`${student.firstName} ${student.lastName}`" />
            <div>
              <NuxtLink :to="`/profile-student?id=${student._id}`" class="text-primary font-medium hover:underline">
                {{ student.firstName }} {{ student.lastName }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </UPageCard>
      <UPageCard v-else-if="studentsStatus === 'success'" class="mt-8">
        <template #header>
          <h3 class="text-lg font-semibold">Assigned Students</h3>
        </template>
        <p>No wards assigned to this guardian.</p>
      </UPageCard>

    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load guardian profile.</p>
    </UPageCard>
  </UContainer>
</template>