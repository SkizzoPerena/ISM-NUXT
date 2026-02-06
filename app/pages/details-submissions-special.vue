<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const fileInput = ref<HTMLInputElement | null>(null);

function triggerFileInput() {
  fileInput.value?.click();
}

const isAttachLinkModalOpen = ref(false)
const videoLink = ref('')
const previewUrl = ref('')

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

const API_BASE = 'https://noteworthy-z9k0.onrender.com'
const route = useRoute()
const specialSubmissionId = computed(() => route.query.id as string)

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
  teacherId: {
    _id: string
    email: string
  }
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

type SpecialSubmission = {
  _id?: string
  submissionURL?: string
  submissionType?: string 
  assessmentStudent?: { 
    assessmentId?: { _id?: string, title?: string } 
    studentId?:{firstName?: string, lastName?:string}
  }
  [key: string]: unknown
}

// Fetch submission by id, then assessment and teacher
const { data, status } = await useAsyncData<AssessmentPageData | null>(
  `assessment-page-${specialSubmissionId.value}`,
  async () => {
    if (!specialSubmissionId.value) return null
    let assessmentId: string | undefined
    try {
      const submissionResponse: any = await $fetch(`${API_BASE}/api/admin/special-submission/${specialSubmissionId.value}`, {
        headers: { Authorization: `${useAuthToken().value}` },
      })
      const found = submissionResponse?.specialAssessmentSubmission ?? submissionResponse?.data ?? submissionResponse
      assessmentId = found?.assessmentStudent?.assessmentId?._id
    } catch (e) {
      console.error('Failed to fetch special submission', e)
      return null
    }
    if (!assessmentId) return null

    const assessmentResponse: any = await $fetch(`${API_BASE}/api/admin/assessments/${assessmentId}`, {
      headers: { Authorization: `${useAuthToken().value}` },
    });
    const assessmentData = assessmentResponse?.assessment || assessmentResponse?.data || assessmentResponse;
    if (!assessmentData) return null;

    let rubric = null;
    if (assessmentData.rubricId) {
      try {
        const rubricResponse: any = await $fetch(`${API_BASE}/api/admin/rubrics/${assessmentData.rubricId}`, {
          headers: { Authorization: `${useAuthToken().value}` },
        });
        rubric = rubricResponse?.rubric || rubricResponse;
      } catch (error) {
        console.error('Error fetching rubric details:', error);
      }
    }

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
      teacherId: assessmentData.teacherId,
      rubric: rubric,
    };

    if (assessmentDetail.teacherId?._id) {
      const teachersResponse: any = await $fetch(`${API_BASE}/api/admin/teacher`, {
        headers: { Authorization: `${useAuthToken().value}` },
      });
      const allTeachersData = teachersResponse?.data || teachersResponse?.teachers || teachersResponse;
      if (Array.isArray(allTeachersData)) {
        const foundTeacher = allTeachersData.find((t: any) => t._id === assessmentDetail.teacherId._id);
        if (foundTeacher) return { assessment: assessmentDetail, teacher: foundTeacher };
      }
    }
    return { assessment: assessmentDetail, teacher: null };
  },
  { watch: [specialSubmissionId] }
);

// Fetch the specific submission by id
const { data: submission, status: submissionStatus } = await useAsyncData<SpecialSubmission | null>(
  `special-submission-${specialSubmissionId.value}`,
  async () => {
    if (!specialSubmissionId.value) return null
    try {
      const response: any = await $fetch(`${API_BASE}/api/admin/special-submission/${specialSubmissionId.value}`, {
        headers: { Authorization: `${useAuthToken().value}` }
      })
      return response?.specialAssessmentSubmission ?? response?.data ?? response ?? null
    } catch (e) {
      console.error('Failed to fetch special submission', e)
    }
    return null
  },
  { watch: [specialSubmissionId] }
)

// Computed properties to easily access the nested data in the template
const assessment = computed(() => data.value?.assessment);
const teacher = computed(() => data.value?.teacher);
const studentName = computed(() => {
  const s = submission.value?.assessmentStudent?.studentId
  if (!s) return ''
  return [s.firstName, s.lastName].filter(Boolean).join(' ') || '—'
});
const submissionUrl = computed(() => {
  if (submission.value?.submissionURL) {
    return getEmbedUrl(submission.value.submissionURL)
  }
  return ''
})

