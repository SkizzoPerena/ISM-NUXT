<script setup lang="ts">
definePageMeta({
  layout: 't-dashboard',
})




// Define a type for the user data to ensure it matches the layout's type
type User = {
  firstName: string;
  lastName: string;
}

// Access the shared 'user' state that was created in the dashboard layout
const user = useState<User | null>('user')


</script>

<template>
  <UContainer class="space-y-6">
    <UPageGrid>
      <UPageCard class="lg:col-span-3 h-40"><UPageHeader :title="`Welcome back, ${user?.firstName || ''}!`" style="border-bottom: 0; margin-top: auto; padding-bottom: 0;"/></UPageCard>

      <UPageCard class="" title="Sections" icon="i-lucide-book-user" orientation="horizontal">
      <UButton to="../teacher-interface/t-sections" block>All Sections</UButton>
      </UPageCard>
      <UPageCard title="Users" icon="i-lucide-users" orientation="horizontal">
        <div>
        <UButton to="../teacher-interface/t-students" block class="mt-4">All Students</UButton>
        </div>
      </UPageCard>

      <UPageCard title="Materials" icon="i-lucide-book-open-text" orientation="horizontal">
        <div><UButton to="../teacher-interface/t-assessments" block >Assessments</UButton>
        <UButton to="../teacher-interface/t-journals" block class="mt-4">Journals</UButton>
        <UButton to="../teacher-interface/t-rubrics" block class="mt-4">Rubrics</UButton>
        </div>
      </UPageCard>
    </UPageGrid>

    <div class="w-full">

    </div>

  </UContainer>

</template>