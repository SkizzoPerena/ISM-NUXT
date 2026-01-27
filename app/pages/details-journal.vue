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
    label: 'Questions',
    slot: 'questions' as const
  },
] satisfies TabsItem[]

const route = useRoute()
const journalId = computed(() => route.query.id as string)

type QuestionType = "YES/NO" | "MULTIPLE CHOICE" | "ESSAY"

type Question = {
  questionText: string
  questionType: QuestionType
  choices: string[]
}

type JournalDetail = {
  _id: string
  title: string
  createdAt: string
  description: string
  updatedAt: string
  isDeleted: boolean
  questions: Question[]
  rubric: any | null
  supplementaryImageURL: string
  teacherId: string
}

// Define type for fetched teacher details
type TeacherInfo = {
  _id: string;
  firstName: string;
  lastName: string;
  profileImageURL?: string;
}

// Fetch journal details from the API using the ID from the URL
const { data: journal, status } = await useAsyncData<JournalDetail | null>(
  `journal-${journalId.value}`,
  () => $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/journals/${journalId.value}`, {
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
    transform: (response: any): JournalDetail | null => {
      // The API response nests the journal details under the 'journal' key.
      const journalData = response?.journal
      if (!journalData) {
        console.error('Journal data not found in API response:', response)
        return null
      }
      return {
        _id: journalData._id,
        title: journalData.title,
        createdAt: journalData.createdAt,
        description: journalData.description,
        updatedAt: journalData.updatedAt,
        isDeleted: journalData.isDeleted,
        questions: journalData.questions || [],
        rubric: journalData.rubric,
        supplementaryImageURL: journalData.supplementaryImageURL,
        teacherId: journalData.teacherId,
      }
    },
    // This ensures the data re-fetches if you navigate between teachers without a full page reload
    watch: [journalId]
  }
)

// Fetch teacher details based on the journal's teacherId
const { data: teacher, status: teacherStatus } = await useAsyncData<TeacherInfo | null>(
  () => `teacher-${journal.value?.teacherId}`, // Dynamic key based on journal's teacherId
  async () => {
    const teacherId = journal.value?.teacherId;
    if (!teacherId) {
      return null; // Don't fetch if teacherId is not available
    }
    const response = await $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/teacher/${teacherId}`, {
      headers: {
        Authorization: `${useAuthToken().value}`
      },
      onResponse({ response }) {
        console.log('Teacher API Response:', response._data);
      }
    });
    // Cast to `any` to handle potentially nested API response structures without TypeScript errors.
    const teacherData = (response as any)?.data || (response as any)?.teacher || response;
    if (!teacherData) {
      console.error('Teacher data not found in API response:', response);
      return null;
    }
    return {
      _id: teacherData._id,
      firstName: teacherData.firstName,
      lastName: teacherData.lastName,
      profileImageURL: teacherData.profileImageURL,
    };
  },
  {
    // Watch the journal data to re-fetch teacher details if the journal changes
    watch: [journal],
    immediate: false, // Only fetch once journal is available
  }
);

// Fetch rubrics and log the response
await useAsyncData(
  'rubrics',
  () => $fetch('https://noteworthy-z9k0.onrender.com/api/admin/rubrics', {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Rubrics API Response:', response._data)
    }
  })
)
</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading journal details...</p>
    </UPageCard>
    <template v-else-if="journal">
      <UPageCard>
        <UContainer>
          <UPageHeader :title="journal.title" style="border-bottom: 0; padding-bottom: 0;">
            <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="_id">
              ID: #{{ journal._id }}
              <span v-if="teacher" class="ml-4">Teacher: {{ teacher.firstName }} {{ teacher.lastName }}</span>
            </div>
            <div class="text-lg mt-2 text-gray-500 dark:text-gray-400">Created: {{ new
              Date(journal.createdAt).toLocaleDateString() }}</div>

          </UPageHeader>
        </UContainer>
      </UPageCard>

      <UPageCard class="mt-8">
        <UTabs :items="items" variant="link" :ui="{ trigger: 'grow' }" class="gap-4 w-full">
          <template #information>
            <div class="p-4">
              <h3 class="text-lg font-semibold">Description</h3>
              <p class="text-gray-900 dark:text-white mt-2">{{ journal.description }}</p>
            </div>
          </template>
          <!-- QUESTIONS TAB -->
          <template #questions>
            <div class="p-4 space-y-6">
              <div v-if="journal.questions && journal.questions.length > 0">
                <div v-for="(question, index) in journal.questions" :key="index"
                  class="pb-4 mb-4 border-b border-gray-200 dark:border-gray-700 last:border-b-0 last:mb-0">
                  <div class="flex items-start">
                    <p class="font-medium text-gray-900 dark:text-white">{{ index + 1 }}. {{ question.questionText }}</p>
                    <UBadge :label="question.questionType" color="primary" variant="subtle" class="ml-4 shrink-0" />
                  </div>

                  <div v-if="question.questionType === 'MULTIPLE CHOICE' && question.choices.length > 0" class="mt-3 pl-6">
                    <ul class="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-300">
                      <li v-for="(choice, choiceIndex) in question.choices" :key="choiceIndex">
                        {{ choice }}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <div v-else>
                <p>This journal does not have any questions.</p>
              </div>
            </div>
          </template>
          <!-- END QUESTIONS TAB -->
        </UTabs>
      </UPageCard>
    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load journal details.</p>
    </UPageCard>
  </UContainer>
</template>