<script lang="ts" setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'
const fileInput = ref<HTMLInputElement | null>(null)
const uploadedVideoUrl = ref<string | null>(null)
const selectedVideoFile = ref<File | null>(null)

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
  selectedVideoFile.value = file
  uploadedVideoUrl.value = URL.createObjectURL(file)
  target.value = ''
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
  { label: 'Information', slot: 'information' as const },
  { label: 'Rubrics', slot: 'rubrics' as const },
] satisfies TabsItem[]

const route = useRoute()
const toast = useToast()
const specialSubmissionId = computed(() => route.query.id as string)

function getErrorMessage(e: unknown, fallback: string): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data?: { message?: string } }).data
    if (data?.message && typeof data.message === 'string') return data.message
  }
  return fallback
}

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
  teacherId: { _id: string; email: string }
  rubric: { _id: string; title: string; description: string; questions: any[] } | null
}

type TeacherInfo = {
  _id: string
  firstName: string
  lastName: string
  profileImageURL?: string
}

type AssessmentPageData = {
  assessment: AssessmentDetail
  teacher: TeacherInfo | null
}

type SpecialSubmission = {
  _id?: string
  submissionURL?: string
  submissionType?: string
  remarks?: string
  analysis?: string
  rubricAnswers?: Record<string, string>
  assessmentStudent?: {
    assessmentId?: { _id?: string; title?: string }
    studentId?: { firstName?: string; lastName?: string }
  }
  [key: string]: unknown
}

type RubricQuestion = {
  questionText?: string
  questionType?: string
  choices?: string[]
}

const LIKERT_CHOICES = ['Strongly Agree', 'Somewhat Agree', 'Neutral', 'Somewhat Disagree', 'Strongly Disagree']

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
    })
    const assessmentData = assessmentResponse?.assessment || assessmentResponse?.data || assessmentResponse
    if (!assessmentData) return null

    let rubric = null
    if (assessmentData.rubricId) {
      try {
        const rubricResponse: any = await $fetch(`${API_BASE}/api/admin/rubrics/${assessmentData.rubricId}`, {
          headers: { Authorization: `${useAuthToken().value}` },
        })
        rubric = rubricResponse?.rubric || rubricResponse
      } catch (error) {
        console.error('Error fetching rubric details:', error)
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
    }

    if (assessmentDetail.teacherId?._id) {
      const teachersResponse: any = await $fetch(`${API_BASE}/api/admin/teacher`, {
        headers: { Authorization: `${useAuthToken().value}` },
      })
      const allTeachersData = teachersResponse?.data || teachersResponse?.teachers || teachersResponse
      if (Array.isArray(allTeachersData)) {
        const foundTeacher = allTeachersData.find((t: any) => t._id === assessmentDetail.teacherId._id)
        if (foundTeacher) return { assessment: assessmentDetail, teacher: foundTeacher }
      }
    }
    return { assessment: assessmentDetail, teacher: null }
  },
  { watch: [specialSubmissionId] }
)

const { data: submission, status: submissionStatus } = await useAsyncData<SpecialSubmission | null>(
  `special-submission-${specialSubmissionId.value}`,
  async () => {
    if (!specialSubmissionId.value) return null
    try {
      const response: any = await $fetch(`${API_BASE}/api/admin/special-submission/${specialSubmissionId.value}`, {
        headers: { Authorization: `${useAuthToken().value}` },
      })
      return response?.specialAssessmentSubmission ?? response?.data ?? response ?? null
    } catch (e) {
      console.error('Failed to fetch special submission', e)
    }
    return null
  },
  { watch: [specialSubmissionId] }
)

const assessment = computed(() => data.value?.assessment)
const teacher = computed(() => data.value?.teacher)
const assessmentTitle = computed(() =>
  assessment.value?.title ?? submission.value?.assessmentStudent?.assessmentId?.title ?? '—'
)
const titleWithSuffix = computed(() => `${assessmentTitle.value} (Special Assessment)`)
const studentName = computed(() => {
  const s = submission.value?.assessmentStudent?.studentId
  if (!s) return ''
  return [s.firstName, s.lastName].filter(Boolean).join(' ') || '—'
})

const submissionUrl = computed(() => {
  if (submission.value?.submissionURL) return getEmbedUrl(submission.value.submissionURL)
  return ''
})

