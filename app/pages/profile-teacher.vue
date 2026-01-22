<script lang="ts" setup>

definePageMeta({
  layout: 'dashboard',
})

const route = useRoute()
const teacherId = computed(() => route.query.id as string)

type SectionInfo = {
  _id: string
  name: string
}

type TeacherDetail = {
  _id: string
  firstName: string
  lastName: string
  email: string
  gender: string
  profileImageURL: string
  assignedSections: SectionInfo[]
}

// Fetch teacher details from the API using the ID from the URL
const { data: teacher, status } = await useAsyncData<TeacherDetail>(
  `teacher-${teacherId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/teacher/${teacherId.value}`, {
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
    transform: (response: any): TeacherDetail => {
      // The API response for a single item is likely nested under a 'data' or 'teacher' key.
      const teacherData = response.data || response.teacher || response

      // We explicitly map the fields to ensure the 'teacher' object always matches the 'TeacherDetail' type.
      return {
        _id: teacherData._id,
        firstName: teacherData.firstName,
        lastName: teacherData.lastName,
        email: teacherData.email,
        gender: teacherData.gender,
        profileImageURL: teacherData.profileImageURL,
        assignedSections: teacherData.assignedSections || [],
      }
    },
    // This ensures the data re-fetches if you navigate between teachers without a full page reload
    watch: [teacherId]
  }
)

</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading teacher profile...</p>
    </UPageCard>
    <template v-else-if="teacher">
      <UPageCard>
        <div class="flex items-center">
          <NuxtImg :src="teacher.profileImageURL || 'https://placehold.co/400x400'" :alt="`${teacher.firstName} ${teacher.lastName}`" width="200" height="200" class="rounded-full" />
          <UContainer class="ml-8">
            <UPageHeader :title="`${teacher.firstName} ${teacher.lastName}`" style="border-bottom: 0; padding-bottom: 0;">
              <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="email">{{ teacher.email }}</div>
              <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="_id">#{{ teacher._id }}</div>
            </UPageHeader>
          </UContainer>
        </div>
      </UPageCard>

      <UPageCard class="mt-8" v-if="teacher.assignedSections && teacher.assignedSections.length > 0">
        <template #header>
          <h3 class="text-lg font-semibold">Assigned Sections</h3>
        </template>

        <div class="space-y-2">
          <div v-for="section in teacher.assignedSections" :key="section._id">
            <NuxtLink :to="`/profile-section?id=${section._id}`" class="text-primary font-medium hover:underline">
              {{ section.name }}
            </NuxtLink>
          </div>
        </div>
      </UPageCard>
    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load teacher profile.</p>
    </UPageCard>
  </UContainer>
</template>
