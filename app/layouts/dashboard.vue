<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const API_BASE = 'https://noteworthy-z9k0.onrender.com'
const ITEMS_PER_PAGE = 10

const items: NavigationMenuItem[][] = [[{
  label: 'Home',
  icon: 'i-lucide-house',
  to: '/',
}, 
{
  label: 'Sections',
  icon: 'i-lucide-users',
  to: '/sections',

}, 
 {
  label: 'Users',
  icon: 'i-lucide-book-user',
  defaultOpen: true,
  children: [{
    label: 'Teachers',
    to: '/teachers'
  }, {
    label: 'Students',
    to: '/students'
  }, {
    label: 'Guardians',
    to: '/guardians'
  }]
},

{
  label: 'Materials',
  icon: 'i-lucide-book-open-text',
  defaultOpen: true,
  children: [{
    label: 'Assessments',
    to: '/assessments'
  }, {
    label: 'Journals',
    to: '/journals'
  },{
    label: 'Rubrics',
    to: '/rubrics'
  },  {
    label: 'Instruments',
    to: '/instruments'
  },
]
},
], 

[{
  label: 'Feedback',
  icon: 'i-lucide-message-circle',
  to: 'https://github.com/nuxt-ui-templates/dashboard',
  target: '_blank'
}, {
  label: 'Help & Support',
  icon: 'i-lucide-info',
  to: 'https://github.com/nuxt/ui',
  target: '_blank'
}]]


const isNavigatingBack = ref(false)
const router = useRouter()
const nuxtApp = useNuxtApp()
const showBackButton = ref(false)
const isNavigating = ref(false)

nuxtApp.hook('page:start', () => {
  isNavigating.value = true
})

function updateBackButtonState() {
  // window.history.state.back is populated by vue-router and holds the path of the previous page.
  const previousPath = window.history.state.back
  // Show the button only if there's a previous page and it's not the login page.
  showBackButton.value = !!previousPath && previousPath !== '/login'
}

nuxtApp.hook('page:finish', () => {
  isNavigatingBack.value = false
  isNavigating.value = false
  updateBackButtonState()
})

function goBack() {
  isNavigatingBack.value = true
  router.back()
  // The loading state is managed by the `isNavigatingBack` ref. It's set to true here
  // and reset to false by the `page:finish` hook after navigation is complete.
}

// On component mount (client-side), also check the back button state.
onMounted(() => {
  updateBackButtonState()
})

// Get a reference to our global auth token state.
const authToken = useAuthToken()

// Function to handle user sign-out.
async function signOut() {
  authToken.value = null // Clear the token from the state.
}
const toast = useToast()

type AdminAccount = {
  _id: string,
  email: string,
  firstName: string,
  lastName: string,
  profileImageURL: string,
}

// Create a shared state for the user data that will be accessible across all pages using this layout.
const user = useState<AdminAccount | null>('user', () => null)

const { data } = useFetch<{ admin: AdminAccount }>('https://noteworthy-z9k0.onrender.com/api/admin/account', {
  headers: {
    // Attach the authentication token to the request
    Authorization: `${useAuthToken().value}`
  },
  onResponse({ response }) {
    // This runs on a successful response
    if (response.ok) {
      toast.add({ title: 'API response success!', color: 'success' })
    }
  },
  onResponseError({ response }) {
    // This runs on an error response. The error message is typically in response._data.message
    const errorMessage = (response._data as { message?: string })?.message || 'Failed to fetch API response.'
    toast.add({ title: 'Error', description: errorMessage, color: 'error' })
  },
  lazy: true,
})

// When the data from the API is fetched, update the shared 'user' state.
// The `watch` with `immediate: true` ensures this runs on both server and client,
// and handles the lazy-loaded data when it arrives.
watch(data, (newData) => {
  if (newData?.admin) {
    user.value = newData.admin
  }
}, { immediate: true })

const userdropdown = computed(() => [
  // Use optional chaining to safely access properties of the shared `user` state
  // and provide fallback empty strings for display if data is not yet available.
  [
    {
      label: `${user.value?.firstName || ''} ${user.value?.lastName || ''}`,
      avatar: {
        src: user.value?.profileImageURL || ''
      },
      type: 'label'
    }
  ],
  [
    {
      label: 'Profile',
      icon: 'i-lucide-user',
      to: '/profile-admin'
    },

    {
      label: 'Settings',
      icon: 'i-lucide-cog',
    },

  ],
  [
    {
      label: 'Sign out',
      icon: 'i-lucide-log-out',
      onClick: signOut,
      to: '/login'
    },
    
  ]
])

const collapsed = ref(false)

defineShortcuts({
  c: () => collapsed.value = !collapsed.value
})

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
      query: { page: logsPage.value, limit: ITEMS_PER_PAGE },
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
  <UDashboardGroup>

    <!-- Sidebar -->
    <UDashboardSidebar v-model:collapsed="collapsed" collapsible :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <UIcon v-if="!collapsed" class="size-5 text-primary mx-auto" name="i-lucide-brain"/>
        <UIcon v-else name="i-lucide-brain" class="size-5 text-primary mx-auto" />
      </template>

      <template #default="{ collapsed }">


        <UNavigationMenu :collapsed="collapsed" :items="items[0]" orientation="vertical" />

        
      </template>

      <template #footer="{ collapsed }">


        <UDrawer title="Activity Log" :handle="false">

            <UButton block label="Activity Log" variant="outline" color="neutral" size="md" icon="i-lucide-logs"/>

          <template #content>
            <UContainer class="my-5">
      <div class="flex justify-between"><div class="font-semibold text-2xl">Activity Log</div><UButton variant="ghost" icon="i-lucide-x" color="error"></UButton></div>
      <USeparator class="mt-4"/>
      <ul v-if="activityLogs.length" class="divide-y divide-default  border-default overflow-hidden w-full">
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
        <UPagination v-model:page="logsPage" :total="logsTotal" :items-per-page="ITEMS_PER_PAGE"/>
      </div>
</UContainer>

          </template>

</UDrawer>

      </template>
    </UDashboardSidebar>

    <!-- Header Navbar -->
    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar>
          <template #leading>
            <UButton v-if="showBackButton" icon="i-lucide-arrow-left" @click="goBack" :loading="isNavigatingBack" color="neutral" variant="ghost">Go Back</UButton>
          </template>
          
          <template #right>
          <UColorModeButton />
          <UButton to="/" icon="i-lucide-house" color="neutral" variant="ghost" />
          

          <!-- Avatar -->
          <UDropdownMenu :items="userdropdown">
            <UAvatar :src="user?.profileImageURL" :alt="`${user?.firstName || ''} ${user?.lastName || ''}`" class="ml-2" />
          </UDropdownMenu>
          </template>

        </UDashboardNavbar>
        <UProgress v-if="isNavigating" animation="swing" size="2xs"/>
        
      </template>
      <template #body>
        <!-- PER-PAGE CODE STARTS HERE -->

<slot />

        <!-- PER-PAGE CODE ENDS HERE -->
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
