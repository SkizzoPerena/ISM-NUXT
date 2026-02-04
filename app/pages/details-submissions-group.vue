<script lang="ts" setup>
import { ref, computed, watch } from 'vue'
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'


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

const route = useRoute()
const assessmentId = computed(() => route.query.id as string)
const sectionId = computed(() => route.query.sectionId as string)

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
  assessmentSection?: { assessmentId?: { _id?: string, title?: string } }
  [key: string]: unknown
}

// Fetch assessment and its associated teacher details in a single, combined async call
const { data, status } = await useAsyncData<AssessmentPageData | null>(
  `assessment-page-${assessmentId.value}`,
  async () => {
    // 1. Fetch the primary assessment details
    const assessmentResponse: any = await $fetch(`${API_BASE}/api/admin/assessments/${assessmentId.value}`, {
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
    // This ensures the data re-fetches if you navigate between assessments without a full page reload
    watch: [assessmentId]
  }
);

// Fetch the specific submission for this assessment within the section
const { data: submission, status: submissionStatus } = await useAsyncData<GroupSubmission | null>(
  `group-submission-${sectionId.value}-${assessmentId.value}`,
  async () => {
    if (!sectionId.value || !assessmentId.value) return null
    try {
      // This endpoint gets all submissions for a section. We need to find the one we want.
      const response: any = await $fetch(`https://noteworthy-z9k0.onrender.com/api/admin/group-submission/section/${sectionId.value}`, {
        headers: { Authorization: `${useAuthToken().value}` }
      })
      const submissions = response?.groupAssessmentSubmissions ?? response?.data ?? response?.groupSubmissions ?? response
      if (Array.isArray(submissions)) {
        // Find the submission that matches our current assessmentId
        const found = submissions.find(s => s.assessmentSection?.assessmentId?._id === assessmentId.value)
        return found || null
      }
    } catch (e) {
      console.error('Failed to fetch group submissions', e)
    }
    return null
  },
  { watch: [sectionId, assessmentId] }
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
            <div class="text-xl font-medium mt-2">By: Skizzo <!-- retrieve student name from API --></div>
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