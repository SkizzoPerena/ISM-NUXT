
<script lang="ts" setup>
import { computed, onMounted, ref } from 'vue'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'
const toast = useToast()
const route = useRoute()
const journalEntryId = computed(() => route.query.id as string)

onMounted(() => {
  if (!journalEntryId.value) {
    navigateTo('/journals')
  }
})

type JournalQuestion = {
  questionText?: string
  questionType?: string
  choices?: string[]
}

/** ISO 8601 date-time string from API */
type DateTime = string

type JournalEntryResponse = {
  journalEntry?: {
    acknowledged?: boolean
    analysis?: string
    journalSection?: {
      startDate?: DateTime
      endDate?: DateTime
      journalId?: {
        title?: string
        questions?: JournalQuestion[]
      }
    }
    student?: {
      firstName?: string
      lastName?: string
    }
    answers?: Record<string, string>
    entries?: Record<string, string>
  }
}

const { data: journalEntryData, status, refresh: refreshJournalEntry } = await useAsyncData<JournalEntryResponse | null>(
  `journal-entry-${journalEntryId.value}`,
  async () => {
    if (!journalEntryId.value) return null
    try {
      const response = await $fetch(`${API_BASE}/api/admin/journal-entry/${journalEntryId.value}`, {
        headers: { Authorization: `${useAuthToken().value}` },
      }) as JournalEntryResponse
      toast.add({ title: 'Success', description: 'Journal entry loaded.', color: 'success' })
      return response
    } catch (error) {
      console.error('Error loading journal entry:', error)
      toast.add({ title: 'Error', description: 'Failed to load journal entry.', color: 'error' })
      throw error
    }
  },
  { watch: [journalEntryId] }
)

const journalName = computed(() => {
  const entry = journalEntryData.value?.journalEntry
  return entry?.journalSection?.journalId?.title ?? 'Journal Entry'
})

const studentName = computed(() => {
  const student = journalEntryData.value?.journalEntry?.student
  if (!student) return '-'
  const first = student.firstName?.trim() ?? ''
  const last = student.lastName?.trim() ?? ''
  return [first, last].filter(Boolean).join(' ') || '-'
})

function formatDateTime(dt: string | undefined): string {
  if (!dt) return ''
  const d = new Date(dt)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const durationLabel = computed(() => {
  const section = journalEntryData.value?.journalEntry?.journalSection
  const start = formatDateTime(section?.startDate)
  const end = formatDateTime(section?.endDate)
  if (!start && !end) return ''
  if (start && end) return `${start} – ${end}`
  return start || end
})

function formatEntryKey(key: string): string {
  const d = new Date(key)
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }
  return key
}

const answersEntries = computed(() => {
  const entry = journalEntryData.value?.journalEntry
  const answers = entry?.answers && typeof entry.answers === 'object' ? Object.entries(entry.answers) : []
  const entries = entry?.entries && typeof entry.entries === 'object' ? Object.entries(entry.entries) : []
  return { answers, entries }
})

const acknowledged = computed(() => journalEntryData.value?.journalEntry?.acknowledged === true)

const analysisText = computed(() => {
  const s = journalEntryData.value?.journalEntry?.analysis
  return (typeof s === 'string' ? s.trim() : '') || ''
})
const hasAnalysis = computed(() => analysisText.value.length > 0)

const isAnswersModalOpen = ref(false)
const isRepertoireModalOpen = ref(false)
const rubricQuestions = computed(() => journalEntryData.value?.journalEntry?.journalSection?.journalId?.questions ?? [])
const answerInputs = ref<Record<number, string>>({})
function openAnswersModal() {
  const qs = rubricQuestions.value
  const next: Record<number, string> = {}
  for (let i = 0; i < qs.length; i++) next[i] = ''
  answerInputs.value = next
  isAnswersModalOpen.value = true
}
function closeAnswersModal() {
  isAnswersModalOpen.value = false
}

