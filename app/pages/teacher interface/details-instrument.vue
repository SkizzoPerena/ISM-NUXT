
<script lang="ts" setup>
definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

const route = useRoute()
const instrumentId = computed(() => route.query.id as string)

type InstrumentDetail = {
  _id: string
  instrumentName: string
  description: string
  createdAt: string
}

const { data: instrument, status } = await useAsyncData<InstrumentDetail | null>(
  `instrument-${instrumentId.value}`,
  async () => {
    const response: any = await $fetch(`${API_BASE}/api/admin/instruments/${instrumentId.value}`, {
      headers: { Authorization: `${useAuthToken().value}` },
    });
    console.log('Instrument Detail API Response:', response._data); // Requested console.log
    return response.instrument || response.data || response;
  },
  { watch: [instrumentId] }
)
</script>

<template>
  <UContainer>
    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading instrument details...</p>
    </UPageCard>
    <template v-else-if="instrument">
      <UPageCard>
        <UContainer>
          <UPageHeader :title="instrument.instrumentName" style="border-bottom: 0; padding-bottom: 0;">
            <div class="text-lg mt-2 text-gray-500 dark:text-gray-400">
              Created: {{ new Date(instrument.createdAt).toLocaleDateString() }}
            </div>
          </UPageHeader>
          <p class="mt-4 text-gray-700 dark:text-gray-300">{{ instrument.description }}</p>
        </UContainer>
      </UPageCard>
    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load instrument details.</p>
    </UPageCard>
  </UContainer>
</template>


<style>

</style>