function getEmbedUrl(url: string): string {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    let videoId: string | null = null;
    if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
      videoId = urlObj.searchParams.get('v');
    } else if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.substring(1).split('?')[0] ?? null;
    }
    if (videoId) {
      return `https://www.youtube.com/embed/${videoId}`;
    }
  } catch (e) {
    // Not a valid URL, but might be a raw embed link or something else.
  }
  return url; // Return original URL if it's not a standard YouTube link
}

const uploadVideoLink = () => { previewUrl.value = getEmbedUrl(videoLink.value) }

watch(isAttachLinkModalOpen, (isOpen) => {
  if (!isOpen) {
    previewUrl.value = '';
    videoLink.value = '';
  }
})
</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading assessment details...</p>
    </UPageCard>
    <template v-else-if="assessment && data">
      <UPageCard>
        <UContainer>
          <UPageHeader :title="assessment.title" style="border-bottom: 0; padding-bottom: 0;">
            <div v-if="teacher" class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400">
              Teacher: {{ teacher.firstName }} {{ teacher.lastName }}
            </div>
            <div v-if="studentName" class="text-xl font-medium mt-2">By: {{ studentName }}</div>
            <div class="text-lg mt-2 text-gray-500 dark:text-gray-400">Submitted: {{ new
              Date(assessment.createdAt).toLocaleDateString() }}</div>
          </UPageHeader>
        </UContainer>
      </UPageCard>

      <UPageCard class="mt-8">
        <UContainer>
          <UPageGrid>
            <UContainer class="flex justify-center lg:col-span-3">
              <div v-if="submissionStatus === 'pending'" class="flex items-center justify-center h-full w-1/2 bg-gray-100 dark:bg-gray-800 rounded-lg" style="aspect-ratio: 16 / 9;">
                <p>Loading submission...</p>
              </div>
              <template v-else-if="submissionUrl">
                <iframe :src="submissionUrl"
                  title="YouTube video player" frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerpolicy="strict-origin-when-cross-origin" allowfullscreen
                  class="w-1/2 aspect-video"></iframe>
              </template>
              <div v-else class="flex items-center justify-center h-full w-1/2 bg-gray-100 dark:bg-gray-800 rounded-lg" style="aspect-ratio: 16 / 9;">
                <p class="text-gray-500 dark:text-gray-400">No video attached yet</p>
              </div>
            </UContainer>


            <div>
              <!-- Hidden file input -->
              <input ref="fileInput" type="file" class="hidden" />

              <!-- Visible UButton that triggers the input -->
              <UButton block icon="i-lucide-upload" color="primary" variant="solid" @click="triggerFileInput">Upload
                Assessment Video</UButton>
            </div>

            <UButton block icon="i-lucide-link" size="lg" color="primary" variant="solid"
              @click="isAttachLinkModalOpen = true">Attach Video Link</UButton>

            <!-- Modal for Attaching Video Link -->
            <UModal title="Attach Video Link" v-model:open="isAttachLinkModalOpen">
              <template #body>

                <UContainer>


                  <div class="space-y-4">
                    <UFormGroup label="Video Link" name="videoLink">
                      <div class="flex items-center gap-2">
                        <UInput v-model="videoLink" placeholder="Paste a YouTube link here" class="flex-1"
                          @keyup.enter="uploadVideoLink" />
                        <UButton @click="uploadVideoLink">Upload</UButton>
                      </div>
                    </UFormGroup>

                    <iframe v-if="previewUrl" :src="previewUrl" title="Video Preview" frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerpolicy="strict-origin-when-cross-origin" allowfullscreen
                      class="mt-4 w-full aspect-video rounded-lg"></iframe>
                  </div>


                  <div class="flex justify-end gap-2 mt-4">
                    <UButton variant="outline" @click="isAttachLinkModalOpen = false">Cancel</UButton>
                    <UButton color="primary">Attach Link</UButton>
                  </div>

                </UContainer>
              </template>
            </UModal>

            <!-- Popover for Marking as live submission -->
            <UPopover :content="{
              align: 'center',
              side: 'top',
            }">
              <UButton block icon="i-lucide-check" size="lg" color="primary" variant="solid">Mark as Live Submission
              </UButton>

              <template #content="{ close }">
                <UPageCard>Are you sure you want to mark this as a live submission?
                  <div class="flex justify-center gap-2">
                    <UButton block>Yes</UButton>
                    <UButton block color="error" @click="close">No</UButton>
                  </div>
                </UPageCard>
              </template>
            </UPopover>

          </UPageGrid>
        </UContainer>
      </UPageCard>

    </template>
    
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load submission details.</p>
    </UPageCard>
  </UContainer>
</template>