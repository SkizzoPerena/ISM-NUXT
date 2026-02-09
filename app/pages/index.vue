<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'
const ITEMS_PER_PAGE = 20

// Define a type for the user data to ensure it matches the layout's type
type User = {
  firstName: string;
  lastName: string;
}

// Access the shared 'user' state that was created in the dashboard layout
const user = useState<User | null>('user')

// Activity logs
type ActivityLog = {
  _id?: string
  description: string
  timestamp: string
}

const logsPage = ref(1)
const totalLogs = ref(0)

const { data: logsResponse } = await useAsyncData<{ logs: ActivityLog[]; total?: number }>(
  `admin-logs-${logsPage.value}`,
  () =>
    $fetch(`${API_BASE}/api/admin/logs`, {
      query: { page: logsPage.value },
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
    }),
  {
    watch: [logsPage],
    transform: (response: any) => {
      const logs = response?.logs ?? response?.data ?? response
      const list = Array.isArray(logs) ? logs : []
      const total =
        response?.total ??
        (list.length < ITEMS_PER_PAGE
          ? (logsPage.value - 1) * ITEMS_PER_PAGE + list.length
          : logsPage.value * ITEMS_PER_PAGE + 1)
      totalLogs.value = total
      return { logs: list, total }
    },
  }
)

const activityLogs = computed(() => logsResponse.value?.logs ?? [])
const logsTotal = computed(() => logsResponse.value?.total ?? totalLogs.value)

function formatLogTimestamp(ts: string) {
  if (!ts) return '—'
  const d = new Date(ts)
  const date = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  const time = d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit', hour12: true })
  return `${date}, ${time}`
}
</script>

<template>
  <UContainer class="space-y-6">
    <UPageGrid>
      <UPageCard class="lg:col-span-3 h-40"><UPageHeader :title="`Welcome back, ${user?.firstName || ''}!`" style="border-bottom: 0; margin-top: auto; padding-bottom: 0;"/></UPageCard>

      <UPageCard class="" title="Sections" icon="i-lucide-book-user" orientation="horizontal">
      <UButton to="/sections" block>All Sections</UButton>
      </UPageCard>
      <UPageCard title="Users" icon="i-lucide-users" orientation="horizontal">
        <div><UButton to="/students" block >Teachers</UButton>
        <UButton to="/students" block class="mt-4">Students</UButton>
        <UButton to="/students" block class="mt-4">Guardians</UButton>
        </div>
      </UPageCard>

      <UPageCard title="Materials" icon="i-lucide-book-open-text" orientation="horizontal">
        <div><UButton to="/assessments" block >Assessments</UButton>
        <UButton to="/journals" block class="mt-4">Journals</UButton>
        <UButton to="/rubrics" block class="mt-4">Rubrics</UButton>
        <UButton to="/instruments" block class="mt-4">Instruments</UButton>
        </div>
      </UPageCard>
    </UPageGrid>

    <div class="w-full">
      <UPageHeader title="Activity logs" class="mb-4" />
      <ul v-if="activityLogs.length" class="divide-y divide-default border border-default rounded-lg overflow-hidden w-full">
        <li
          v-for="log in activityLogs"
          :key="log._id ?? log.timestamp + log.description"
          class="flex items-start justify-between gap-4 px-4 py-3 text-left w-full"
        >
          <span class="text-default flex-1 min-w-0">{{ log.description }}</span>
          <span class="text-muted text-sm shrink-0">{{ formatLogTimestamp(log.timestamp) }}</span>
        </li>
      </ul>
      <p v-else class="text-muted text-sm">No activity logs yet.</p>
      <div v-if="logsTotal > ITEMS_PER_PAGE" class="flex justify-center pt-2">
        <UPagination v-model:page="logsPage" :total="logsTotal" :items-per-page="ITEMS_PER_PAGE" />
      </div>
    </div>

  </UContainer>

</template>