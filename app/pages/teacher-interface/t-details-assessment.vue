<script lang="ts" setup>
import { ref, watch, computed } from 'vue'
import type { TabsItem, FormError } from '@nuxt/ui'

definePageMeta({
  layout: 't-dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'
const toast = useToast()

// This is the type for the teacher account, matching the one in t-dashboard.vue
type TeacherAccount = {
  _id: string,
  email: string,
  firstName: string,
  lastName: string,
  profileImageURL: string,
}

// Inherit the user state from the dashboard layout
const user = useState<TeacherAccount | null>('user')

const items = [
  {
    label: 'Information',
    slot: 'information' as const
  },
  {
    label: 'Rubrics',
    slot: 'rubrics' as const
  },
] satisfies TabsItem[]

const route = useRoute()
const assessmentId = computed(() => route.query.id as string)

type AssessmentDetail = {
  _id: string
  title: string
  createdAt: string
  instructions: string
  updatedAt: string
  isDeleted: boolean
  rubricId: string
  supplementaryImageURL: string
  supplementaryLinks: string[]
  teacherId: string // The teacher ID is just a string
  rubric: {
    _id: string;
    title: string;
    description: string;
    questions: any[];
  } | null;
}

// Fetch assessment details. The teacher's info is already available globally.
const { data: assessment, status, refresh: refreshAssessment } = await useAsyncData<AssessmentDetail | null>(
  `teacher-assessment-${assessmentId.value}`,
  async () => {
    if (!assessmentId.value) return null

    // 1. Fetch the primary assessment details
    const assessmentResponse: any = await $fetch(`${API_BASE}/api/teacher/assessments/${assessmentId.value}`, {
      headers: { Authorization: `${useAuthToken().value}` },
    });
    console.log('Teacher Assessment API Response:', assessmentResponse);

    const assessmentData = assessmentResponse?.assessment || assessmentResponse?.data || assessmentResponse;
    if (!assessmentData) {
      console.error('Assessment data not found in API response:', assessmentResponse);
      return null;
    }

    // 2. Fetch rubric details based on rubricId
    let rubric = null;
    if (assessmentData.rubricId) {
      try {
        const rubricResponse: any = await $fetch(`${API_BASE}/api/teacher/rubrics/${assessmentData.rubricId}`, {
          headers: { Authorization: `${useAuthToken().value}` },
        });
        console.log('Teacher Rubric API Response:', rubricResponse);
        rubric = rubricResponse?.rubric || rubricResponse;
      } catch (error) {
        console.error('Error fetching rubric details:', error);
      }
    }

    // Shape the assessment data into our desired type
    return {
      _id: assessmentData._id,
      title: assessmentData.title,
      createdAt: assessmentData.createdAt,
      instructions: assessmentData.instructions,
      updatedAt: assessmentData.updatedAt,
      isDeleted: assessmentData.isDeleted,
      rubricId: assessmentData.rubricId,
      supplementaryImageURL: assessmentData.supplementaryImageURL,
      supplementaryLinks: assessmentData.supplementaryLinks || [],
      teacherId: assessmentData.teacherId,
      rubric: rubric,
    };
  },
  {
    watch: [assessmentId]
  }
);

// Data for Edit Modal Selects
type RubricInfo = {
  _id: string;
  title: string;
}

type SupplementaryLink = {
  id: number;
  value: string;
};

const rubrics = ref<{ label: string, value: string }[]>([]);
const { data: rubricData, pending: rubricsPending } = useAsyncData(
  'teacher-rubrics-for-edit',
  () => $fetch(`${API_BASE}/api/teacher/rubrics`, {
    headers: { Authorization: `${useAuthToken().value}` }
  }),
  {
    transform: (response: any): RubricInfo[] => {
      const rubricList = response?.data || response?.rubrics || response;
      if (!Array.isArray(rubricList)) return [];
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


// EDIT / DELETE LOGIC
const isEditOpen = ref(false)
const isDeleteOpen = ref(false)
const isEditSubmitting = ref(false)
const isDeleteSubmitting = ref(false)

const editState = reactive({
  title: '',
  instructions: '',
  rubricId: '',
  supplementaryImageURL: '',
  supplementaryLinks: [] as SupplementaryLink[],
})

const supplementaryImageFile = ref<File | null>(null)
const supplementaryImagePreviewUrl = ref<string | null>(null)

watch(supplementaryImageFile, (newFile) => {
  if (supplementaryImagePreviewUrl.value) {
    URL.revokeObjectURL(supplementaryImagePreviewUrl.value)
    supplementaryImagePreviewUrl.value = null
  }
  supplementaryImagePreviewUrl.value = newFile ? URL.createObjectURL(newFile) : null
}, { immediate: true })

function clearNewSupplementaryImage() {
  supplementaryImageFile.value = null
}

type EditSchema = typeof editState

function validateEdit(state: Partial<EditSchema>): FormError[] {
  const errors: FormError[] = []
  if (!state.title) errors.push({ name: 'title', message: 'Required' })
  if (!state.instructions) errors.push({ name: 'instructions', message: 'Required' })
  if (!state.rubricId) errors.push({ name: 'rubricId', message: 'Required' })
  return errors
}

function openEditModal() {
  if (!assessment.value) return
  const a = assessment.value
  editState.title = a.title
  editState.instructions = a.instructions
  editState.rubricId = a.rubricId || ''
  editState.supplementaryImageURL = a.supplementaryImageURL || ''
  supplementaryImageFile.value = null
  editState.supplementaryLinks = (a.supplementaryLinks || []).map(link => ({
    id: Date.now() + Math.random(),
    value: link
  }))
  if (editState.supplementaryLinks.length === 0) {
    editState.supplementaryLinks.push({ id: Date.now(), value: '' });
  }
  isEditOpen.value = true
}

function addSupplementaryLink() {
  editState.supplementaryLinks.push({ id: Date.now(), value: '' });
}

function removeSupplementaryLink(id: number) {
  if (editState.supplementaryLinks.length > 1) {
    editState.supplementaryLinks = editState.supplementaryLinks.filter(link => link.id !== id);
  }
}

async function onSubmitEdit() {
  if (!assessmentId.value || isEditSubmitting.value) return
  const errors = validateEdit(editState)
  if (errors.length > 0) {
    toast.add({ title: 'Validation failed', description: errors[0]?.message ?? 'Please fix the form errors.', color: 'error' })
    return
  }
  isEditSubmitting.value = true
  try {
    const supplementaryLinksList = editState.supplementaryLinks.map(l => l.value?.trim()).filter((v): v is string => !!v)
    const payload = {
      title: editState.title.trim(),
      instructions: editState.instructions.trim(),
      rubricId: editState.rubricId,
      supplementaryImageURL: editState.supplementaryImageURL.trim(),
      supplementaryLinks: supplementaryLinksList,
    }

    const endpoint = `${API_BASE}/api/teacher/assessments/${assessmentId.value}`

    if (supplementaryImageFile.value) {
      const formData = new FormData()
      formData.append('title', payload.title)
      formData.append('instructions', payload.instructions)
      formData.append('rubricId', payload.rubricId)
      formData.append('supplementaryImageURL', payload.supplementaryImageURL)
      formData.append('supplementaryLinks', JSON.stringify(payload.supplementaryLinks))
      formData.append('supplementaryImage', supplementaryImageFile.value, supplementaryImageFile.value.name)

      await $fetch(endpoint, {
        method: 'PATCH',
        headers: { Authorization: `${useAuthToken().value}` },
        body: formData,
      })
    } else {
      await $fetch(endpoint, {
        method: 'PATCH',
        headers: {
          Authorization: `${useAuthToken().value}`,
          'Content-Type': 'application/json',
        },
        body: payload,
      })
    }

    toast.add({ title: 'Success', description: 'Assessment updated successfully.', color: 'success' })
    isEditOpen.value = false
    await refreshAssessment()
  } catch (error: any) {
    console.error('Error updating assessment:', error)
    const responseBody = error?.data ?? error?.response?._data ?? error?.response
    console.error('Response status:', error?.statusCode ?? error?.response?.status)
    console.error('Response body (full):', typeof responseBody === 'object' ? JSON.stringify(responseBody, null, 2) : responseBody)
    toast.add({ title: 'Error', description: 'Failed to update assessment.', color: 'error' })
  } finally {
    isEditSubmitting.value = false
  }
}

async function onDeleteAssessment() {
  if (!assessmentId.value || isDeleteSubmitting.value) return
  isDeleteSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/teacher/assessments/${assessmentId.value}/archive`, {
      method: 'DELETE',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
    })

    toast.add({ title: 'Archived', description: 'Assessment archived successfully.', color: 'success' })
    isDeleteOpen.value = false
    await navigateTo('/teacher-interface/t-assessments')
  } catch (error) {
    console.error('Error archiving assessment:', error)
    toast.add({ title: 'Error', description: 'Failed to archive assessment.', color: 'error' })
  } finally {
    isDeleteSubmitting.value = false
  }
}
</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading assessment details...</p>
    </UPageCard>
    <template v-else-if="assessment">
      <UPageCard>
        <UContainer>
          <div class="flex items-start justify-between w-full">
            <UPageHeader :title="assessment.title" style="border-bottom: 0; padding-bottom: 0;">
              <div v-if="user" class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400">
                Teacher: {{ user.firstName }} {{ user.lastName }}
              </div>
              <div class="text-lg mt-2 text-gray-500 dark:text-gray-400">Created: {{ new
                Date(assessment.createdAt).toLocaleDateString() }}</div>
            </UPageHeader>
            <div class="flex items-start gap-2">
              <UButton icon="i-lucide-pencil" variant="ghost" aria-label="Edit assessment" @click="openEditModal" />
              <UButton icon="i-lucide-trash-2" color="error" variant="ghost" aria-label="Delete assessment"
                @click="isDeleteOpen = true" />
            </div>
          </div>
        </UContainer>
      </UPageCard>

      <UPageCard class="mt-8">
        <UTabs :items="items" variant="link" :ui="{ trigger: 'grow' }" class="gap-4 w-full">
          <template #information>
            <div class="p-4 space-y-6">
              <div>
                <h3 class="text-lg font-semibold">Instructions</h3>
                <p class="text-gray-900 dark:text-white mt-2">{{ assessment.instructions }}</p>
              </div>
              <template v-if="assessment.supplementaryImageURL?.trim()">
                <div>
                  <h3 class="text-lg font-semibold">Supplementary image</h3>
                  <img
                    :src="assessment.supplementaryImageURL"
                    alt="Supplementary image"
                    class="mt-2 rounded-lg max-w-full max-h-96 object-contain border border-gray-200 dark:border-gray-700"
                  />
                </div>
              </template>
              <template v-if="assessment.supplementaryLinks?.length">
                <div>
                  <h3 class="text-lg font-semibold">Supplementary links</h3>
                  <ul class="mt-2 space-y-2 list-none">
                    <li v-for="(link, index) in assessment.supplementaryLinks.filter((l: string) => l?.trim())" :key="index">
                      <a
                        :href="link.trim()"
                        target="_blank"
                        rel="noopener noreferrer"
                        class="text-primary hover:underline break-all"
                      >
                        {{ link.trim() }}
                      </a>
                    </li>
                  </ul>
                </div>
              </template>
            </div>
          </template>

          <template #rubrics>
            <div class="p-4">
              <div v-if="assessment.rubric">
                <NuxtLink :to="`/teacher-interface/t-details-rubrics?id=${assessment.rubric._id}`"
                  class="text-lg font-semibold text-primary hover:underline">
                  {{ assessment.rubric.title }}
                </NuxtLink>
                <p class="text-gray-900 dark:text-white mt-2">{{ assessment.rubric.description }}</p>
                <!-- Display questions or other rubric details as needed -->
              </div>
              <p v-else>No rubric assigned to this assessment.</p>

            </div>
          </template>
        </UTabs>
      </UPageCard>
    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load assessment details.</p>
    </UPageCard>

    <!-- Edit Assessment Modal -->
    <UModal v-model:open="isEditOpen" :dismissible="false" fullscreen>
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-lg font-semibold">Edit Assessment</h3>
          <UButton icon="i-lucide-x" variant="ghost" color="error" :disabled="isEditSubmitting" @click="isEditOpen = false" />
        </div>
      </template>
      <template #body>
        <UPageGrid>
          <UForm :validate="validateEdit" :state="editState" class="space-y-4">
            <UFormField label="Title" name="title" required block>
              <UInput v-model="editState.title" class="w-full" />
            </UFormField>

            <UFormField label="Instructions" name="instructions" required block>
              <UTextarea v-model="editState.instructions" class="w-full" />
            </UFormField>
          </UForm>

          <div>
            <UFormField label="Assign Rubric" name="rubricId" required block>
              <USelect v-model="editState.rubricId" placeholder="Select a rubric" :items="rubrics"
                option-attribute="label" value-attribute="value" :loading="rubricsPending" class="w-full" />
            </UFormField>
            <UFormField label="Supplementary image (optional)" name="sup image" class="mt-4">
              <div class="space-y-3">
                <UFileUpload
                  v-model="supplementaryImageFile"
                  label="Click or drag to upload image"
                  accept="image/*"
                  class="w-full"
                />
                <div v-if="supplementaryImageFile" class="flex items-center gap-2">
                  <span class="text-sm text-gray-500">{{ supplementaryImageFile.name }}</span>
                </div>
              </div>
            </UFormField>
          </div>

          <div>
            <UFormField label="Supplementary links (optional)" />
            <div v-for="(link) in editState.supplementaryLinks" :key="link.id" class="flex items-center gap-2 mb-2">
              <UInput v-model="link.value" placeholder="https://example.com" class="flex-1" />
              <UButton @click="removeSupplementaryLink(link.id)" icon="i-lucide-x" color="error" variant="ghost"
                :disabled="editState.supplementaryLinks.length <= 1" />
            </div>
            <UButton @click="addSupplementaryLink" variant="subtle" icon="i-lucide-square-plus" block>Add new link
            </UButton>
          </div>
        </UPageGrid>
        <div class="flex justify-end gap-2 pt-4 w-full">
          <UButton type="button" block variant="outline" :disabled="isEditSubmitting" @click="isEditOpen = false">
            Cancel
          </UButton>
          <UButton type="button" block :loading="isEditSubmitting" :disabled="isEditSubmitting" @click="onSubmitEdit">
            Update Assessment
          </UButton>
        </div>
      </template>
    </UModal>

    <!-- Archive Confirmation Modal -->
    <UModal v-model:open="isDeleteOpen" :dismissible="!isDeleteSubmitting">
      <template #header>
        <h3 class="text-lg font-semibold">Archive Assessment</h3>
      </template>
      <template #body>
        <p>Are you sure you want to archive this assessment?</p>
        <div class="flex justify-end gap-2 mt-6">
          <UButton type="button" variant="outline" :disabled="isDeleteSubmitting" @click="isDeleteOpen = false">
            Cancel
          </UButton>
          <UButton color="error" :loading="isDeleteSubmitting" :disabled="isDeleteSubmitting"
            @click="onDeleteAssessment">
            Archive
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>