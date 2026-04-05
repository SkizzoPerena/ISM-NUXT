<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
    layout: 'dashboard',
})

const items = [
    {
        label: 'Pending',
        icon: 'i-lucide-clock-3',
        slot: 'pending' as const,
    },
    {
        label: 'Investigating',
        icon: 'i-lucide-search',
        slot: 'investigating' as const,
    },
    {
        label: 'Closed',
        icon: 'i-lucide-check-circle',
        slot: 'closed' as const,
    },
] satisfies TabsItem[]

const isModalOpen = ref(false)
const statuses = ['Pending', 'Investigating', 'Closed']
const selectedStatus = ref(statuses[0])
</script>

<template>
    <UContainer>
        <UPageCard>
            <div class="flex items-center gap-4">
                <div class="text-lg font-bold">Reported Issues</div>
            </div>
            <UTabs :items="items" variant="link" :ui="{ trigger: 'grow' }" class="gap-4 w-full">
                <template #pending="{ item }">
                    <UPageGrid>
                        <UPageCard>
                            <div>
                                <div class="text-md font-semibold">My videos aren't visible</div>
                                <div class="text-[15px] text-muted mt-2">Submitted by: John Doe, Apr 1, 2026, 7:30 PM
                                </div>

                            </div>
                            <UModal v-model:open="isModalOpen" title="Issue Details">
                                <UButton block @click="isModalOpen = true">More Information</UButton>
                                <template #body>
                                        <div class="space-y-4">
                                            <div class="font-semibold text-lg">My videos aren't visible </div>
                                            <div>
                                                <div class="font-semibold">Description:</div>
                                                <p>The videos I uploaded are not showing up on my profile. I tried
                                                    re-uploading but it still doesn't work.</p>
                                            </div>
                                            <div class="font-semibold">Status: 
                                                <UBadge label="PENDING" color="error" variant="subtle" />
                                            </div>
                                            <div>
                                                <div class="font-semibold">Attachment</div>
                                                <NuxtImg src="https://placehold.co/400x200" alt="attachment placeholder"
                                                    class="mt-2 rounded-md border w-full" fit="cover" />
                                            </div>
                                            <div class="gap-1 flex"><UButton block color="warning">Mark as Ongoing</UButton><UButton block>Mark as Closed</UButton></div>
                                        </div>

                                </template>
                            </UModal>


                        </UPageCard>
                    </UPageGrid>
                </template>
            </UTabs>
        </UPageCard>

    </UContainer>
</template>