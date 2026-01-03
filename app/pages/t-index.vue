<script setup lang="ts">
definePageMeta({
  layout: 't-dashboard',
})
const cards = ref([
  {
    title: 'My Students',
    icon: 'i-lucide-users',
    to: '/students'
  },
  {
    title: 'My Sections',
    icon: 'i-lucide-book-user',
    to: '/section'
  },
  {
    title: 'My Materials',
    icon: 'i-lucide-book-open-text',
  }
])

</script>

<template>
  <UContainer>

    <UPageGrid>
      <UPageCard class="lg:col-span-3 h-40"><UPageHeader title="Welcome back, Teacher Juan!" style="border-bottom: 0; margin-top: auto; padding-bottom: 0;"/></UPageCard>
      <UPageCard class="h-30" v-for="(card, index) in cards" :key="index" v-bind="card"/>
    </UPageGrid>

  </UContainer>

</template>