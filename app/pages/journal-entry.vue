
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
    journalSection?: {
      journalId?: {
        title?: string
      }
    }
    student?: {
      firstName?: string
      lastName?: string
    }
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
</script>

<template>
  <UContainer>
    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading journal entry...</p>
    </UPageCard>
    <template v-else>
      <UPageCard>
        <div class="text-lg font-bold">Journal Name: {{ journalName }}</div>
        <div class="text-gray-600 dark:text-gray-400 mt-1">By: {{ studentName }}</div>
        <USeparator />
        <UPageGrid>
          <UPageCard title="Question 1:" description="blah blah blah">
            <USeparator />
            <div class="flex align-left">
              <div class="font-semibold mr-1">Answer:</div>
              <div class="">test</div>
            </div>
          </UPageCard>
        </UPageGrid>
      </UPageCard>
    </template>
  </UContainer>
</template>
