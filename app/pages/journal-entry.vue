
<script lang="ts" setup>
import { computed, onMounted } from 'vue'

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

type JournalEntryResponse = {
  journalEntry?: {
    acknowledged?: boolean
    analysis?: string
    journalSection?: {
      journalId?: {
        title?: string
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

const { data: journalEntryData, status } = await useAsyncData<JournalEntryResponse | null>(
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
</script>

<template>
  <UContainer class="max-w-4xl mx-auto">
    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading journal entry...</p>
    </UPageCard>
    <template v-else>
      <UPageCard class="overflow-hidden">
        <div class="text-lg font-bold">Journal Name: {{ journalName }}</div>
        <div class="text-gray-600 dark:text-gray-400 mt-1">By: {{ studentName }}</div>
        <USeparator />
        <section class="mt-4">
          <h2 class="text-base font-semibold mb-2">Journal Answers</h2>
          <UPageGrid v-if="answersEntries.answers.length" class="max-w-full">
            <UPageCard v-for="[key, value] in answersEntries.answers" :key="'answer-' + key" class="my-2 min-w-0">
              <div class="font-semibold break-words">{{ key }}</div>
              <USeparator class="my-2" />
              <div class="text-gray-600 dark:text-gray-400 text-sm break-words">{{ value }}</div>
            </UPageCard>
          </UPageGrid>
          <p v-else class="text-sm text-gray-500 dark:text-gray-400">No answers.</p>
        </section>
        <section class="mt-6">
          <h2 class="text-base font-semibold mb-2">Repertoire Entries</h2>
          <UPageGrid v-if="answersEntries.entries.length" class="max-w-full">
            <UPageCard v-for="[key, value] in answersEntries.entries" :key="'entry-' + key" class="my-2 min-w-0">
              <div class="font-semibold break-words">{{ formatEntryKey(key) }}</div>
              <USeparator class="my-2" />
              <div class="text-gray-600 dark:text-gray-400 text-sm break-words">{{ value }}</div>
            </UPageCard>
          </UPageGrid>
          <p v-else class="text-sm text-gray-500 dark:text-gray-400">No repertoire entries.</p>
        </section>
        <USeparator class="my-4" />
        <section class="mt-4">
          <h2 class="text-base font-semibold mb-2">Journal Analysis</h2>
          <template v-if="hasAnalysis">
            <div class="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm whitespace-pre-wrap break-words mb-3">{{ analysisText }}</div>
            <div class="flex gap-2">
              <UButton>Regenerate Analysis</UButton>
              <UButton variant="outline">Override Analysis</UButton>
            </div>
          </template>
          <template v-else>
            <p v-if="!acknowledged" class="text-sm text-amber-600 dark:text-amber-400">
              This student's guardian has not yet acknowledged this output.
            </p>
            <UButton v-else>Generate Analysis</UButton>
          </template>
        </section>
      </UPageCard>
    </template>
  </UContainer>
</template>