const isAnswersSubmitting = ref(false)
async function submitJournalAnswers() {
  if (!journalEntryId.value || isAnswersSubmitting.value) return
  const qs = rubricQuestions.value
  const answers: Record<string, string> = {}
  qs.forEach((q, i) => {
    const key = q.questionText?.trim() || `Question ${i + 1}`
    answers[key] = (answerInputs.value[i] ?? '').trim()
  })
  isAnswersSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/journal-entry/answers`, {
      method: 'PATCH',
      headers: {
        Authorization: `${useAuthToken().value}`,
        'Content-Type': 'application/json',
      },
      body: { journalEntryId: journalEntryId.value, answers },
    })
    toast.add({ title: 'Success', description: 'Answers saved.', color: 'success' })
    closeAnswersModal()
    await refreshJournalEntry()
  } catch (error) {
    console.error('Error submitting journal answers:', error)
    toast.add({ title: 'Error', description: 'Failed to save answers.', color: 'error' })
  } finally {
    isAnswersSubmitting.value = false
  }
}

const repertoireEntryDate = ref('')
const repertoireEntryText = ref('')

function toDateOnly(d: Date | string | undefined): string {
  if (d == null) return ''
  const date = typeof d === 'string' ? new Date(d) : d
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10)
}

const repertoireDateMin = computed(() => {
  const section = journalEntryData.value?.journalEntry?.journalSection
  return toDateOnly(section?.startDate) || ''
})

const repertoireDateMax = computed(() => {
  const section = journalEntryData.value?.journalEntry?.journalSection
  const end = section?.endDate ? new Date(section.endDate) : null
  const today = new Date()
  if (!end || Number.isNaN(end.getTime())) return toDateOnly(today)
  const useEnd = end.getTime() > today.getTime() ? today : end
  return toDateOnly(useEnd)
})

function openRepertoireModal() {
  const today = new Date()
  const todayStr = toDateOnly(today)
  const min = repertoireDateMin.value
  const max = repertoireDateMax.value
  let defaultDate = todayStr
  if (min && todayStr < min) defaultDate = min
  else if (max && todayStr > max) defaultDate = max
  repertoireEntryDate.value = defaultDate
  repertoireEntryText.value = ''
  isRepertoireModalOpen.value = true
}
function closeRepertoireModal() {
  isRepertoireModalOpen.value = false
}

const isRepertoireSubmitting = ref(false)
async function submitRepertoireEntry() {
  if (!journalEntryId.value || isRepertoireSubmitting.value) return
  const currentEntries = journalEntryData.value?.journalEntry?.entries
  const entriesMap: Record<string, string> =
    currentEntries && typeof currentEntries === 'object'
      ? { ...currentEntries }
      : {}
  const dateKey = repertoireEntryDate.value
  const text = repertoireEntryText.value?.trim() ?? ''
  entriesMap[dateKey] = text
  isRepertoireSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/journal-entry/entries`, {
      method: 'PATCH',
      headers: {
        Authorization: `${useAuthToken().value}`,
        'Content-Type': 'application/json',
      },
      body: { journalEntryId: journalEntryId.value, entries: entriesMap },
    })
    toast.add({ title: 'Success', description: 'Repertoire entry saved.', color: 'success' })
    closeRepertoireModal()
    await refreshJournalEntry()
  } catch (error) {
    console.error('Error saving repertoire entry:', error)
    toast.add({ title: 'Error', description: 'Failed to save repertoire entry.', color: 'error' })
  } finally {
    isRepertoireSubmitting.value = false
  }
}

const isOverrideAnalysisOpen = ref(false)
const overrideAnalysisText = ref('')
const isOverrideSubmitting = ref(false)
function openOverrideAnalysisDialog() {
  overrideAnalysisText.value = analysisText.value
  isOverrideAnalysisOpen.value = true
}
function closeOverrideAnalysisDialog() {
  isOverrideAnalysisOpen.value = false
}

async function submitOverrideAnalysis() {
  if (!journalEntryId.value || isOverrideSubmitting.value) return
  isOverrideSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/journal-entry/${journalEntryId.value}/override`, {
      method: 'PATCH',
      headers: {
        Authorization: `${useAuthToken().value}`,
        'Content-Type': 'application/json',
      },
      body: { analysis: overrideAnalysisText.value },
    })
    toast.add({ title: 'Success', description: 'Analysis overridden.', color: 'success' })
    closeOverrideAnalysisDialog()
    await refreshJournalEntry()
  } catch (error) {
    console.error('Error overriding analysis:', error)
    toast.add({ title: 'Error', description: 'Failed to override analysis.', color: 'error' })
  } finally {
    isOverrideSubmitting.value = false
  }
}

const isAnalysisLoading = ref(false)
async function generateOrRegenerateAnalysis() {
  if (!journalEntryId.value || isAnalysisLoading.value) return
  isAnalysisLoading.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/journal-entry/${journalEntryId.value}/analysis`, {
      method: 'PATCH',
      headers: { Authorization: `${useAuthToken().value}` },
    })
    toast.add({ title: 'Success', description: 'Analysis updated.', color: 'success' })
    await refreshJournalEntry()
  } catch (error) {
    console.error('Error generating analysis:', error)
    toast.add({ title: 'Error', description: 'Failed to generate analysis.', color: 'error' })
  } finally {
    isAnalysisLoading.value = false
  }
}
</script>

