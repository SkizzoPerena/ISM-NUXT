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

// Guard against missing journalId in the URL.
// If the ID is not present, redirect to the journals list page.
if (!journalId.value) {
  console.error('Journal ID is missing from the URL. Redirecting to journals list.');
  await navigateTo('/journals');
}

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

// Define a combined type for the page data
type JournalPageData = {
  journal: JournalDetail;
  teacher: TeacherInfo | null;
}

// Fetch journal and its associated teacher details in a single, combined async call
const { data, status } = await useAsyncData<JournalPageData | null>(
  `journal-page-${journalId.value}`,
  async () => {
    // 1. Fetch the primary journal details
    const journalResponse: any = await $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/journals/${journalId.value}`, {
      headers: { Authorization: `${useAuthToken().value}` },
    });
    console.log('Journal API Response:', journalResponse);

    const journalData = journalResponse?.journal;
    if (!journalData) {
      console.error('Journal data not found in API response:', journalResponse);
      return null;
    }

    // Shape the journal data into our desired type
    const journalDetail: JournalDetail = {
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
    };

    // 2. If a teacherId exists, fetch all teachers and find the matching one
    if (journalDetail.teacherId) {
      console.log(`[Teacher Fetch] Journal has teacherId: ${journalDetail.teacherId}. Fetching all teachers.`);
      const teachersResponse: any = await $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/teacher`, {
        headers: { Authorization: `${useAuthToken().value}` },
      });
      console.log('All Teachers API Response:', teachersResponse);

      const allTeachersData = teachersResponse?.data || teachersResponse?.teachers || teachersResponse;
      if (Array.isArray(allTeachersData)) {
        const foundTeacher = allTeachersData.find((t: any) => t._id === journalDetail.teacherId);
        if (foundTeacher) {
          // Return the combined data if teacher is found
          return { journal: journalDetail, teacher: foundTeacher };
        } else {
          console.error(`Teacher with ID ${journalDetail.teacherId} not found in the list.`);
        }
      } else {
        console.error('Expected an array of teachers, but got:', allTeachersData);
      }
    }

    // Return journal data even if teacher is not found or doesn't exist
    return { journal: journalDetail, teacher: null };
  },
  {
    // This ensures the data re-fetches if you navigate between journals without a full page reload
    watch: [journalId]
  }
);

// Computed properties to easily access the nested data in the template
const journal = computed(() => data.value?.journal);
const teacher = computed(() => data.value?.teacher);
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
            <div v-if="teacher" class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400">
              Teacher: {{ teacher.firstName }} {{ teacher.lastName }}
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