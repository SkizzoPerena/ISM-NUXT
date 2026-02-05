<script lang="ts" setup>
import { ref, watch, nextTick } from 'vue'
import type { TabsItem, FormError, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'
const toast = useToast()

const items = [
  {
    label: 'Information',
    slot: 'information' as const
  },
  {
    label: 'Rubrics', // Changed label to "Rubrics"
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
  teacherId: string | { _id: string; email: string }
  rubric: { // Added rubric property
    _id: string;
    title: string;
    description: string;
    questions: any[];
  } | null;
}

// Define type for fetched teacher details
type TeacherInfo = {
  _id: string;
  firstName: string;
  lastName: string;
  profileImageURL?: string;
}

// Define a combined type for the page data
type AssessmentPageData = {
  assessment: AssessmentDetail;
  teacher: TeacherInfo | null;
}

// Fetch assessment and its associated teacher details in a single, combined async call
const { data, status } = await useAsyncData<AssessmentPageData | null>(
  `assessment-page-${assessmentId.value}`,
  async () => {
    // 1. Fetch the primary assessment details
    const assessmentResponse: any = await $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/assessments/${assessmentId.value}`, {
      headers: { Authorization: `${useAuthToken().value}` },
    });
    console.log('Assessment API Response:', assessmentResponse);

    const assessmentData = assessmentResponse?.assessment || assessmentResponse?.data || assessmentResponse;
    if (!assessmentData) {
      console.error('Assessment data not found in API response:', assessmentResponse);
      return null;
    }

    // Fetch rubric details based on rubricId
    let rubric = null;
    if (assessmentData.rubricId) {
      try {
        const rubricResponse: any = await $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/rubrics/${assessmentData.rubricId}`, {
          headers: { Authorization: `${useAuthToken().value}` },
        });
        console.log('Rubric API Response:', rubricResponse);
        rubric = rubricResponse?.rubric || rubricResponse;
      } catch (error) {
        console.error('Error fetching rubric details:', error);
      }
    }

    // Shape the assessment data into our desired type
    const assessmentDetail: AssessmentDetail = {
      _id: assessmentData._id,
      title: assessmentData.title,
      createdAt: assessmentData.createdAt,
      instructions: assessmentData.instructions,
      updatedAt: assessmentData.updatedAt,
      isDeleted: assessmentData.isDeleted,
      rubricId: assessmentData.rubricId,
      supplementaryImageURL: assessmentData.supplementaryImageURL,
      supplementaryLinks: assessmentData.supplementaryLinks || [],
      teacherId: assessmentData.teacherId, // This is already an object { _id, email }
      rubric: rubric,
    };

    const teacherIdStr = typeof assessmentDetail.teacherId === 'string' ? assessmentDetail.teacherId : assessmentDetail.teacherId?._id
    if (teacherIdStr) {
      console.log(`[Teacher Fetch] assessment has teacherId: ${teacherIdStr}. Fetching all teachers.`);
      const teachersResponse: any = await $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/teacher`, {
        headers: { Authorization: `${useAuthToken().value}` },
      });
      console.log('All Teachers API Response:', teachersResponse);

      const allTeachersData = teachersResponse?.data || teachersResponse?.teachers || teachersResponse;
      if (Array.isArray(allTeachersData)) {
        const foundTeacher = allTeachersData.find((t: any) => t._id === teacherIdStr);
        if (foundTeacher) {
          // Return the combined data if teacher is found
          return { assessment: assessmentDetail, teacher: foundTeacher };
        } else {
          console.error(`Teacher with ID ${teacherIdStr} not found in the list.`);
        }
      } else {
        console.error('Expected an array of teachers, but got:', allTeachersData);
      }
    }

    // Return assessment data even if teacher is not found or doesn't exist
    return { assessment: assessmentDetail, teacher: null };
  },
  {
    // This ensures the data re-fetches if you navigate between assessments without a full page reload
    watch: [assessmentId]
  }
);

// Computed properties to easily access the nested data in the template
const assessment = computed(() => data.value?.assessment);
const teacher = computed(() => data.value?.teacher);

// Data for Edit Modal Selects
type TeacherInfoForSelect = {
  _id: string;
  firstName: string;
  lastName: string;
}

type RubricInfo = {
  _id: string;
  title: string;
}

type SupplementaryLink = {
  id: number;
  value: string;
};

const teachers = ref<{ label: string, value: string }[]>([]);
const { data: teacherData, pending: teachersPending } = useAsyncData(
  'teachers',
  () => $fetch(`${API_BASE}/api/admin/teacher`, {
    headers: { Authorization: `${useAuthToken().value}` }
  }),
  {
    transform: (response: any): TeacherInfoForSelect[] => {
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

const rubrics = ref<{ label: string, value: string }[]>([]);
const { data: rubricData, pending: rubricsPending } = useAsyncData(
  'rubrics',
  () => $fetch(`${API_BASE}/api/admin/rubrics`, {
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
  teacherId: '',
  rubricId: '',
  supplementaryLinks: [] as SupplementaryLink[],
})

type EditSchema = typeof editState

function validateEdit(state: Partial<EditSchema>): FormError[] {
  const errors: FormError[] = []
  if (!state.title) errors.push({ name: 'title', message: 'Required' })
  if (!state.instructions) errors.push({ name: 'instructions', message: 'Required' })
  if (!state.teacherId) errors.push({ name: 'teacherId', message: 'Required' })
  if (!state.rubricId) errors.push({ name: 'rubricId', message: 'Required' })
  return errors
}

function openEditModal() {
  if (!assessment.value) return
  const a = assessment.value
  editState.title = a.title
  editState.instructions = a.instructions
  // Pre-select current teacher: support both object { _id } and string id from API
  const currentTeacherId = typeof a.teacherId === 'string' ? a.teacherId : (a.teacherId?._id ?? '')
  editState.teacherId = currentTeacherId
  editState.rubricId = a.rubricId || ''
  editState.supplementaryLinks = (a.supplementaryLinks || []).map(link => ({
    id: Date.now() + Math.random(),
    value: link
  }))
  if (editState.supplementaryLinks.length === 0) {
    editState.supplementaryLinks.push({ id: Date.now(), value: '' });
  }
  isEditOpen.value = true
  // Ensure USelect sees the value after modal is open (in case items load after)
  nextTick(() => {
    editState.teacherId = currentTeacherId
  })
}

function addSupplementaryLink() {
  editState.supplementaryLinks.push({ id: Date.now(), value: '' });
}

function removeSupplementaryLink(id: number) {
  if (editState.supplementaryLinks.length > 1) {
    editState.supplementaryLinks = editState.supplementaryLinks.filter(link => link.id !== id);
  }
}

async function onSubmitEdit(event: FormSubmitEvent<EditSchema>) {
  if (!assessmentId.value || isEditSubmitting.value) return
  isEditSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/assessments/${assessmentId.value}`, {
      method: 'PATCH',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
      body: {
        title: editState.title,
        instructions: editState.instructions,
        teacherId: editState.teacherId,
        rubricId: editState.rubricId,
        supplementaryLinks: editState.supplementaryLinks.map(l => l.value).filter(Boolean)
      },
    })

    toast.add({ title: 'Success', description: 'Assessment updated successfully.', color: 'success' })
    isEditOpen.value = false
    await refreshNuxtData(`assessment-page-${assessmentId.value}`)
  } catch (error) {
    console.error('Error updating assessment:', error)
    toast.add({ title: 'Error', description: 'Failed to update assessment.', color: 'error' })
  } finally {
    isEditSubmitting.value = false
  }
}