<template>
  <UContainer class="max-w-4xl mx-auto">
    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading journal entry...</p>
    </UPageCard>
    <template v-else>
      <UPageCard class="overflow-hidden">
        <div class="text-lg font-bold">{{ journalName }}: {{ studentName }}'s Journal Entry</div>
        <div v-if="durationLabel" class="text-gray-600 dark:text-gray-400">Duration: {{ durationLabel }}</div>
        <USeparator />
        <section class="mt-4">
          <div class="flex items-center gap-2 mb-2">
            <h2 class="text-base font-semibold">Journal Answers</h2>
            <UButton v-if="!hasAnalysis && !acknowledged && !answersEntries.answers.length" icon="i-lucide-plus" size="xs" variant="ghost" aria-label="Add answer" @click="openAnswersModal" />
          </div>
          <UPageGrid v-if="answersEntries.answers.length" class="max-w-full">
            <UPageCard v-for="[key, value] in answersEntries.answers" :key="'answer-' + key" class="my-2 min-w-0">
              <div class="font-semibold wrap-break-words">{{ key }}</div>
              <USeparator />
              <div class="text-gray-600 dark:text-gray-400 text-sm wrap-break-words">{{ value }}</div>
            </UPageCard>
          </UPageGrid>
          <p v-else class="text-sm text-gray-500 dark:text-gray-400">No answers.</p>
        </section>
        <section class="mt-6">
          <div class="flex items-center gap-2 mb-2">
            <h2 class="text-base font-semibold">Repertoire Entries</h2>
            <UButton v-if="!hasAnalysis && !acknowledged" icon="i-lucide-plus" size="xs" variant="ghost" aria-label="Add repertoire entry" @click="openRepertoireModal" />
          </div>
          <UPageGrid v-if="answersEntries.entries.length" class="max-w-full">
            <UPageCard v-for="[key, value] in answersEntries.entries" :key="'entry-' + key" class="my-2 min-w-0">
              <div class="font-semibold wrap-break-words">{{ formatEntryKey(key) }}</div>
              <USeparator/>
              <div class="text-gray-600 dark:text-gray-400 text-sm wrap-break-words">{{ value }}</div>
            </UPageCard>
          </UPageGrid>
          <p v-else class="text-sm text-gray-500 dark:text-gray-400">No repertoire entries.</p>
        </section>
        <USeparator class="my-4" />
        <section>
          <h2 class="text-base font-semibold mb-2">Journal Analysis</h2>
          <template v-if="hasAnalysis">
            <div class="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm whitespace-pre-wrap wrap-break-words mb-3">{{ analysisText }}</div>
            <div class="flex gap-2">
              <UButton :loading="isAnalysisLoading" :disabled="isAnalysisLoading" @click="generateOrRegenerateAnalysis">Regenerate Analysis</UButton>
              <UButton variant="outline" @click="openOverrideAnalysisDialog">Override Analysis</UButton>
            </div>
          </template>
          <template v-else>
            <p v-if="!acknowledged" class="text-sm text-amber-600 dark:text-amber-400">
              This student's guardian has not yet acknowledged this output.
            </p>
            <UButton v-else :loading="isAnalysisLoading" :disabled="isAnalysisLoading" @click="generateOrRegenerateAnalysis">Generate Analysis</UButton>
          </template>
        </section>
      </UPageCard>
    </template>

    <!-- Journal Answers modal (page-wide): rubric questions with inputs -->
    <UModal v-model:open="isAnswersModalOpen" fullscreen>
      <template #header>
        <div class="flex items-center justify-between w-full">
          <h3 class="text-lg font-semibold">Add Journal Answers</h3>
          <UButton icon="i-lucide-x" variant="ghost" color="error" aria-label="Close" @click="closeAnswersModal" />
        </div>
      </template>
      <template #body>
        <div class="space-y-6 p-4 max-w-3xl mx-auto">
          <p v-if="!rubricQuestions.length" class="text-gray-500 dark:text-gray-400">No rubric questions available.</p>
          <div v-for="(q, index) in rubricQuestions" :key="index" class="space-y-2">
            <label class="block font-semibold">{{ q.questionText || `Question ${index + 1}` }}</label>
            <!-- MULTIPLE CHOICE: radio for each choice -->
            <div v-if="q.questionType === 'MULTIPLE CHOICE' && q.choices?.length" class="space-y-2 pl-1">
              <label
                v-for="(choice, ci) in q.choices"
                :key="ci"
                class="flex items-center gap-2 cursor-pointer"
              >
                <input
                  v-model="answerInputs[index]"
                  type="radio"
                  :name="'q-' + index"
                  :value="choice"
                  class="rounded-full border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                />
                <span>{{ choice }}</span>
              </label>
            </div>
            <!-- YES/NO: radio for Yes and No -->
            <div v-else-if="q.questionType === 'YES/NO'" class="space-y-2 pl-1">
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="answerInputs[index]"
                  type="radio"
                  :name="'q-' + index"
                  value="Yes"
                  class="rounded-full border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                />
                <span>Yes</span>
              </label>
              <label class="flex items-center gap-2 cursor-pointer">
                <input
                  v-model="answerInputs[index]"
                  type="radio"
                  :name="'q-' + index"
                  value="No"
                  class="rounded-full border-gray-300 dark:border-gray-600 text-primary focus:ring-primary"
                />
                <span>No</span>
              </label>
            </div>
            <!-- ESSAY or fallback: text area -->
            <UTextarea
              v-else
              v-model="answerInputs[index]"
              :placeholder="q.questionType === 'ESSAY' ? 'Enter your response...' : 'Enter your answer...'"
              class="w-full"
              :rows="q.questionType === 'ESSAY' ? 4 : 2"
            />
          </div>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" :disabled="isAnswersSubmitting" @click="closeAnswersModal">Cancel</UButton>
          <UButton :loading="isAnswersSubmitting" :disabled="isAnswersSubmitting" @click="submitJournalAnswers">Save Answers</UButton>
        </div>
      </template>
    </UModal>

    <!-- Repertoire Entries dialog: date picker + text input -->
    <UModal v-model:open="isRepertoireModalOpen" :ui="{ content: 'overflow-x-hidden max-w-full' }">
      <template #header>
        <h3 class="text-lg font-semibold">Add Repertoire Entry</h3>
      </template>
      <template #body>
        <div class="space-y-4 overflow-x-hidden max-w-full">
          <UFormField label="Date" name="repertoireEntryDate">
            <input
              v-model="repertoireEntryDate"
              type="date"
              :min="repertoireDateMin"
              :max="repertoireDateMax"
              class="w-full max-w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-base"
            />
          </UFormField>
          <UFormField label="Entry" name="repertoireEntry">
            <UTextarea
              v-model="repertoireEntryText"
              placeholder="Enter repertoire entry..."
              class="w-full max-w-full resize-y box-border"
              :rows="4"
            />
          </UFormField>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" :disabled="isRepertoireSubmitting" @click="closeRepertoireModal">Cancel</UButton>
          <UButton :loading="isRepertoireSubmitting" :disabled="isRepertoireSubmitting" @click="submitRepertoireEntry">Save Entry</UButton>
        </div>
      </template>
    </UModal>

    <!-- Override Analysis dialog -->
    <UModal v-model:open="isOverrideAnalysisOpen">
      <template #header>
        <h3 class="text-lg font-semibold">Override Analysis</h3>
      </template>
      <template #body>
        <UFormField label="Analysis" name="overrideAnalysis">
          <UTextarea
            v-model="overrideAnalysisText"
            placeholder="Enter analysis text..."
            class="w-full max-w-full resize-y box-border"
            :rows="8"
          />
        </UFormField>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton variant="outline" :disabled="isOverrideSubmitting" @click="closeOverrideAnalysisDialog">Cancel</UButton>
          <UButton :loading="isOverrideSubmitting" :disabled="isOverrideSubmitting" @click="submitOverrideAnalysis">Save</UButton>
        </div>
      </template>
    </UModal>
  </UContainer>
</template>
