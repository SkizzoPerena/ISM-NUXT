<script lang="ts" setup>
import { ref, watch } from 'vue'

definePageMeta({
    layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'
const toast = useToast()

const assessment = ref({
    title: '',
    instructions: '',
    teacherId: '',
    rubricId: ''
})

const isSubmitting = ref(false)
const supplementaryImageFile = ref<File | null>(null)

type TeacherInfo = {
  _id: string;
  firstName: string;
  lastName:string;
}

type RubricInfo = {
  _id: string;
  title: string;
}

const teachers = ref<{ label: string, value: string }[]>([]);
const { data: teacherData, pending: teachersPending } = useAsyncData(
  'teachers',
  () => $fetch(`${API_BASE}/api/admin/teacher`, {
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

const rubrics = ref<{ label: string, value: string }[]>([]);
const { data: rubricData, pending: rubricsPending } = useAsyncData(
  'rubrics',
  () => $fetch(`${API_BASE}/api/admin/rubrics`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    }
  }),
  {
    transform: (response: any): RubricInfo[] => {
      const rubricList = response?.data || response?.rubrics || response;
      if (!Array.isArray(rubricList)) {
        return [];
      }
      return rubricList.map((rubric: any) => ({
        _id: rubric._id,
        title: rubric.title,
      }));
    }
  }
);

watch(rubricData, (newRubricData) => {
  if (newRubricData) {
    rubrics.value = newRubricData.map(r => ({
      label: r.title,
      value: r._id
    }));
  }
}, { immediate: true });

type SupplementaryLink = {
  id: number;
  value: string;
};

const supplementaryLinks = ref<SupplementaryLink[]>([
  { id: Date.now(), value: '' }
]);

function addSupplementaryLink() {
  supplementaryLinks.value.push({ id: Date.now(), value: '' });
}

function removeSupplementaryLink(id: number) {
  // Keep at least one link field
  if (supplementaryLinks.value.length > 1) {
    supplementaryLinks.value = supplementaryLinks.value.filter(link => link.id !== id);
  }
}

function onSupplementaryImageChange(event: Event) {
  const input = event.target as HTMLInputElement
  supplementaryImageFile.value = input.files?.[0] ?? null
}

function validate(): string | null {
  if (!assessment.value.title?.trim()) return 'Title is required.'
  if (!assessment.value.instructions?.trim()) return 'Instructions are required.'
  if (!assessment.value.teacherId?.trim()) return 'Assigned teacher is required.'
  if (!assessment.value.rubricId?.trim()) return 'Assign rubric is required.'
  return null
}

function getSupplementaryLinks(): string[] {
  return supplementaryLinks.value.map(l => l.value?.trim()).filter((v): v is string => !!v)
}

async function createAssessment() {
  const err = validate()
  if (err) {
    toast.add({ title: 'Validation failed', description: err, color: 'error' })
    return
  }
  if (isSubmitting.value) return
  isSubmitting.value = true
  try {
    const payload = {
      teacherId: assessment.value.teacherId.trim(),
      title: assessment.value.title.trim(),
      instructions: assessment.value.instructions.trim(),
      rubricId: assessment.value.rubricId.trim(),
      supplementaryLinks: getSupplementaryLinks(),
    }

    if (supplementaryImageFile.value) {
      const formData = new FormData()
      formData.append('teacherId', payload.teacherId)
      formData.append('title', payload.title)
      formData.append('instructions', payload.instructions)
      formData.append('rubricId', payload.rubricId)
      formData.append('supplementaryLinks', JSON.stringify(payload.supplementaryLinks))
      formData.append('supplementaryImage', supplementaryImageFile.value, supplementaryImageFile.value.name)

      await $fetch(`${API_BASE}/api/admin/assessments`, {
        method: 'POST',
        headers: { Authorization: `${useAuthToken().value}` },
        body: formData,
      })
    } else {
      await $fetch(`${API_BASE}/api/admin/assessments`, {
        method: 'POST',
        headers: {
          Authorization: `${useAuthToken().value}`,
          'Content-Type': 'application/json',
        },
        body: payload,
      })
    }

    toast.add({ title: 'Success', description: 'Assessment created.', color: 'success' })
    await navigateTo('/assessments')
  } catch (error: any) {
    console.error('Error creating assessment:', error)
    const responseBody = error?.data ?? error?.response?._data ?? error?.response
    console.error('Response status:', error?.statusCode ?? error?.response?.status)
    console.error('Response body (full):', typeof responseBody === 'object' ? JSON.stringify(responseBody, null, 2) : responseBody)
    toast.add({ title: 'Error', description: 'Failed to create assessment.', color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>

    <UContainer>
        <UPageCard>
            <div class="text-lg font-bold">Create Assessment</div>
            <USeparator />
            <UPageGrid class="mt-4">
                <UForm>
                    <UFormGroup>

                        <UFormField label="Title" name="title" required block class="w-full">

                            <UInput label="Title" name="title" v-model="assessment.title" placeholder="Enter assessment title"
                                class="w-full" />
                        </UFormField>

                        <UFormField label="Assigned Teacher" name="teacher" required class="mt-4">
                            <USelect v-model="assessment.teacherId"
                                placeholder="Select a teacher"
                                :items="teachers"
                                option-attribute="label"
                                value-attribute="value"
                                :loading="teachersPending"
                                class="w-full"
                                />
                        </UFormField>

                        <UFormField label="Instructions" name="instructions" required class="mt-4">
                            <UTextarea v-model="assessment.instructions" placeholder="Enter assessment instructions"
                                class="w-full" />
                        </UFormField>
                    </UFormGroup>
                </UForm>

                <div>
                    
                        <UFormField label="Assign Rubric" name="rubric" required class="">
                            <USelect v-model="assessment.rubricId"
                                placeholder="Select a rubric"
                                :items="rubrics"
                                option-attribute="label"
                                value-attribute="value"
                                :loading="rubricsPending"
                                class="w-full" block
                                />
                        </UFormField>
                        <UFormField label="Supplementary image (optional)" name="sup image" class="mt-4">
                        <input
                            type="file"
                            accept="image/*"
                            class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                            @change="onSupplementaryImageChange"
                        />
                        <p v-if="supplementaryImageFile" class="text-sm text-gray-500 mt-1">{{ supplementaryImageFile.name }}</p>
                    </UFormField>
                </div>
                
                <div>
                    <UFormField label="Supplementary links (optional)"/>
                    <div v-for="(link, index) in supplementaryLinks" :key="link.id" class="flex items-center gap-2 mb-2">
                        <UInput v-model="link.value" placeholder="https://example.com" class="flex-1" />
                        <UButton 
                            @click="removeSupplementaryLink(link.id)" 
                            icon="i-lucide-x" 
                            color="error" 
                            variant="ghost" 
                            :disabled="supplementaryLinks.length <= 1"
                        />
                    </div>
                    <UButton @click="addSupplementaryLink" variant="subtle" icon="i-lucide-square-plus" block>Add new link</UButton>
                </div>

            </UPageGrid>
        </UPageCard>

        <UPageCard class="mt-4">
            <UButton size="lg" icon="i-lucide-circle-check" block :loading="isSubmitting" @click="createAssessment">Finish Creating Assessment</UButton>
        </UPageCard>


    </UContainer>

</template>