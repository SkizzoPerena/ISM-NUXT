<script setup lang="ts">
import type { NavigationMenuItem } from '@nuxt/ui'

const items: NavigationMenuItem[][] = [[{
  label: 'Home',
  icon: 'i-lucide-house',
  to: '/',
}, 
{
  label: 'My Sections',
  icon: 'i-lucide-users',
  to: '/section',

}, 
{
  label: 'My Students',
  icon: 'i-lucide-book-user',
  to: '/students',

}, 

{
  label: 'My Materials',
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

const userdropdown = ref([
  [
    {
      label: 'Juan Dela Cruz',
      avatar: {
        src: 'https://github.com/benjamincanac.png'
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
      click: signOut,
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
            <UAvatar src="https://github.com/benjamincanac.png"  class="ml-2" />
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