const isSubmittedState = computed(() => {
  const s = submission.value
  if (!s) return false
  const isLive = s.submissionType === 'LIVE'
  const hasUrl = !!(s.submissionURL && String(s.submissionURL).trim())
  return isLive || hasUrl
})

const showSubmissionActions = computed(() => !isSubmittedState.value)

const rubricQuestions = computed<RubricQuestion[]>(() => {
  const qs = assessment.value?.rubric?.questions
  return Array.isArray(qs) ? qs : []
})

const hasRubricAnswers = computed(() => {
  const answers = submission.value?.rubricAnswers
  if (!answers || typeof answers !== 'object') return false
  return Object.keys(answers).length > 0
})

const showAnswerRubricButton = computed(() => isSubmittedState.value && !hasRubricAnswers.value && rubricQuestions.value.length > 0)

const showRubricQuestionsAndAnswers = computed(() => isSubmittedState.value && hasRubricAnswers.value && rubricQuestions.value.length > 0)

const hasAnalysis = computed(() => {
  const a = submission.value?.analysis
  return !!(a && String(a).trim())
})

const allRubricQuestionsAnswered = computed(() => {
  const questions = rubricQuestions.value
  const answers = rubricFormAnswers.value
  for (const q of questions) {
    const key = getQuestionKey(q)
    if (!key) continue
    const val = answers[key]
    if (val === undefined || String(val).trim() === '') return false
  }
  return questions.length > 0
})

function getQuestionKey(q: RubricQuestion): string {
  return q.questionText ?? ''
}

function getAnswerForQuestion(q: RubricQuestion): string {
  const key = getQuestionKey(q)
  if (!key) return '—'
  return (submission.value?.rubricAnswers as Record<string, string>)?.[key] ?? '—'
}

function getEmbedUrl(url: string): string {
  if (!url) return ''
  try {
    const urlObj = new URL(url)
    let videoId: string | null = null
    if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
      videoId = urlObj.searchParams.get('v')
    } else if (urlObj.hostname.includes('youtu.be')) {
      videoId = urlObj.pathname.substring(1).split('?')[0] ?? null
    }
    if (videoId) return `https://www.youtube.com/embed/${videoId}`
  } catch (e) {}
  return url
}

const uploadVideoLink = () => {
  previewUrl.value = getEmbedUrl(videoLink.value)
}

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

const isSubmittingLink = ref(false)
const isMarkingLive = ref(false)
const uploadProgress = ref(-1)

function uploadFileWithProgress(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    const formData = new FormData()
    formData.append('specialSubmission', file)
    const xhr = new XMLHttpRequest()
    const url = `${API_BASE}/api/admin/special-submission/${specialSubmissionId.value}`
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', useAuthToken().value ?? '')
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) uploadProgress.value = Math.round((e.loaded / e.total) * 100)
    })
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else {
        let message = 'Failed to upload video.'
        try {
          const data = JSON.parse(xhr.responseText)
          if (data?.message) message = data.message
        } catch (_) {}
        reject(new Error(message))
      }
    })
    xhr.addEventListener('error', () => reject(new Error('Network error')))
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))
    xhr.send(formData)
  })
}

async function submitVideoLink() {
  if (!specialSubmissionId.value) return
  const url = attachedLinkUrl.value
  const file = selectedVideoFile.value
  if (!url && !file) return
  isSubmittingLink.value = true
  uploadProgress.value = file ? 0 : -1
  try {
    if (file) {
      await uploadFileWithProgress(file)
      if (uploadedVideoUrl.value) {
        URL.revokeObjectURL(uploadedVideoUrl.value)
        uploadedVideoUrl.value = null
      }
      selectedVideoFile.value = null
      toast.add({ title: 'Success', description: 'Video uploaded.', color: 'success' })
    } else if (url) {
      await $fetch(`${API_BASE}/api/admin/special-submission/${specialSubmissionId.value}/link`, {
        method: 'PATCH',
        headers: { Authorization: `${useAuthToken().value}` },
        body: { submissionURL: url },
      })
      attachedLinkUrl.value = null
      toast.add({ title: 'Success', description: 'Video link submitted.', color: 'success' })
    }
    await refreshNuxtData(`special-submission-${specialSubmissionId.value}`)
  } catch (e) {
    console.error('Failed to submit video', e)
    const msg = e instanceof Error ? e.message : getErrorMessage(e, file ? 'Failed to upload video.' : 'Failed to submit video link.')
    toast.add({ title: 'Error', description: msg, color: 'error' })
  } finally {
    isSubmittingLink.value = false
    uploadProgress.value = -1
  }
}

