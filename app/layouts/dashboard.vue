<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

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
  },]
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

const collapsed = ref(false)

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
      icon: 'i-lucide-user'
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

defineShortcuts({
  c: () => collapsed.value = !collapsed.value
})
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
<UNavigationMenu :collapsed="collapsed" :items="items[1]" orientation="vertical" class="mt-auto" />
      </template>
    </UDashboardSidebar>

    <!-- Header Navbar -->
    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar #right #leading>
          <UColorModeButton />
          <UInput class="mr-2" placeholder="Search..." />

          <UButton to="/" icon="i-lucide-house" color="neutral" variant="ghost" />


<UPopover arrow>
    <UChip inset color="error">
            <UButton icon="i-lucide-bell" color="neutral" variant="ghost" />
          </UChip>

  </UPopover>
          

          <!-- Avatar -->
          <UDropdownMenu :items="userdropdown">
            <UAvatar :src="user?.profileImageURL" :alt="`${user?.firstName || ''} ${user?.lastName || ''}`" class="ml-2" />
          </UDropdownMenu>
          

        </UDashboardNavbar>
      </template>
      <template #body>
        <!-- PER-PAGE CODE STARTS HERE -->

<slot />

        <!-- PER-PAGE CODE ENDS HERE -->
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
