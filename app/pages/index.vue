<script setup lang="ts">
definePageMeta({
  layout: 'dashboard',
})

// Define a type for the user data to ensure it matches the layout's type
type User = {
  firstName: string;
  lastName: string;
}

// Access the shared 'user' state that was created in the dashboard layout
const user = useState<User | null>('user')

const cards = ref([
  {
    title: 'Users',
    icon: 'i-lucide-users',
    to: '/students'
  },
  {
    title: 'Sections',
    icon: 'i-lucide-book-user',
    to: '/sections'
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
      <UPageCard class="lg:col-span-3 h-40"><UPageHeader :title="`Welcome back, ${user?.firstName || ''}!`" style="border-bottom: 0; margin-top: auto; padding-bottom: 0;"/></UPageCard>
      <UPageCard class="h-30" v-for="(card, index) in cards" :key="index" v-bind="card"/>
    </UPageGrid>

  </UContainer>

</template>