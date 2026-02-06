<script lang="ts" setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'


const fileInput = ref<HTMLInputElement | null>(null)
const uploadedVideoUrl = ref<string | null>(null)

function triggerFileInput() {
  fileInput.value?.click()
}

function onFileSelected(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file || !file.type.startsWith('video/')) return
  if (uploadedVideoUrl.value) {
    URL.revokeObjectURL(uploadedVideoUrl.value)
  }
  uploadedVideoUrl.value = URL.createObjectURL(file)
  target.value = ''
  // Remove attached link when user uploads a file
  attachedLinkUrl.value = null
  videoLink.value = ''
  previewUrl.value = ''
}

onUnmounted(() => {
  if (uploadedVideoUrl.value) {
    URL.revokeObjectURL(uploadedVideoUrl.value)
  }
})

const isAttachLinkModalOpen = ref(false)
const videoLink = ref('')
const previewUrl = ref('')
const attachedLinkUrl = ref<string | null>(null)

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
const groupSubmissionId = computed(() => route.query.id as string)

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

type GroupSubmission = {
  _id?: string
  submissionURL?: string
  submissionType?: string
  assessmentSection?: { 
    assessmentId?: { _id?: string, title?: string } 
    sectionId?: { _id?: string, name?: string }
  }
  [key: string]: unknown
}

