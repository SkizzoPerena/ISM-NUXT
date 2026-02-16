<script lang="ts" setup>
import { ref, watch } from 'vue'

definePageMeta({
    layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'
const toast = useToast()

const questionType = ref(['MULTIPLE CHOICE', 'YES/NO', 'ESSAY'])

const journal = ref({
    title: '',
    description: '',
    teacherId: ''
})

const isSubmitting = ref(false)

type Question = {
    id: number;
    type: string;
    text: string;
    options?: { value: string }[];
};

type TeacherInfo = {
  _id: string;
  firstName: string;
  lastName:string;
}

const teachers = ref<{ label: string, value: string }[]>([]);
const { data: teacherData, pending: teachersPending } = useAsyncData(
  'teachers',
  () => $fetch('https://noteworthy-z9k0.onrender.com/api/admin/teacher', {
    headers: {
      Authorization: `${useAuthToken().value}`
    }
  }),
  {
    transform: (response: any): TeacherInfo[] => {
      const teacherList = response?.data || response?.teachers || response;
      if (!Array.isArray(teacherList)) {
        return [];
      }
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

const questions = ref<Question[]>([
    { id: Date.now(), type: '', text: '', options: [{ value: '' }] }
]);

function addQuestion() {
    questions.value.push({ id: Date.now(), type: '', text: '', options: [{ value: '' }] });
}

function removeQuestion(id: number) {
    // Keep at least one question
    if (questions.value.length > 1) {
        questions.value = questions.value.filter(q => q.id !== id);
    }
}

function addOption(question: Question) {
    if (!question.options) {
        question.options = [];
    }
    question.options.push({ value: '' });
}

function removeOption(question: Question, optionIndex: number) {
    if (question.options && question.options.length > 1) {
        question.options.splice(optionIndex, 1);
    }
}

function validate(): string | null {
    if (!journal.value.title?.trim()) return 'Title is required.'
    if (!journal.value.description?.trim()) return 'Description is required.'
    if (!journal.value.teacherId?.trim()) return 'Assigned teacher is required.'
    for (const [i, q] of questions.value.entries()) {
        if (!q.text?.trim()) return `Question ${i + 1}: question text is required.`
        if (!q.type?.trim()) return `Question ${i + 1}: question type is required.`
        if (q.type === 'MULTIPLE CHOICE' && q.options?.length) {
            const filled = q.options.map((o) => o.value?.trim()).filter(Boolean)
            if (filled.length < 2) return `Question ${i + 1}: Multiple Choice requires at least two choices.`
        }
    }
    return null
}

function buildPayload() {
    return {
        teacherId: journal.value.teacherId.trim(),
        title: journal.value.title.trim(),
        description: journal.value.description.trim(),
        questions: questions.value.map((q) => {
            const base: { questionText: string; questionType: string; choices?: string[] } = {
                questionText: q.text.trim(),
                questionType: q.type.trim(),
            }
            if (q.type === 'MULTIPLE CHOICE' && q.options?.length) {
                base.choices = q.options.map((o) => o.value?.trim()).filter((v): v is string => !!v)
            }
            return base
        }),
    }
}

async function createJournal() {
    const err = validate()
    if (err) {
        toast.add({ title: 'Validation failed', description: err, color: 'error' })
        return
    }
    if (isSubmitting.value) return
    isSubmitting.value = true
    try {
        await $fetch(`${API_BASE}/api/admin/journals`, {
            method: 'POST',
            headers: { Authorization: `${useAuthToken().value}` },
            body: buildPayload(),
        })
        toast.add({ title: 'Success', description: 'Journal created.', color: 'success' })
        await navigateTo('/journals')
    } catch (error) {
        console.error('Error creating journal:', error)
        toast.add({ title: 'Error', description: 'Failed to create journal.', color: 'error' })
    } finally {
        isSubmitting.value = false
    }
}
</script>

<template>
    <UContainer>
        <UPageCard>
            <div class="text-lg font-bold">Create Journal</div>
            <USeparator />
            <UPageGrid>
                <UForm>
                    <UFormGroup>
                        <UFormField label="Title" name="title" required block class="w-full">
                            <UInput label="Title" name="title" v-model="journal.title" placeholder="Enter journal title"
                                class="w-full" />
                        </UFormField>
                        <UFormField label="Assigned Teacher" name="teacher" required class="mt-4">
                            <USelect v-model="journal.teacherId"
                                placeholder="Select a teacher"
                                :items="teachers"
                                option-attribute="label"
                                value-attribute="value"
                                :loading="teachersPending"
                                class="w-full"
                                />
                        </UFormField>
                        <UFormField label="Description" name="description" required class="mt-4">
                            <UTextarea v-model="journal.description" placeholder="Enter journal description"
                                class="w-full" />
                        </UFormField>
                    </UFormGroup>
                </UForm>
                <div class="lg:col-span-2">
                    <div class="font-semibold">Journal Questions</div>
                    <!-- make a new card for every question -->
                    <UPageCard v-for="(question, index) in questions" :key="question.id" class="my-4">
                        <div class="flex justify-between items-center">
                            <div class="font-semibold">Question {{ index + 1 }}</div>
                            <UButton @click="removeQuestion(question.id)" icon="i-lucide-x" variant="ghost"
                                color="error" :disabled="questions.length <= 1" />
                        </div>
                        <UForm>
                            <UForm>
                            <UFormField label="Question" name="questionText">
                                <UInput v-model="question.text" placeholder="Enter question text"  class="w-full"/>
                            </UFormField>
                            <UFormField label="Question Type" name="questionType" class="mt-4">
                                <USelect v-model="question.type" placeholder="Select question type"  class="w-full "
                                    :items="questionType" />
                            </UFormField>
                        </UForm>
                            <!-- Conditional fields based on question type -->
                            <div v-if="question.type === 'MULTIPLE CHOICE'">
                                <UForm label="Options" class="mt-2">
                                    <div v-for="(option, optionIndex) in question.options" :key="optionIndex"
                                        class="flex items-center gap-2 mb-2">
                                        <UInput v-model="option.value" placeholder="Option text" class="flex-1" />
                                        <UButton @click="removeOption(question, optionIndex)" icon="i-lucide-trash-2"
                                            color="error" variant="ghost"
                                            :disabled="question.options && question.options.length <= 2" />
                                    </div>
                                    <UButton @click="addOption(question)" size="sm" variant="outline" >Add Option
                                    </UButton>
                                </UForm>
                            </div>
                            <div v-else-if="question.type === 'YES/NO'">
                                <p class="text-sm text-gray-500 dark:text-gray-400">"Yes" and "No" options will be
                                    provided.</p>
                            </div>
                            <div v-else-if="question.type === 'ESSAY'">
                                <p class="text-sm text-gray-500 dark:text-gray-400">Free-form essay response.</p>
                            </div>
                        </UForm>
                    </UPageCard>
                    <UButton @click="addQuestion" variant="subtle" block>Add new question</UButton>
                </div>
            </UPageGrid>
        </UPageCard>
        <UPageCard class="mt-4">
            <UButton size="lg" icon="i-lucide-circle-check" block :loading="isSubmitting" @click="createJournal">Finish Creating Journal</UButton>
        </UPageCard>
    </UContainer>
</template>