async function markAsLiveSubmission(close: () => void) {
  if (!specialSubmissionId.value) return
  isMarkingLive.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/special-submission/${specialSubmissionId.value}/live`, {
      method: 'PATCH',
      headers: { Authorization: `${useAuthToken().value}` },
    })
    await refreshNuxtData(`special-submission-${specialSubmissionId.value}`)
    close()
    toast.add({ title: 'Success', description: 'Marked as live submission.', color: 'success' })
  } catch (e) {
    console.error('Failed to mark as live submission', e)
    toast.add({ title: 'Error', description: getErrorMessage(e, 'Failed to mark as live submission.'), color: 'error' })
  } finally {
    isMarkingLive.value = false
  }
}

const isRubricDialogOpen = ref(false)
const rubricFormAnswers = ref<Record<string, string>>({})
const isSubmittingRubric = ref(false)

function openRubricDialog() {
  const existing = submission.value?.rubricAnswers && typeof submission.value.rubricAnswers === 'object' ? submission.value.rubricAnswers as Record<string, string> : {}
  const initial: Record<string, string> = {}
  for (const q of rubricQuestions.value) {
    const key = getQuestionKey(q)
    if (key) initial[key] = existing[key] ?? ''
  }
  rubricFormAnswers.value = initial
  isRubricDialogOpen.value = true
}

function setRubricAnswer(key: string, value: string) {
  rubricFormAnswers.value = { ...rubricFormAnswers.value, [key]: value }
}

async function submitRubricAnswers() {
  if (!specialSubmissionId.value) return
  isSubmittingRubric.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/special-submission/${specialSubmissionId.value}`, {
      method: 'PATCH',
      headers: { Authorization: `${useAuthToken().value}` },
      body: { rubricAnswers: rubricFormAnswers.value },
    })
    await refreshNuxtData(`special-submission-${specialSubmissionId.value}`)
    isRubricDialogOpen.value = false
    toast.add({ title: 'Success', description: 'Rubric answers submitted.', color: 'success' })
  } catch (e) {
    console.error('Failed to submit rubric answers', e)
    toast.add({ title: 'Error', description: getErrorMessage(e, 'Failed to submit rubric answers.'), color: 'error' })
  } finally {
    isSubmittingRubric.value = false
  }
}

const isRejectDialogOpen = ref(false)
const rejectReasonInput = ref('')
const isRejecting = ref(false)

function openRejectDialog() {
  rejectReasonInput.value = ''
  isRejectDialogOpen.value = true
}

async function submitReject() {
  if (!specialSubmissionId.value) return
  isRejecting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/special-submission/${specialSubmissionId.value}/reject`, {
      method: 'PATCH',
      headers: { Authorization: `${useAuthToken().value}` },
      body: { remarks: rejectReasonInput.value },
    })
    await refreshNuxtData(`special-submission-${specialSubmissionId.value}`)
    isRejectDialogOpen.value = false
    toast.add({ title: 'Success', description: 'Submission rejected.', color: 'success' })
  } catch (e) {
    console.error('Failed to reject submission', e)
    toast.add({ title: 'Error', description: getErrorMessage(e, 'Failed to reject submission.'), color: 'error' })
  } finally {
    isRejecting.value = false
  }
}

const isGeneratingAnalysis = ref(false)

async function generateAnalysis() {
  if (!specialSubmissionId.value) return
  isGeneratingAnalysis.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/special-submission/${specialSubmissionId.value}/analysis`, {
      method: 'PATCH',
      headers: { Authorization: `${useAuthToken().value}` },
    })
    await refreshNuxtData(`special-submission-${specialSubmissionId.value}`)
    toast.add({ title: 'Success', description: 'Analysis generated.', color: 'success' })
  } catch (e) {
    console.error('Failed to generate analysis', e)
    toast.add({ title: 'Error', description: getErrorMessage(e, 'Failed to generate analysis.'), color: 'error' })
  } finally {
    isGeneratingAnalysis.value = false
  }
}

