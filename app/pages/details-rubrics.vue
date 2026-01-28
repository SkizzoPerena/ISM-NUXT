<script lang="ts" setup>
import { resolveComponent } from 'vue';
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
    label: 'Questions', // Renamed to "Questions" to display rubric questions
    slot: 'questions' as const
  },
] satisfies TabsItem[]

const route = useRoute()
const rubricId = computed(() => route.query.id as string)

type RubricQuestionType = "YES/NO" | "MULTIPLE CHOICE" | "ESSAY" | "LIKERT SCALE"

type RubricQuestion = {
  questionText: string
  questionType: RubricQuestionType
  choices: string[] | null // Choices can be null for non-MCQ types
}
type RubricDetail = {
  _id: string
  title: string
  createdAt: string
  description: string
  updatedAt: string
  isDeleted: boolean
  teacherId: string
  questions: RubricQuestion[]
  // Add other fields from the API response if needed, like 'criteria'
}

const UBadge = resolveComponent('UBadge');

// Fetch rubric details from the API using the ID from the URL
const { data: rubric, status } = await useAsyncData<RubricDetail | null>(
  `rubric-${rubricId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/rubrics/${rubricId.value}`, {
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
    transform: (response: any): RubricDetail | null => {
      // The API response nests the rubric details under the 'rubric' key.
      const rubricData = response?.rubric;
      if (!rubricData) {
        console.error('Rubric data not found in API response:', response)
        return null
      }
      return {
        _id: rubricData._id,
        title: rubricData.title,
        createdAt: rubricData.createdAt,
        description: rubricData.description || '', // Assuming description is the main text
        updatedAt: rubricData.updatedAt,
        isDeleted: rubricData.isDeleted,
        teacherId: rubricData.teacherId,
        questions: rubricData.questions || [],
      }
    },
    // This ensures the data re-fetches if you navigate between rubrics without a full page reload
    watch: [rubricId]
  }
)
</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading rubric details...</p>
    </UPageCard>
    <template v-else-if="rubric">
      <UPageCard>
        <UContainer>
          <UPageHeader :title="rubric.title" style="border-bottom: 0; padding-bottom: 0;">
            <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="_id">ID: #{{ rubric._id }}</div>
            <div class="text-lg mt-2 text-gray-500 dark:text-gray-400">Created: {{ new
              Date(rubric.createdAt).toLocaleDateString() }}</div>
          </UPageHeader>
        </UContainer>
      </UPageCard>

      <UPageCard class="mt-8">
        <UTabs :items="items" variant="link" :ui="{ trigger: 'grow' }" class="gap-4 w-full">
          <template #information>
            <div class="p-4">
              <h3 class="text-lg font-semibold">Description / Criteria</h3>
              <p class="text-gray-900 dark:text-white mt-2">{{ rubric.description }}</p>
            </div>
          </template>

          <!-- QUESTIONS TAB (for rubric questions) -->
          <template #questions>
            <div class="p-4 space-y-6">
              <div v-if="rubric.questions && rubric.questions.length > 0">
                <div v-for="(question, index) in rubric.questions" :key="index"
                  class="pb-4 mb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:mb-0">
                  <div class="flex items-start">
                    <p class="font-medium text-gray-900 dark:text-white">{{ index + 1 }}. {{ question.questionText }}</p>
                    <UBadge :label="question.questionType" color="primary" variant="subtle" class="ml-4 shrink-0" />
                  </div>

                  <div v-if="question.questionType === 'MULTIPLE CHOICE' && question.choices && question.choices.length > 0" class="mt-3 pl-6">
                    <ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                      <li v-for="(choice, choiceIndex) in question.choices" :key="choiceIndex">
                        {{ choice }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div v-else>
                <p>This rubric does not have any questions defined.</p>
              </div>
            </div>
          </template>
        </UTabs>
      </UPageCard>
    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load rubric details.</p>
    </UPageCard>
  </UContainer>
</template>