<script lang="ts" setup>
import { ref, watch } from 'vue'

definePageMeta({
    layout: 'dashboard',
})

const questionType = ref(['MULTIPLE CHOICE', 'YES/NO', 'ESSAY'])

const journal = ref({
    title: '',
    description: '',
    teacherId: ''
})

type Question = {
    id: number;
    type: string;
    text: string;
    options?: { value: string }[];
    answer?: string; // For essay
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
                                <UFormField label="Keywords / Sample Answer" name="essayAnswer" class="mt-4">
                                    <UTextarea v-model="question.answer"  class="mt-2 w-full" placeholder="Enter keywords or a sample answer for grading reference" />
                                </UFormField>
                            </div>
                        </UForm>
                    </UPageCard>
                    <UButton @click="addQuestion" variant="subtle" icon="i-lucide-square-plus" block>Add new question</UButton>
                </div>

            </UPageGrid>
        </UPageCard>

        <UPageCard class="mt-4">
            <UButton size="lg" icon="i-lucide-circle-check" block>Finish Creating Journal</UButton>
        </UPageCard>


    </UContainer>

</template>