const isOverrideDialogOpen = ref(false)
const overrideAnalysisInput = ref('')
const isOverridingAnalysis = ref(false)

function openOverrideDialog() {
  overrideAnalysisInput.value = submission.value?.analysis ?? ''
  isOverrideDialogOpen.value = true
}

async function submitOverrideAnalysis() {
  if (!specialSubmissionId.value) return
  isOverridingAnalysis.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/special-submission/${specialSubmissionId.value}/override`, {
      method: 'PATCH',
      headers: { Authorization: `${useAuthToken().value}` },
      body: { analysis: overrideAnalysisInput.value },
    })
    await refreshNuxtData(`special-submission-${specialSubmissionId.value}`)
    isOverrideDialogOpen.value = false
    toast.add({ title: 'Success', description: 'Analysis overridden.', color: 'success' })
  } catch (e) {
    console.error('Failed to override analysis', e)
    toast.add({ title: 'Error', description: getErrorMessage(e, 'Failed to override analysis.'), color: 'error' })
  } finally {
    isOverridingAnalysis.value = false
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
          <UPageHeader :title="titleWithSuffix" style="border-bottom: 0; padding-bottom: 0;">
            <div v-if="teacher" class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400">
              Teacher: {{ teacher.firstName }} {{ teacher.lastName }}
            </div>
            <div v-if="studentName" class="text-xl font-medium mt-2">By: {{ studentName }}</div>
            <div class="text-lg mt-2 text-gray-500 dark:text-gray-400">
              Submitted: {{ new Date(assessment.createdAt).toLocaleDateString() }}
            </div>
          </UPageHeader>
        </UContainer>
      </UPageCard>

      <UPageCard class="mt-8">
        <UContainer>
          <UPageGrid>
            <UContainer class="flex justify-center lg:col-span-3 min-w-0 w-full max-w-full overflow-hidden">
              <div class="w-full max-w-full">
                <div v-if="submissionStatus === 'pending'" class="flex items-center justify-center w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p>Loading submission...</p>
                </div>
                <template v-else-if="isSubmittedState">
                  <iframe v-if="submissionUrl" :src="submissionUrl"
                    title="YouTube video player" frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin" allowfullscreen
                    class="w-full aspect-video rounded-lg max-w-full"></iframe>
                  <div v-else class="flex items-center justify-center w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg">
                    <p class="text-gray-600 dark:text-gray-300 text-lg">This assessment was performed live</p>
                  </div>
                </template>
                <template v-else-if="submissionUrl">
                  <iframe :src="submissionUrl"
                    title="YouTube video player" frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin" allowfullscreen
                    class="w-full aspect-video max-w-full"></iframe>
                </template>
                <template v-else-if="attachedLinkUrl">
                  <iframe :src="attachedLinkUrl"
                    title="Video (attached link)" frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    referrerpolicy="strict-origin-when-cross-origin" allowfullscreen
                    class="w-full aspect-video rounded-lg max-w-full"></iframe>
                </template>
                <template v-else-if="uploadedVideoUrl">
                  <video :src="uploadedVideoUrl" controls class="w-full aspect-video rounded-lg max-w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"></video>
                </template>
                <div v-else class="flex items-center justify-center w-full aspect-video bg-gray-100 dark:bg-gray-800 rounded-lg">
                  <p class="text-gray-500 dark:text-gray-400">No video attached yet</p>
                </div>
              </div>
            </UContainer>

            <div v-if="showAnswerRubricButton" class="w-full col-span-full">
              <UButton block icon="i-lucide-list-checks" size="lg" color="primary" variant="solid" @click="openRubricDialog">
                Answer rubric
              </UButton>
            </div>

            <div v-if="showRubricQuestionsAndAnswers" class="w-full col-span-full space-y-4">
              <UAccordion :items="[{ label: 'Rubric answers', slot: 'rubric-answers' }]">
                <template #rubric-answers>
                  <div class="rounded-lg border border-default p-4 space-y-3">
                    <div v-for="q in rubricQuestions" :key="getQuestionKey(q)" class="border-b border-default pb-3 last:border-0 last:pb-0">
                      <p class="font-medium text-gray-700 dark:text-gray-300">{{ q.questionText ?? '—' }}</p>
                      <p class="text-gray-600 dark:text-gray-400 mt-1">{{ getAnswerForQuestion(q) }}</p>
                    </div>
                  </div>
                </template>
              </UAccordion>

              <UButton
                v-if="!hasAnalysis"
                block
                icon="i-lucide-sparkles"
                size="lg"
                color="primary"
                variant="solid"
                :loading="isGeneratingAnalysis"
                :disabled="isGeneratingAnalysis"
                @click="generateAnalysis"
              >
                Generate Analysis
              </UButton>

              <template v-else>
                <div class="rounded-lg border border-default p-4">
                  <p class="font-semibold text-lg mb-2">Analysis</p>
                  <p class="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{{ submission?.analysis }}</p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <UButton
                    icon="i-lucide-refresh-cw"
                    size="lg"
                    color="primary"
                    variant="solid"
                    :loading="isGeneratingAnalysis"
                    :disabled="isGeneratingAnalysis"
                    @click="generateAnalysis"
                  >
                    Regenerate Analysis
                  </UButton>
                  <UButton
                    icon="i-lucide-edit"
                    size="lg"
                    color="neutral"
                    variant="outline"
                    @click="openOverrideDialog"
                  >
                    Override Analysis
                  </UButton>
                </div>
              </template>
            </div>

            <div v-if="isSubmittedState && !hasRubricAnswers" class="w-full col-span-full">
              <UButton block icon="i-lucide-x-circle" size="lg" color="error" variant="outline" @click="openRejectDialog">
                Reject Submission
              </UButton>
            </div>

            <div v-if="submission?.remarks && String(submission.remarks).trim()" class="w-full col-span-full p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800">
              <p class="text-sm font-medium text-red-800 dark:text-red-200">Rejection Reason:</p>
              <p class="text-red-700 dark:text-red-300 mt-1">{{ submission.remarks }}</p>
            </div>

            <template v-if="showSubmissionActions">
              <div class="grid grid-cols-3 gap-2 w-full col-span-full">
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
                          <UButton block :loading="isMarkingLive" :disabled="isMarkingLive" @click="markAsLiveSubmission(close)">Yes</UButton>
                          <UButton block color="error" :disabled="isMarkingLive" @click="close">No</UButton>
                        </div>
                      </UPageCard>
                    </template>
                  </UPopover>
                </div>
              </div>
              <div v-if="isSubmittingLink && uploadProgress >= 0" class="w-full col-span-full space-y-2">
                <p class="text-sm font-medium text-gray-600 dark:text-gray-400">Uploading video... {{ uploadProgress }}%</p>
                <UProgress :value="uploadProgress" size="sm" class="w-full" />
              </div>
              <div class="w-full col-span-full">
                <UButton
                  block
                  icon="i-lucide-send"
                  size="lg"
                  color="primary"
                  variant="solid"
                  :disabled="(!uploadedVideoUrl && !attachedLinkUrl) || isSubmittingLink"
                  :loading="isSubmittingLink"
                  class="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="submitVideoLink"
                >
                  Submit Video
                </UButton>
              </div>
            </template>
          </UPageGrid>
        </UContainer>
      </UPageCard>

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
              <iframe v-if="previewUrl" :src="previewUrl" title="Video Preview" frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin" allowfullscreen
                class="mt-4 w-full aspect-video rounded-lg"></iframe>
            </div>
            <div class="flex justify-end gap-2 mt-4">
              <UButton variant="outline" @click="isAttachLinkModalOpen = false">Cancel</UButton>
              <UButton color="primary" @click="confirmAttachLink">Attach Link</UButton>
            </div>
          </UContainer>
        </template>
      </UModal>

      <UModal v-model:open="isRejectDialogOpen" title="Reject Submission">
        <template #body>
          <UContainer class="space-y-4">
            <p class="text-gray-600 dark:text-gray-400">Please input why you are rejecting this output.</p>
            <UFormGroup label="Reason" name="rejectReason">
              <UTextarea v-model="rejectReasonInput" placeholder="Enter rejection reason..." :rows="4" />
            </UFormGroup>
            <div class="flex justify-end gap-2">
              <UButton variant="outline" :disabled="isRejecting" @click="isRejectDialogOpen = false">Cancel</UButton>
              <UButton color="error" :loading="isRejecting" :disabled="isRejecting" @click="submitReject">Submit</UButton>
            </div>
          </UContainer>
        </template>
      </UModal>

      <UModal v-model:open="isOverrideDialogOpen" title="Override Analysis">
        <template #body>
          <UContainer class="space-y-4">
            <UFormGroup label="Analysis" name="overrideAnalysis">
              <UTextarea v-model="overrideAnalysisInput" placeholder="Enter analysis text..." :rows="10" class="w-full" />
            </UFormGroup>
            <div class="flex justify-end gap-2">
              <UButton variant="outline" :disabled="isOverridingAnalysis" @click="isOverrideDialogOpen = false">Cancel</UButton>
              <UButton color="primary" :loading="isOverridingAnalysis" :disabled="isOverridingAnalysis" @click="submitOverrideAnalysis">Submit</UButton>
            </div>
          </UContainer>
        </template>
      </UModal>

      <UModal v-model:open="isRubricDialogOpen" title="Answer rubric" :ui="{ content: 'max-w-4xl' }">
        <template #body>
          <UContainer class="space-y-6 max-h-[70vh] overflow-y-auto">
            <div v-for="q in rubricQuestions" :key="getQuestionKey(q)" class="space-y-2">
              <p class="font-medium">{{ q.questionText ?? '—' }}</p>
              <div v-if="(q.questionType || '').toUpperCase() === 'LIKERT SCALE'" class="flex flex-wrap gap-2">
                <UButton
                  v-for="choice in LIKERT_CHOICES"
                  :key="choice"
                  :variant="rubricFormAnswers[getQuestionKey(q)] === choice ? 'solid' : 'outline'"
                  size="sm"
                  @click="setRubricAnswer(getQuestionKey(q), choice)"
                >
                  {{ choice }}
                </UButton>
              </div>
              <div v-else-if="(q.questionType || '').toUpperCase() === 'MULTIPLE CHOICE'" class="flex flex-wrap gap-2">
                <UButton
                  v-for="choice in (q.choices || [])"
                  :key="choice"
                  :variant="rubricFormAnswers[getQuestionKey(q)] === choice ? 'solid' : 'outline'"
                  size="sm"
                  @click="setRubricAnswer(getQuestionKey(q), choice)"
                >
                  {{ choice }}
                </UButton>
              </div>
              <div v-else-if="(q.questionType || '').toUpperCase() === 'YES/NO'" class="flex gap-2">
                <UButton
                  :variant="rubricFormAnswers[getQuestionKey(q)] === 'YES' ? 'solid' : 'outline'"
                  @click="setRubricAnswer(getQuestionKey(q), 'YES')"
                >
                  YES
                </UButton>
                <UButton
                  :variant="rubricFormAnswers[getQuestionKey(q)] === 'NO' ? 'solid' : 'outline'"
                  @click="setRubricAnswer(getQuestionKey(q), 'NO')"
                >
                  NO
                </UButton>
              </div>
              <UFormGroup v-else-if="(q.questionType || '').toUpperCase() === 'ENUMERATION'" :label="''">
                <UInput
                  :model-value="rubricFormAnswers[getQuestionKey(q)]"
                  placeholder="10–100 characters"
                  minlength="10"
                  maxlength="100"
                  @update:model-value="(v: string) => setRubricAnswer(getQuestionKey(q), v ?? '')"
                />
                <p class="text-xs text-gray-500 dark:text-gray-400 mt-1">10–100 characters</p>
              </UFormGroup>
              <p v-else class="text-sm text-gray-500">Unknown question type: {{ q.questionType }}</p>
            </div>
            <div class="flex justify-end gap-2 pt-4">
              <UButton variant="outline" @click="isRubricDialogOpen = false">Cancel</UButton>
              <UButton
                color="primary"
                :loading="isSubmittingRubric"
                :disabled="!allRubricQuestionsAnswered || isSubmittingRubric"
                @click="submitRubricAnswers"
              >
                Submit
              </UButton>
            </div>
          </UContainer>
        </template>
      </UModal>
    </template>

    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load submission details.</p>
    </UPageCard>
  </UContainer>
</template>
