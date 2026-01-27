<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const items = [
  {
    label: 'Information',
    slot: 'information' as const
  },
  {
    label: 'Rubrics',
    slot: 'rubrics' as const
  },
] satisfies TabsItem[]

const route = useRoute()
const assessmentId = computed(() => route.query.id as string)

type AssessmentDetail = {
  _id: string
  title: string
  createdAt: string
  instructions: string
  updatedAt: string
  isDeleted: boolean
  rubricId: string
  supplementaryImageURL: string
  supplementaryLinks: string[]
  teacherId: {
    _id: string
    email: string
  }
}

// Fetch assessment details from the API using the ID from the URL
const { data: assessment, status } = await useAsyncData<AssessmentDetail | null>(
  `assessment-${assessmentId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/assessments/${assessmentId.value}`, {
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
    transform: (response: any): AssessmentDetail | null => {
      // The API response nests the assessment details under a key like 'assessment' or 'data'.
      const assessmentData = response?.assessment || response?.data || response
      if (!assessmentData) {
        console.error('Assessment data not found in API response:', response)
        return null
      }
      return {
        _id: assessmentData._id,
        title: assessmentData.title,
        createdAt: assessmentData.createdAt,
        instructions: assessmentData.instructions,
        updatedAt: assessmentData.updatedAt,
        isDeleted: assessmentData.isDeleted,
        rubricId: assessmentData.rubricId,
        supplementaryImageURL: assessmentData.supplementaryImageURL,
        supplementaryLinks: assessmentData.supplementaryLinks || [],
        teacherId: assessmentData.teacherId,
      }
    },
    // This ensures the data re-fetches if you navigate between assessments without a full page reload
    watch: [assessmentId]
  }
)
</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading assessment details...</p>
    </UPageCard>
    <template v-else-if="assessment">
      <UPageCard>
        <UContainer>
          <UPageHeader :title="assessment.title" style="border-bottom: 0; padding-bottom: 0;">
            <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="_id">ID: #{{ assessment._id }}</div>
            <div class="text-lg mt-2 text-gray-500 dark:text-gray-400">Created: {{ new
              Date(assessment.createdAt).toLocaleDateString() }}</div>
          </UPageHeader>
        </UContainer>
      </UPageCard>

      <UPageCard class="mt-8">
        <UTabs :items="items" variant="link" :ui="{ trigger: 'grow' }" class="gap-4 w-full">
          <template #information>
            <div class="p-4">
              <h3 class="text-lg font-semibold">Instructions</h3>
              <p class="text-gray-900 dark:text-white mt-2">{{ assessment.instructions }}</p>
            </div>
          </template>

          <template #rubrics>
            <div class="p-4">
              <p>Rubric details will be displayed here.</p>
            </div>
          </template>
        </UTabs>
      </UPageCard>
    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load assessment details.</p>
    </UPageCard>
  </UContainer>
</template>