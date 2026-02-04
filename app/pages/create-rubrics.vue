<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
    layout: 'dashboard',
})

const questionType = ref(['Multiple Choice', 'Likert Scale', 'Yes/No', 'Enumeration'])
</script>

<template>

    <UContainer>
        <UPageCard>
            <div class="text-lg font-bold">Create Rubrics</div>
            <UPageGrid>
                <UForm>
                    <UFormField label="Title" name="title" required block class="w-full">
                    
                    <UInput label="Title" name="title" required block class="w-full">
 
                    </UInput>
                
                    <div class="mt-4 text-semibold">Description</div>
                    <UTextarea label="Description" name="description" required  class="w-full">

                    </UTextarea>
                    </UFormField>
                </UForm>
                <UContainer class="lg:col-span-2">
                    <div class=" font-semibold">Rubric Questions</div>
                   <UPageCard class="my-4">
                    <div class="flex justify-between items-center ">
                        <div>Question 1</div>
                        <UButton icon="i-lucide-x" size="sm" variant="ghost" color="neutral"></UButton>
                    </div>
                    <UForm class="">
                        <UFormField>
                            <USelect placeholder="Select Question Type" :items="questionType" class="w-full mb-4" />
                        </UFormField>
                        <UFormField>
                            <UInput label="Question Text" block placeholder="Enter Question" class="w-full" />
                        </UFormField>
                    </UForm>
                    </UPageCard>
                    <UButton block>Add new question</UButton>
                </UContainer>

            </UPageGrid>
        </UPageCard>


    </UContainer>

</template>