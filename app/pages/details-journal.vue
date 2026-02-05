<script lang="ts" setup>
import { ref, reactive, watch, computed } from 'vue'
import type { TabsItem, FormError, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'
const toast = useToast()

const questionType = ref(['MULTIPLE CHOICE', 'YES/NO', 'ESSAY'])

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
  questionText: string,
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

// Data for Edit Modal Selects
const teachers = ref<{ label: string, value: string }[]>([]);
const { data: teacherData, pending: teachersPending } = useAsyncData(
  'teachers-for-journal-edit',
  () => $fetch(`${API_BASE}/api/admin/teacher`, {
    headers: { Authorization: `${useAuthToken().value}` }
  }),
  {
    transform: (response: any): { _id: string, firstName: string, lastName: string }[] => {
      const teacherList = response?.data || response?.teachers || response;
      if (!Array.isArray(teacherList)) return [];
      return teacherList.map((teacher: any) => ({
        _id: teacher._id,
        firstName: teacher.firstName,
        lastName: teacher.lastName,
      }));
    }
  }
);

watch(teacherData, (newTeacherData) => {
  if (newTeacherData) {
    teachers.value = newTeacherData.map(t => ({
      label: `${t.firstName} ${t.lastName}`,
      value: t._id
    }));
  }
}, { immediate: true });

// Fetch journal and its associated teacher details in a single, combined async call
const { data, status, refresh: refreshJournal } = await useAsyncData<JournalPageData | null>(
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

// EDIT / DELETE LOGIC
type EditableQuestion = {
  id: number;
  type: string;
  text: string;
  options?: { value: string }[];
  answer?: string; // For essay
};

const isEditOpen = ref(false)
const isDeleteOpen = ref(false)
const isEditSubmitting = ref(false)
const isDeleteSubmitting = ref(false)

const editState = reactive({
  title: '',
  description: '',
  teacherId: '',
  questions: [] as EditableQuestion[],
})

type EditSchema = typeof editState

function validateEdit(state: Partial<EditSchema>): FormError[] {
  const errors: FormError[] = []
  if (!state.title) errors.push({ name: 'title', message: 'Required' })
  if (!state.description) errors.push({ name: 'description', message: 'Required' })
  if (!state.teacherId) errors.push({ name: 'teacherId', message: 'Required' })
  state.questions?.forEach((q, i) => {
    if (!q.text) errors.push({ name: `question_${i}_text`, message: `Q${i + 1}: Text is required` })
    if (!q.type) errors.push({ name: `question_${i}_type`, message: `Q${i + 1}: Type is required` })
    if (q.type === 'MULTIPLE CHOICE' && (!q.options || q.options.filter(o => o.value).length < 2)) {
      errors.push({ name: `question_${i}_options`, message: `Q${i + 1}: At least 2 options required` })
    }
  })
  return errors
}

function openEditModal() {
  if (!journal.value) return
  editState.title = journal.value.title
  editState.description = journal.value.description
  editState.teacherId = journal.value.teacherId || ''
  // Map fetched questions to editable format
  editState.questions = (journal.value.questions || []).map(q => ({
    id: Date.now() + Math.random(),
    text: q.questionText,
    type: q.questionType,
    // The API returns `choices` as a string array for MULTIPLE CHOICE
    options: q.questionType === 'MULTIPLE CHOICE' ? (q.choices || []).map(c => ({ value: c })) : [{ value: '' }],
    // The API for a single journal doesn't seem to return the 'answer' for essays.
    // We'll assume it's empty on edit unless the API changes.
    answer: '',
  }))
  if (editState.questions.length === 0) {
    editState.questions.push({ id: Date.now(), type: '', text: '', options: [{ value: '' }] })
  }
  isEditOpen.value = true
}

// Question management for edit modal
function addQuestion() {
  editState.questions.push({ id: Date.now(), type: '', text: '', options: [{ value: '' }] });
}

function removeQuestion(id: number) {
  if (editState.questions.length > 1) {
    editState.questions = editState.questions.filter(q => q.id !== id);
  }
}

function addOption(question: EditableQuestion) {
  if (!question.options) {
    question.options = [];
  }
  question.options.push({ value: '' });
}

function removeOption(question: EditableQuestion, optionIndex: number) {
  if (question.options && question.options.length > 1) {
    question.options.splice(optionIndex, 1);
  }
}

async function onSubmitEdit(event: FormSubmitEvent<EditSchema>) {
  if (!journalId.value || isEditSubmitting.value) return
  isEditSubmitting.value = true
  try {
    const payload = {
      title: editState.title,
      description: editState.description,
      teacherId: editState.teacherId,
      questions: editState.questions.map(q => ({
        questionText: q.text,
        questionType: q.type,
        choices: q.type === 'MULTIPLE CHOICE' ? q.options?.map(o => o.value).filter(Boolean) : undefined,
        answer: q.type === 'ESSAY' ? q.answer : undefined,
      }))
    }

    await $fetch(`${API_BASE}/api/admin/journals/${journalId.value}`, {
      method: 'PATCH',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
      body: payload,
    })

    toast.add({ title: 'Success', description: 'Journal updated successfully.', color: 'success' })
    isEditOpen.value = false
    await refreshJournal()
  } catch (error) {
    console.error('Error updating journal:', error)
    toast.add({ title: 'Error', description: 'Failed to update journal.', color: 'error' })
  } finally {
    isEditSubmitting.value = false
  }
}

async function onDeleteJournal() {
  if (!journalId.value || isDeleteSubmitting.value) return
  isDeleteSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/journals/${journalId.value}`, {
      method: 'DELETE',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
    })

    toast.add({ title: 'Deleted', description: 'Journal deleted successfully.', color: 'success' })
    isDeleteOpen.value = false
    await navigateTo('/journals')
  } catch (error) {
    console.error('Error deleting journal:', error)
    toast.add({ title: 'Error', description: 'Failed to delete journal.', color: 'error' })
  } finally {
    isDeleteSubmitting.value = false
  }
}
</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading journal details...</p>
    </UPageCard>
    <template v-else-if="journal">
      <UPageCard>
        <UContainer>
          <div class="flex items-start justify-between w-full">
            <UPageHeader :title="journal.title" style="border-bottom: 0; padding-bottom: 0;">
              <div v-if="teacher" class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400">
                Teacher: {{ teacher.firstName }} {{ teacher.lastName }}
              </div>
              <div class="text-lg mt-2 text-gray-500 dark:text-gray-400">Created: {{ new
                Date(journal.createdAt).toLocaleDateString() }}</div>

            </UPageHeader>
            <div class="flex items-start gap-2">
              <UButton icon="i-lucide-pencil" variant="ghost" aria-label="Edit journal" @click="openEditModal" />
              <UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Delete journal"
                @click="isDeleteOpen = true" />
            </div>
          </div>
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
                    <p class="font-medium text-gray-900 dark:text-white">{{ index + 1 }}. {{ question.questionText }}
                    </p>
                    <UBadge :label="question.questionType" color="primary" variant="subtle" class="ml-4 shrink-0" />
                  </div>

                  <div v-if="question.questionType === 'MULTIPLE CHOICE' && question.choices.length > 0"
                    class="mt-3 pl-6">
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

    <!-- Edit Journal Modal -->
    <UModal v-model:open="isEditOpen" :dismissible="false" fullscreen>

      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-lg font-semibold">Edit Journal</h3>
          <UButton icon="i-lucide-x" variant="ghost" color="error" :disabled="isEditSubmitting"
            @click="isEditOpen = false" />
        </div>
      </template>
      <template #body>

        <UPageGrid>
          <div class="space-y-4">
            <UFormField label="Title" name="title" required>
              <UInput v-model="editState.title" class="w-full" />
            </UFormField>

            <UFormField label="Assigned Teacher" name="teacherId" required>
              <USelect v-model="editState.teacherId" placeholder="Select a teacher" :items="teachers"
                option-attribute="label" value-attribute="value" :loading="teachersPending" class="w-full" />
            </UFormField>

            <UFormField label="Description" name="description" required>
              <UTextarea v-model="editState.description" class="w-full" />
            </UFormField>
          </div>

          <div class="lg:col-span-2">
            <div class="font-semibold">Journal Questions</div>
            <UPageCard v-for="(question, index) in editState.questions" :key="question.id" class="my-4">
              <div class="flex justify-between items-center">
                <div class="font-semibold">Question {{ index + 1 }}</div>
                <UButton @click="removeQuestion(question.id)" icon="i-lucide-x" variant="ghost" color="error"
                  :disabled="editState.questions.length <= 1" />
              </div>
              <div>
                <UFormField label="Question" :name="`question_${index}_text`">
                  <UInput v-model="question.text" class="w-full mb-4" placeholder="Enter question text"  />
                </UFormField>
                <UFormField label="Question Type" :name="`question_${index}_type`">
                  <USelect v-model="question.type" class="w-full" placeholder="Select question type"
                    :items="questionType" />
                </UFormField>

                <!-- Conditional fields based on question type -->
                <div v-if="question.type === 'MULTIPLE CHOICE'">
                  <UFormField label="Options" :name="`question_${index}_options`" class="mt-2">
                    <div v-for="(option, optionIndex) in question.options" :key="optionIndex"
                      class="flex items-center gap-2 mb-2">
                      <UInput v-model="option.value" placeholder="Option text" class="flex-1" />
                      <UButton @click="removeOption(question, optionIndex)" icon="i-lucide-trash-2" color="error"
                        variant="ghost" :disabled="question.options && question.options.length <= 1" />
                    </div>
                    <UButton @click="addOption(question)" size="sm" variant="outline" block>Add Option</UButton>
                  </UFormField>
                </div>
                <div v-else-if="question.type === 'YES/NO'">
                  <p class="text-sm text-gray-500 dark:text-gray-400">"Yes" and "No" options will be provided.</p>
                </div>
                <div v-else-if="question.type === 'ESSAY'">
                  <p class="text-sm text-gray-500 dark:text-gray-400">Free-form essay response.</p>
                </div>
              </div>
            </UPageCard>
            <UButton @click="addQuestion" variant="subtle" icon="i-lucide-square-plus" block>Add new question
            </UButton>
          </div>
        </UPageGrid>
      </template>
      <template #footer class="flex justify-between gap-2">

        <UButton type="button" block variant="outline" :disabled="isEditSubmitting" @click="isEditOpen = false">
          Cancel
        </UButton>
        <UButton type="submit" block :loading="isEditSubmitting" :disabled="isEditSubmitting">
          Update Journal
        </UButton>

      </template>

    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteOpen" :dismissible="!isDeleteSubmitting">
      <template #header>
        <h3 class="text-lg font-semibold">Delete Journal</h3>
      </template>
      <template #body>
        <p>Are you sure you want to delete this journal? This action cannot be undone.</p>
        <div class="flex justify-end gap-2 mt-6">
          <UButton type="button" variant="outline" :disabled="isDeleteSubmitting" @click="isDeleteOpen = false">
            Cancel
          </UButton>
          <UButton color="error" :loading="isDeleteSubmitting" :disabled="isDeleteSubmitting" @click="onDeleteJournal">
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>