// Fetch submission by id, then assessment and teacher in a single async call
const { data, status } = await useAsyncData<AssessmentPageData | null>(
  `assessment-page-${groupSubmissionId.value}`,
  async () => {
    if (!groupSubmissionId.value) return null
    // 1. Fetch the group submission by id
    let assessmentId: string | undefined
    try {
      const submissionResponse: any = await $fetch(`${API_BASE}/api/admin/group-submission/${groupSubmissionId.value}`, {
        headers: { Authorization: `${useAuthToken().value}` },
      })
      const found = submissionResponse?.groupAssessmentSubmission ?? submissionResponse?.data ?? submissionResponse
      assessmentId = found?.assessmentSection?.assessmentId?._id
    } catch (e) {
      console.error('Failed to fetch group submission', e)
      return null
    }
    if (!assessmentId) {
      console.error('Group submission not found or has no assessment:', groupSubmissionId.value)
      return null
    }

    // 2. Fetch the primary assessment details
    const assessmentResponse: any = await $fetch(`${API_BASE}/api/admin/assessments/${assessmentId}`, {
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

    if (assessmentDetail.teacherId?._id) {
      console.log(`[Teacher Fetch] assessment has teacherId: ${assessmentDetail.teacherId._id}. Fetching all teachers.`);
      const teachersResponse: any = await $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/teacher`, {
        headers: { Authorization: `${useAuthToken().value}` },
      });
      console.log('All Teachers API Response:', teachersResponse);

      const allTeachersData = teachersResponse?.data || teachersResponse?.teachers || teachersResponse;
      if (Array.isArray(allTeachersData)) {
        const foundTeacher = allTeachersData.find((t: any) => t._id === assessmentDetail.teacherId._id);
        if (foundTeacher) {
          // Return the combined data if teacher is found
          return { assessment: assessmentDetail, teacher: foundTeacher };
        } else {
          console.error(`Teacher with ID ${assessmentDetail.teacherId._id} not found in the list.`);
        }
      } else {
        console.error('Expected an array of teachers, but got:', allTeachersData);
      }
    }

    // Return assessment data even if teacher is not found or doesn't exist
    return { assessment: assessmentDetail, teacher: null };
  },
  {
    watch: [groupSubmissionId]
  }
);

// Fetch the specific submission by id
const { data: submission, status: submissionStatus } = await useAsyncData<GroupSubmission | null>(
  `group-submission-${groupSubmissionId.value}`,
  async () => {
    if (!groupSubmissionId.value) return null
    try {
      const response: any = await $fetch(`${API_BASE}/api/admin/group-submission/${groupSubmissionId.value}`, {
        headers: { Authorization: `${useAuthToken().value}` }
      })
      return response?.groupAssessmentSubmission ?? response?.data ?? response ?? null
    } catch (e) {
      console.error('Failed to fetch group submission', e)
    }
    return null
  },
  { watch: [groupSubmissionId] }
)

// Computed properties to easily access the nested data in the template
const assessment = computed(() => data.value?.assessment);
const teacher = computed(() => data.value?.teacher);
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

function confirmAttachLink() {
  const url = getEmbedUrl(videoLink.value)
  if (url) {
    attachedLinkUrl.value = url
    if (uploadedVideoUrl.value) {
      URL.revokeObjectURL(uploadedVideoUrl.value)
      uploadedVideoUrl.value = null
    }
  }
  isAttachLinkModalOpen.value = false
  videoLink.value = ''
  previewUrl.value = ''
}

watch(isAttachLinkModalOpen, (isOpen) => {
  if (!isOpen) {
    previewUrl.value = ''
    videoLink.value = ''
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
            <div v-if="submission?.assessmentSection?.sectionId?.name" class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400">
              Section: {{ submission.assessmentSection.sectionId.name }}
            </div>
            <div v-if="teacher" class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400">
              Teacher: {{ teacher.firstName }} {{ teacher.lastName }}
            </div>
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
              <template v-else-if="attachedLinkUrl">
                <iframe :src="attachedLinkUrl"
                  title="Video (attached link)" frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  referrerpolicy="strict-origin-when-cross-origin" allowfullscreen
                  class="w-1/2 aspect-video rounded-lg"></iframe>
              </template>
              <template v-else-if="uploadedVideoUrl">
                <video :src="uploadedVideoUrl" controls class="w-1/2 aspect-video rounded-lg"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></video>
              </template>
              <div v-else class="flex items-center justify-center h-full w-1/2 bg-gray-100 dark:bg-gray-800 rounded-lg" style="aspect-ratio: 16 / 9;">
                <p class="text-gray-500 dark:text-gray-400">No video attached yet</p>
              </div>
            </UContainer>


            <div class="grid grid-cols-3 gap-2 w-full col-span-full">
              <!-- Hidden file input -->
              <input ref="fileInput" type="file" accept="video/*" class="hidden" @change="onFileSelected" />
              <UButton block icon="i-lucide-upload" size="lg" color="primary" variant="solid"
                @click="triggerFileInput" class="w-full">Upload Assessment Video</UButton>
              <UButton block icon="i-lucide-link" size="lg" color="primary" variant="solid"
                @click="isAttachLinkModalOpen = true" class="w-full">Attach Video Link</UButton>
              <div class="min-w-0">
                <UPopover :content="{ align: 'center', side: 'top' }">
                  <UButton block icon="i-lucide-check" size="lg" color="primary" variant="solid" class="w-full">Mark as Live Submission</UButton>
                  <template #content="{ close }">
                    <UPageCard>Are you sure you want to mark this as a live submission?
                      <div class="flex justify-center gap-2">
                        <UButton block>Yes</UButton>
                        <UButton block color="error" @click="close">No</UButton>
                      </div>
                    </UPageCard>
                  </template>
                </UPopover>
              </div>
            </div>

            <div class="w-full col-span-full">
              <UButton
                block
                icon="i-lucide-send"
                size="lg"
                color="primary"
                variant="solid"
                :disabled="!uploadedVideoUrl && !attachedLinkUrl"
                class="w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Video
              </UButton>
            </div>

            <!-- Modal for Attaching Video Link -->
            <UModal title="Attach Video Link" v-model:open="isAttachLinkModalOpen">
              <template #body>

                <UContainer>


                  <div class="space-y-4">
                    <UFormGroup label="Video Link" name="videoLink">
                      <div class="flex items-center gap-2">
                        <UInput v-model="videoLink" placeholder="Paste a YouTube link here" class="flex-1"
                          @keyup.enter="uploadVideoLink" />
                        <UButton @click="uploadVideoLink">Preview</UButton>
                      </div>
                    </UFormGroup>
                  </div>

                  <!-- Video preview above the three buttons (Preview, Cancel, Attach Link) -->
                  <div v-if="previewUrl" class="mb-4">
                    <p class="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Preview</p>
                    <iframe :src="previewUrl" title="Video Preview" frameborder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      referrerpolicy="strict-origin-when-cross-origin" allowfullscreen
                      class="w-full aspect-video rounded-lg"></iframe>
                  </div>

                  <div class="flex justify-end gap-2 mt-4">
                    <UButton variant="outline" @click="isAttachLinkModalOpen = false">Cancel</UButton>
                    <UButton color="primary" @click="confirmAttachLink">Attach Link</UButton>
                  </div>

                </UContainer>
              </template>
            </UModal>

          </UPageGrid>
        </UContainer>
      </UPageCard>

    </template>
    
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load submission details.</p>
    </UPageCard>
  </UContainer>
</template>