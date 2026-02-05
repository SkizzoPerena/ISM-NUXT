<script lang="ts" setup>
import { ref } from 'vue'

definePageMeta({
    layout: 'dashboard',
})

const questionType = ref(['Multiple Choice', 'Likert Scale', 'Yes/No', 'Enumeration'])

const rubric = ref({
    title: '',
    description: ''
})

type Question = {
    id: number;
    type: string;
    text: string;
    options?: { value: string }[];
    answer?: string; // For enumeration
};

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
            <div class="text-lg font-bold">Create Rubrics</div>
            <UPageGrid>
                <UForm>
                    <UFormGroup>

                        <UFormField label="Title" name="title" required block class="w-full">

                            <UInput label="Title" name="title" v-model="rubric.title" placeholder="Enter rubric title"
                                class="w-full" />
                        </UFormField>

                        <UFormField label="Description" name="description" required class="mt-4">
                            <UTextarea v-model="rubric.description" placeholder="Enter rubric description"
                                class="w-full" />
                        </UFormField>
                    </UFormGroup>
                </UForm>
                <div class="lg:col-span-2">
                    <div class="font-semibold">Rubric Questions</div>
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
                            <div v-if="question.type === 'Multiple Choice'">
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
                            <div v-else-if="question.type === 'Likert Scale'">
                                <p class="text-sm text-gray-500 dark:text-gray-400">A 1-5 rating scale will be shown.
                                </p>
                            </div>
                            <div v-else-if="question.type === 'Yes/No'">
                                <p class="text-sm text-gray-500 dark:text-gray-400">"Yes" and "No" options will be
                                    provided.</p>
                            </div>
                            <div v-else-if="question.type === 'Enumeration'">
                                <UFormGroup label="Correct Answer" name="enumerationAnswer">
                                    <UInput v-model="question.answer" placeholder="Enter the correct answer" class="mt-2 w-full" />
                                </UFormGroup>
                            </div>
                        </UForm>
                    </UPageCard>
                    <UButton @click="addQuestion" block>Add new question</UButton>
                </div>

            </UPageGrid>
        </UPageCard>


    </UContainer>

</template>