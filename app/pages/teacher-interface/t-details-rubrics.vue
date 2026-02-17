<script lang="ts" setup>
import { ref, reactive, watch, computed } from 'vue'
import type { TabsItem, FormError } from '@nuxt/ui'

definePageMeta({
  layout: 't-dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'
const toast = useToast()

const questionType = ref(['MULTIPLE CHOICE', 'LIKERT SCALE', 'YES/NO', 'ENUMERATION'])

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
const rubricId = computed(() => route.query.id as string)

if (!rubricId.value) {
  console.error('Rubric ID is missing from the URL. Redirecting to rubrics list.');
  await navigateTo('/teacher-interface/t-rubrics');
}

type QuestionType = "MULTIPLE CHOICE" | "LIKERT SCALE" | "YES/NO" | "ENUMERATION"

type Question = {
  questionText: string,
  questionType: QuestionType
  choices: string[]
}

type RubricDetail = {
  _id: string
  title: string
  createdAt: string
  description: string
  updatedAt: string
  isDeleted: boolean
  questions: Question[]
  teacherId: string
}

// Inherit the user state from the dashboard layout
const user = useState('user')

// Fetch rubric details
const { data: rubric, status, refresh: refreshRubric } = await useAsyncData<RubricDetail | null>(
  `teacher-rubric-${rubricId.value}`,
  async () => {
    const rubricResponse: any = await $fetch(`${API_BASE}/api/teacher/rubrics/${rubricId.value}`, {
      headers: { Authorization: `${useAuthToken().value}` },
    });
    console.log('Teacher Rubric API Response:', rubricResponse);
    return rubricResponse?.rubric || rubricResponse?.data || rubricResponse || null;
  },
  {
    watch: [rubricId]
  }
);

// EDIT / DELETE LOGIC
type EditableQuestion = {
  id: number;
  type: string;
  text: string;
  options?: { value: string }[];
};

const isEditOpen = ref(false)
const isDeleteOpen = ref(false)
const isEditSubmitting = ref(false)
const isDeleteSubmitting = ref(false)

const editState = reactive({
  title: '',
  description: '',
  questions: [] as EditableQuestion[],
})

type EditSchema = typeof editState

function validateEdit(state: Partial<EditSchema>): FormError[] {
  const errors: FormError[] = []
  if (!state.title) errors.push({ name: 'title', message: 'Required' })
  if (!state.description) errors.push({ name: 'description', message: 'Required' })
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
  if (!rubric.value) return
  editState.title = rubric.value.title
  editState.description = rubric.value.description
  editState.questions = (rubric.value.questions || []).map(q => ({
    id: Date.now() + Math.random(),
    text: q.questionText,
    type: q.questionType,
    options: q.questionType === 'MULTIPLE CHOICE' ? (q.choices || []).map(c => ({ value: c })) : [{ value: '' }],
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

async function onSubmitEdit() {
  if (!rubricId.value || isEditSubmitting.value) return
  const errors = validateEdit(editState)
  if (errors.length > 0) {
    toast.add({ title: 'Validation failed', description: errors[0]?.message ?? 'Please fix the form errors.', color: 'error' })
    return
  }
  isEditSubmitting.value = true
  try {
    const payload = {
      title: editState.title.trim(),
      description: editState.description.trim(),
      questions: editState.questions.map(q => {
        const base: { questionText: string; questionType: string; choices?: string[] } = {
          questionText: q.text.trim(),
          questionType: q.type.trim(),
        }
        if (q.type === 'MULTIPLE CHOICE' && q.options?.length) {
          base.choices = q.options.map(o => o.value?.trim()).filter((v): v is string => !!v)
        }
        return base
      }),
    }

    await $fetch(`${API_BASE}/api/teacher/rubrics/${rubricId.value}`, {
      method: 'PATCH',
      headers: {
        Authorization: `${useAuthToken().value}`,
        'Content-Type': 'application/json',
      },
      body: payload,
    })

    toast.add({ title: 'Success', description: 'Rubric updated successfully.', color: 'success' })
    isEditOpen.value = false
    await refreshRubric()
  } catch (error) {
    console.error('Error updating rubric:', error)
    toast.add({ title: 'Error', description: 'Failed to update rubric.', color: 'error' })
  } finally {
    isEditSubmitting.value = false
  }
}

async function onDeleteRubric() {
  if (!rubricId.value || isDeleteSubmitting.value) return
  isDeleteSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/teacher/rubrics/${rubricId.value}/archive`, {
      method: 'DELETE',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
    })

    toast.add({ title: 'Deleted', description: 'Rubric deleted successfully.', color: 'success' })
    isDeleteOpen.value = false
    await navigateTo('/teacher-interface/t-rubrics')
  } catch (error) {
    console.error('Error deleting rubric:', error)
    toast.add({ title: 'Error', description: 'Failed to delete rubric.', color: 'error' })
  } finally {
    isDeleteSubmitting.value = false
  }
}
</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading rubric details...</p>
    </UPageCard>
    <template v-else-if="rubric">
      <UPageCard>
        <UContainer>
          <div class="flex items-start justify-between w-full">
            <UPageHeader :title="rubric.title" style="border-bottom: 0; padding-bottom: 0;">
              <div v-if="user" class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400">
                Teacher: {{ (user as any).firstName }} {{ (user as any).lastName }}
              </div>
              <div class="text-lg mt-2 text-gray-500 dark:text-gray-400">Created: {{ new
                Date(rubric.createdAt).toLocaleDateString() }}</div>

            </UPageHeader>
            <div class="flex items-start gap-2">
              <UButton icon="i-lucide-pencil" variant="ghost" aria-label="Edit rubric" @click="openEditModal" />
              <UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Delete rubric"
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
              <p class="text-gray-900 dark:text-white mt-2">{{ rubric.description }}</p>
            </div>
          </template>
          <template #questions>
            <div class="p-4 space-y-6">
              <div v-if="rubric.questions && rubric.questions.length > 0">
                <div v-for="(question, index) in rubric.questions" :key="index"
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
                <p>This rubric does not have any questions.</p>
              </div>
            </div>
          </template>
        </UTabs>
      </UPageCard>
    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load rubric details.</p>
    </UPageCard>

    <!-- Edit Rubric Modal -->
    <UModal v-model:open="isEditOpen" :dismissible="false" fullscreen>
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-lg font-semibold">Edit Rubric</h3>
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
            <UFormField label="Description" name="description" required>
              <UTextarea v-model="editState.description" class="w-full" />
            </UFormField>
          </div>

          <div class="lg:col-span-2">
            <div class="font-semibold">Rubric Questions</div>
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
              </div>
            </UPageCard>
            <UButton @click="addQuestion" variant="subtle" icon="i-lucide-square-plus" block>Add new question
            </UButton>
          </div>
        </UPageGrid>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton type="button" variant="outline" :disabled="isEditSubmitting" @click="isEditOpen = false">
            Cancel
          </UButton>
          <UButton type="button" :loading="isEditSubmitting" :disabled="isEditSubmitting" @click="onSubmitEdit">
            Update Rubric
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteOpen" :dismissible="!isDeleteSubmitting">
      <template #header>
        <h3 class="text-lg font-semibold">Delete Rubric</h3>
      </template>
      <template #body>
        <p>Are you sure you want to delete this rubric? This action cannot be undone.</p>
        <div class="flex justify-end gap-2 mt-6">
          <UButton type="button" variant="outline" :disabled="isDeleteSubmitting" @click="isDeleteOpen = false">
            Cancel
          </UButton>
          <UButton color="error" :loading="isDeleteSubmitting" :disabled="isDeleteSubmitting" @click="onDeleteRubric">
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>