async function onDeleteAssessment() {
  if (!assessmentId.value || isDeleteSubmitting.value) return
  isDeleteSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/assessments/${assessmentId.value}`, {
      method: 'DELETE',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
    })

    toast.add({ title: 'Deleted', description: 'Assessment deleted successfully.', color: 'success' })
    isDeleteOpen.value = false
    await navigateTo('/assessments')
  } catch (error) {
    console.error('Error deleting assessment:', error)
    toast.add({ title: 'Error', description: 'Failed to delete assessment.', color: 'error' })
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
    <template v-else-if="assessment && data">
      <UPageCard>
        <UContainer>
          <div class="flex items-start justify-between w-full">
            <UPageHeader :title="assessment.title" style="border-bottom: 0; padding-bottom: 0;">
              <div v-if="teacher" class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400">
                Teacher: {{ teacher.firstName }} {{ teacher.lastName }}
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
            <div class="p-4">
              <h3 class="text-lg font-semibold">Instructions</h3>
              <p class="text-gray-900 dark:text-white mt-2">{{ assessment.instructions }}</p>
            </div>
          </template>

          <template #rubrics>
            <div class="p-4">
              <div v-if="assessment.rubric">
                <NuxtLink :to="`/details-rubrics?id=${assessment.rubric._id}`"
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
          <UForm :validate="validateEdit" :state="editState" class="space-y-4" @submit="onSubmitEdit">
            <UFormField label="Title" name="title" required block>
              <UInput v-model="editState.title" class="w-full" />
            </UFormField>

            <UFormField label="Assigned Teacher" name="teacherId" required block>
              <USelect v-model="editState.teacherId" placeholder="Select a teacher" :items="teachers"
                option-attribute="label" value-attribute="value" :loading="teachersPending" class="w-full" />
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
                <UFormField label="Supplementary image (optional)" name="sup image" class="mt-4"></UFormField>
                <UFileUpload label="Click or drag to upload image" name="upload image" class="w-full" />
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
          <UButton type="submit" block :loading="isEditSubmitting" :disabled="isEditSubmitting">
            Update Assessment
          </UButton>
        </div>
      </template>

    </UModal>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="isDeleteOpen" :dismissible="!isDeleteSubmitting">
      <template #header>
        <h3 class="text-lg font-semibold">Delete Assessment</h3>
      </template>
      <template #body>
        <p>Are you sure you want to delete this assessment? This action cannot be undone.</p>
        <div class="flex justify-end gap-2 mt-6">
          <UButton type="button" variant="outline" :disabled="isDeleteSubmitting" @click="isDeleteOpen = false">
            Cancel
          </UButton>
          <UButton color="error" :loading="isDeleteSubmitting" :disabled="isDeleteSubmitting"
            @click="onDeleteAssessment">
            Delete
          </UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>