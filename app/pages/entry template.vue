
<script lang="ts" setup>
definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

</script>

<template>
<UContainer>
    <UPageCard>
        <div class="text-lg font-bold">Journal Name: Skizzo's Submission</div>
        <USeparator />
        <UPageGrid>
            <UPageCard title="Question 1:" description="blah blah blah">
                <USeparator/><div class="flex align-left">
                <div class="font-semibold mr-1">Answer:</div>
                <div class="">test</div></div>
            </UPageCard>
            
        </UPageGrid>
    </UPageCard>
</UContainer>
</template>
