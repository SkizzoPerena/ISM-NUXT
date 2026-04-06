<script lang="ts" setup>
import type { TabsItem } from '@nuxt/ui'

definePageMeta({
    layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

type Issue = {
    _id?: string
    user: Record<string, any>
    userType: string
    title: string
    description: string
    status: string
    supplementaryURL?: string
}

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

const activeIssue = ref<Issue | null>(null)
const isUpdatingStatus = ref(false)

function openIssue(issue: Issue) {
    activeIssue.value = issue
    isModalOpen.value = true
}

async function setActiveStatus(next: 'PENDING' | 'INVESTIGATING' | 'CLOSED') {
    const issue = activeIssue.value
    if (!issue?._id) {
        toast.add({ title: 'Error', description: 'Missing issue id.', color: 'error' })
        return
    }
    if (isUpdatingStatus.value) return
    isUpdatingStatus.value = true
    try {
        await $fetch(`${API_BASE}/api/admin/issues/${issue._id}/status`, {
            method: 'PATCH',
            headers: {
                Authorization: `${useAuthToken().value}`,
            },
            body: { status: next },
        })
        isModalOpen.value = false
        activeIssue.value = null
        await refreshIssues()
        toast.add({ title: 'Updated', description: `Issue marked as ${next}.`, color: 'success' })
    } catch (err: unknown) {
        const message = (err as any)?.data?.message ?? (err as any)?.message ?? 'Failed to update issue status.'
        toast.add({ title: 'Error', description: message, color: 'error' })
    } finally {
        isUpdatingStatus.value = false
    }
}

function normalizeStatus(raw: string | undefined | null) {
    const v = (raw ?? '').toString().trim().toUpperCase()
    if (v === 'INVESTIGATING') return 'INVESTIGATING'
    if (v === 'CLOSED') return 'CLOSED'
    return 'PENDING'
}

function badgeColor(status: string) {
    const s = normalizeStatus(status)
    if (s === 'CLOSED') return 'success'
    if (s === 'INVESTIGATING') return 'warning'
    return 'error'
}

function issueUserLabel(user: Record<string, any> | null | undefined) {
    if (!user || typeof user !== 'object') return 'Unknown user'
    const first = typeof user.firstName === 'string' ? user.firstName.trim() : ''
    const last = typeof user.lastName === 'string' ? user.lastName.trim() : ''
    const full = `${first} ${last}`.trim()
    const email = typeof user.email === 'string' ? user.email.trim() : ''
    const id = typeof user._id === 'string' ? user._id.trim() : ''
    return full || email || id || 'Unknown user'
}

function getSupplementaryUrl(issue: Issue | null | undefined) {
    const raw = issue?.supplementaryURL
    return typeof raw === 'string' ? raw.trim() : ''
}

function mediaKindFromUrl(url: string): 'image' | 'video' | null {
    const clean = (url || '').trim()
    if (!clean) return null
    const noQuery = clean.split('#')[0]?.split('?')[0] ?? clean
    const lower = noQuery.toLowerCase()
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) return 'image'
    if (lower.endsWith('.mp4') || lower.endsWith('.avi')) return 'video'
    return null
}

const toast = useToast()

const { data: issuesResponse, pending: issuesPending, error: issuesError, refresh: refreshIssues } = await useAsyncData<{ issues: Issue[] }>(
    'admin-issues',
    async () => {
        try {
            const res = await $fetch<any>(`${API_BASE}/api/admin/issues`, {
                method: 'GET',
                headers: {
                    Authorization: `${useAuthToken().value}`,
                },
            })
            const list = res?.issues ?? res?.data ?? res
            return { issues: Array.isArray(list) ? list : [] }
        } catch (err: unknown) {
            const message = (err as any)?.data?.message ?? (err as any)?.message ?? 'Failed to load issues.'
            toast.add({ title: 'Error', description: message, color: 'error' })
            throw err
        }
    },
    {
        lazy: false,
        server: false,
    }
)

const issues = computed(() => issuesResponse.value?.issues ?? [])
const pendingIssues = computed(() => issues.value.filter((i: Issue) => normalizeStatus(i.status) === 'PENDING'))
const investigatingIssues = computed(() => issues.value.filter((i: Issue) => normalizeStatus(i.status) === 'INVESTIGATING'))
const closedIssues = computed(() => issues.value.filter((i: Issue) => normalizeStatus(i.status) === 'CLOSED'))
</script>

<template>
    <UContainer>
        <UPageCard>
            <div class="flex items-center gap-4">
                <div class="text-lg font-bold">Reported Issues</div>
                <UButton
                    class="ml-auto"
                    variant="ghost"
                    icon="i-lucide-refresh-cw"
                    :loading="issuesPending"
                    @click="() => refreshIssues()"
                >
                    Refresh
                </UButton>
            </div>
            <UTabs :items="items" variant="link" :ui="{ trigger: 'grow' }" class="gap-4 w-full">
                <template #pending="{ item }">
                    <UPageGrid>
                        <UPageCard v-if="issuesPending" class="flex items-center justify-center min-h-32">
                            <div class="text-muted">Loading issues…</div>
                        </UPageCard>
                        <UPageCard v-else-if="issuesError" class="space-y-3">
                            <div class="font-semibold">Could not load issues</div>
                            <div class="text-sm text-muted">Please try refreshing.</div>
                            <UButton icon="i-lucide-refresh-cw" @click="() => refreshIssues()">Retry</UButton>
                        </UPageCard>
                        <UPageCard v-else-if="!pendingIssues.length" class="flex items-center justify-center min-h-32">
                            <div class="text-muted">No pending issues.</div>
                        </UPageCard>
                        <UPageCard v-for="issue in pendingIssues" :key="`${issueUserLabel(issue.user)}-${issue.title}-${issue.status}`">
                            <div class="flex items-start justify-between gap-4">
                                <div class="min-w-0">
                                    <div class="text-md font-semibold truncate">{{ issue.title }}</div>
                                    <div class="text-[15px] text-muted mt-2">
                                        Submitted by: {{ issueUserLabel(issue.user) }} ({{ issue.userType }})
                                    </div>
                                </div>
                                <UBadge :label="normalizeStatus(issue.status)" :color="badgeColor(issue.status)" variant="subtle" />
                            </div>
                            <div class="mt-4">
                                <UButton block @click="openIssue(issue)">More Information</UButton>
                            </div>
                        </UPageCard>
                    </UPageGrid>
                </template>

                <template #investigating="{ item }">
                    <UPageGrid>
                        <UPageCard v-if="issuesPending" class="flex items-center justify-center min-h-32">
                            <div class="text-muted">Loading issues…</div>
                        </UPageCard>
                        <UPageCard v-else-if="issuesError" class="space-y-3">
                            <div class="font-semibold">Could not load issues</div>
                            <div class="text-sm text-muted">Please try refreshing.</div>
                            <UButton icon="i-lucide-refresh-cw" @click="() => refreshIssues()">Retry</UButton>
                        </UPageCard>
                        <UPageCard v-else-if="!investigatingIssues.length" class="flex items-center justify-center min-h-32">
                            <div class="text-muted">No investigating issues.</div>
                        </UPageCard>
                        <UPageCard v-for="issue in investigatingIssues" :key="`${issueUserLabel(issue.user)}-${issue.title}-${issue.status}`">
                            <div class="flex items-start justify-between gap-4">
                                <div class="min-w-0">
                                    <div class="text-md font-semibold truncate">{{ issue.title }}</div>
                                    <div class="text-[15px] text-muted mt-2">
                                        Submitted by: {{ issueUserLabel(issue.user) }} ({{ issue.userType }})
                                    </div>
                                </div>
                                <UBadge :label="normalizeStatus(issue.status)" :color="badgeColor(issue.status)" variant="subtle" />
                            </div>
                            <div class="mt-4">
                                <UButton block @click="openIssue(issue)">More Information</UButton>
                            </div>
                        </UPageCard>
                    </UPageGrid>
                </template>

                <template #closed="{ item }">
                    <UPageGrid>
                        <UPageCard v-if="issuesPending" class="flex items-center justify-center min-h-32">
                            <div class="text-muted">Loading issues…</div>
                        </UPageCard>
                        <UPageCard v-else-if="issuesError" class="space-y-3">
                            <div class="font-semibold">Could not load issues</div>
                            <div class="text-sm text-muted">Please try refreshing.</div>
                            <UButton icon="i-lucide-refresh-cw" @click="() => refreshIssues()">Retry</UButton>
                        </UPageCard>
                        <UPageCard v-else-if="!closedIssues.length" class="flex items-center justify-center min-h-32">
                            <div class="text-muted">No closed issues.</div>
                        </UPageCard>
                        <UPageCard v-for="issue in closedIssues" :key="`${issueUserLabel(issue.user)}-${issue.title}-${issue.status}`">
                            <div class="flex items-start justify-between gap-4">
                                <div class="min-w-0">
                                    <div class="text-md font-semibold truncate">{{ issue.title }}</div>
                                    <div class="text-[15px] text-muted mt-2">
                                        Submitted by: {{ issueUserLabel(issue.user) }} ({{ issue.userType }})
                                    </div>
                                </div>
                                <UBadge :label="normalizeStatus(issue.status)" :color="badgeColor(issue.status)" variant="subtle" />
                            </div>
                            <div class="mt-4">
                                <UButton block @click="openIssue(issue)">More Information</UButton>
                            </div>
                        </UPageCard>
                    </UPageGrid>
                </template>
            </UTabs>
        </UPageCard>

        <UModal v-model:open="isModalOpen" title="Issue Details">
            <template #body>
                <div v-if="!activeIssue" class="text-muted">No issue selected.</div>
                <div v-else class="space-y-4">
                    <div class="font-semibold text-lg">{{ activeIssue.title }}</div>
                    <div class="text-sm text-muted">Submitted by: {{ issueUserLabel(activeIssue.user) }} ({{ activeIssue.userType }})</div>
                    <div>
                        <div class="font-semibold">Description:</div>
                        <p class="whitespace-pre-wrap">{{ activeIssue.description }}</p>
                    </div>
                    <div v-if="getSupplementaryUrl(activeIssue)" class="space-y-2">
                        <div class="font-semibold">Supplementary</div>
                        <NuxtImg
                            v-if="mediaKindFromUrl(getSupplementaryUrl(activeIssue)) === 'image'"
                            :src="getSupplementaryUrl(activeIssue)"
                            alt="supplementary attachment"
                            class="rounded-md border w-full"
                            fit="cover"
                        />
                        <video
                            v-else-if="mediaKindFromUrl(getSupplementaryUrl(activeIssue)) === 'video'"
                            class="rounded-md border w-full"
                            controls
                            :src="getSupplementaryUrl(activeIssue)"
                        />
                        <UAlert
                            v-else
                            title="Unsupported attachment type"
                            description="Only .jpg, .jpeg, .png, .mp4, or .avi are supported."
                            color="warning"
                            variant="subtle"
                        />
                    </div>
                    <div v-if="normalizeStatus(activeIssue.status) !== 'CLOSED'" class="flex gap-2">
                        <UButton
                            v-if="normalizeStatus(activeIssue.status) === 'PENDING'"
                            block
                            color="warning"
                            :loading="isUpdatingStatus"
                            :disabled="isUpdatingStatus"
                            @click="setActiveStatus('INVESTIGATING')"
                        >
                            Mark as Investigating
                        </UButton>
                        <UButton
                            v-else-if="normalizeStatus(activeIssue.status) === 'INVESTIGATING'"
                            block
                            color="success"
                            :loading="isUpdatingStatus"
                            :disabled="isUpdatingStatus"
                            @click="setActiveStatus('CLOSED')"
                        >
                            Mark as Closed
                        </UButton>
                    </div>
                    <div class="font-semibold">
                        Status:
                        <UBadge
                            :label="normalizeStatus(activeIssue.status)"
                            :color="badgeColor(activeIssue.status)"
                            variant="subtle"
                            class="ml-2"
                        />
                    </div>
                </div>
            </template>
        </UModal>
    </UContainer>
</template>