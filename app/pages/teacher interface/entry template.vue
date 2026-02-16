
<script lang="ts" setup>
definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

</script>

<template>
<UContainer>
    <UPageCard>
        <!-- "Journal Name" and "Skizzo's" should change depending on journal name and student's first name -->
        <div class="text-lg font-bold">Journal Name: Skizzo's Submission</div> 
        <USeparator />
        <UPageGrid>

            <!-- template for questions -->
            <UPageCard title="Question 1:" description="blah blah blah">
                <USeparator/><div class="flex align-left">
                <div class="font-semibold mr-1">Answer:</div>
                <div class="">test</div></div>
            </UPageCard>
            
        </UPageGrid>
    </UPageCard>
</UContainer>
</template>
