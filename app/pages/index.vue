<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})
const cards = ref([
  {
    title: 'Users',
    icon: 'i-lucide-users',
  },
  {
    title: 'Sections',
    icon: 'i-lucide-book-user',
  },
  {
    title: 'Materials',
    icon: 'i-lucide-book-open-text',
  }
])

</script>

<template>
  <UContainer>

    <UPageGrid>
      <UPageCard class="lg:col-span-3 h-40"><UPageHeader title="Welcome back, Juan!" style="border-bottom: 0; margin-top: auto; padding-bottom: 0;"/></UPageCard>
      <UPageCard class="h-30" v-for="(card, index) in cards" :key="index" v-bind="card"/>
    </UPageGrid>

  </UContainer>

</template>