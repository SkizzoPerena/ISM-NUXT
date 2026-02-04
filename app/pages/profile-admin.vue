<script lang="ts" setup>
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

// This is the type for the admin account, matching the one in dashboard.vue
type AdminAccount = {
  _id: string,
  email: string,
  firstName: string,
  lastName: string,
  profileImageURL: string,
}

// Inherit the user state from the dashboard layout
const user = useState<AdminAccount | null>('user')

// --- Edit Admin Logic ---
const isEditOpen = ref(false)
const isEditSubmitting = ref(false)
const toast = useToast()

const editState = reactive({
  firstName: '',
  lastName: '',
  email: '',
})

type EditSchema = typeof editState

function validateEdit(state: Partial<EditSchema>): FormError[] {
  const errors: FormError[] = []
  if (!state.firstName) errors.push({ name: 'firstName', message: 'Required' })
  if (!state.lastName) errors.push({ name: 'lastName', message: 'Required' })
  if (!state.email) errors.push({ name: 'email', message: 'Required' })
  return errors
}

function openEditModal() {
  if (!user.value) return
  editState.firstName = user.value.firstName
  editState.lastName = user.value.lastName
  editState.email = user.value.email
  isEditOpen.value = true
}

async function onSubmitEdit(event: FormSubmitEvent<EditSchema>) {
  if (isEditSubmitting.value) return
  isEditSubmitting.value = true
  try {
    const updatedAdmin = await $fetch<AdminAccount>(`${API_BASE}/api/admin/account`, {
      method: 'PATCH',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
      body: {
        firstName: editState.firstName,
        lastName: editState.lastName,
        email: editState.email,
      },
    })

    // Update the global user state with the response from the API
    if (user.value && updatedAdmin) {
      user.value.firstName = updatedAdmin.firstName
      user.value.lastName = updatedAdmin.lastName
      user.value.email = updatedAdmin.email
    }

    toast.add({ title: 'Success', description: 'Profile updated successfully.', color: 'success' })
    isEditOpen.value = false
  } catch (error) {
    console.error('Error updating admin profile:', error)
    toast.add({ title: 'Error', description: 'Failed to update profile.', color: 'error' })
  } finally {
    isEditSubmitting.value = false
  }
}

</script>

<template>
  <UContainer>

    <UPageCard v-if="!user" class="flex items-center justify-center h-64">
      <p>Loading admin profile...</p>
    </UPageCard>
    <template v-else-if="user">
      <UPageGrid>
        <UPageCard class="lg:col-span-3">
          <div class="flex items-center" >
            <NuxtImg :src="user.profileImageURL || 'https://placehold.co/400x400'"
              :alt="`${user.firstName} ${user.lastName}`" width="200" height="200" class="rounded-full"/>
            <UContainer class="ml-8 w-full">
              <div class="flex items-start justify-between w-full">
                <UPageHeader :title="`${user.firstName} ${user.lastName}`" style="border-bottom: 0; padding-bottom: 0;">
                  <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="email">{{ user.email }}
                  </div>
                  <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="_id">#{{ user._id }}</div>
                </UPageHeader>


                <UButton icon="i-lucide-pencil" variant="ghost" aria-label="Edit admin" @click="openEditModal" />

              </div>
            </UContainer>
          </div>
        </UPageCard>



  <UButton block icon="i-lucide-shield-user" size="lg" color="primary" variant="solid">Change Password</UButton>
  <UButton block icon="i-lucide-user-plus" size="lg" color="primary" variant="solid">Create New Admin Account</UButton>
  <UButton block icon="i-lucide-log-out" size="lg" color="warning" variant="solid">Sign out</UButton>

      </UPageGrid>

      <!-- Edit Admin Modal -->
      <UModal v-model:open="isEditOpen" :dismissible="!isEditSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Edit Profile</h3>
            <UButton icon="i-lucide-x" variant="ghost" :disabled="isEditSubmitting" @click="isEditOpen = false" />
          </div>
        </template>
        <template #body>
          <UForm :validate="validateEdit" :state="editState" class="space-y-4" @submit="onSubmitEdit">
            <UFormField label="First Name" name="firstName" required block>
              <UInput v-model="editState.firstName" class="w-full" />
            </UFormField>

            <UFormField label="Last Name" name="lastName" required block>
              <UInput v-model="editState.lastName" class="w-full" />
            </UFormField>

            <UFormField label="Email Address" name="email" required block>
              <UInput v-model="editState.email" type="email" class="w-full" />
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton type="button" variant="outline" :disabled="isEditSubmitting" @click="isEditOpen = false">
                Cancel
              </UButton>
              <UButton type="submit" :loading="isEditSubmitting" :disabled="isEditSubmitting">
                Update Profile
              </UButton>
            </div>
          </UForm>
        </template>
      </UModal>

    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load admin profile.</p>
    </UPageCard>
  </UContainer>
</template>
