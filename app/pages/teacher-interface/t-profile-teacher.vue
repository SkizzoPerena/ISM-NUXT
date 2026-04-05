<script lang="ts" setup>
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 't-dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

// This is the type for the teacher account, matching the one in t-dashboard.vue
type TeacherAccount = {
  _id: string,
  email: string,
  firstName: string,
  lastName: string,
  profileImageURL: string,
  gender?: string,
}

// Inherit the user state from the dashboard layout
const user = useState<TeacherAccount | null>('user')

// --- Edit Teacher Logic ---
const isEditOpen = ref(false)
const isEditSubmitting = ref(false)
const toast = useToast()

const editState = reactive({
  firstName: '',
  lastName: '',
  email: '',
  gender: '',
})

const genderOptions = ['MALE', 'FEMALE']

type EditSchema = typeof editState

function validateEdit(state: Partial<EditSchema>): FormError[] {
  const errors: FormError[] = []
  if (!state.firstName) errors.push({ name: 'firstName', message: 'Required' })
  if (!state.lastName) errors.push({ name: 'lastName', message: 'Required' })
  if (!state.email) errors.push({ name: 'email', message: 'Required' })
  if (!state.gender) errors.push({ name: 'gender', message: 'Required' })
  return errors
}

function openEditModal() {
  if (!user.value) return
  editState.firstName = user.value.firstName
  editState.lastName = user.value.lastName
  editState.email = user.value.email
  const raw = user.value.gender?.toUpperCase()
  editState.gender = raw === 'FEMALE' ? 'FEMALE' : 'MALE'
  isEditOpen.value = true
}

async function onSubmitEdit(event: FormSubmitEvent<EditSchema>) {
  if (isEditSubmitting.value) return
  isEditSubmitting.value = true
  try {
    const response = await $fetch<{ teacher: TeacherAccount }>(`${API_BASE}/api/teacher/account`, {
      method: 'PATCH',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
      body: {
        firstName: editState.firstName,
        lastName: editState.lastName,
        email: editState.email,
        gender: editState.gender,
      },
    })

    const updatedTeacher = response.teacher

    // Update the global user state with the response from the API
    if (user.value && updatedTeacher) {
      user.value.firstName = updatedTeacher.firstName
      user.value.lastName = updatedTeacher.lastName
      user.value.email = updatedTeacher.email
      if (updatedTeacher.gender !== undefined) user.value.gender = updatedTeacher.gender
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

// --- Change Password ---
const isChangePasswordOpen = ref(false)
const isChangePasswordSubmitting = ref(false)

const changePasswordState = reactive({
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
})

type ChangePasswordSchema = typeof changePasswordState

function validateChangePassword(state: Partial<ChangePasswordSchema>): FormError[] {
  const errors: FormError[] = []
  if (!state.currentPassword) errors.push({ name: 'currentPassword', message: 'Required' })
  if (!state.newPassword) errors.push({ name: 'newPassword', message: 'Required' })
  if (!state.confirmNewPassword) errors.push({ name: 'confirmNewPassword', message: 'Required' })
  if (state.newPassword && state.confirmNewPassword && state.newPassword !== state.confirmNewPassword) {
    errors.push({ name: 'confirmNewPassword', message: 'Passwords do not match' })
  }
  return errors
}

function openChangePasswordModal() {
  changePasswordState.currentPassword = ''
  changePasswordState.newPassword = ''
  changePasswordState.confirmNewPassword = ''
  isChangePasswordOpen.value = true
}

async function onSubmitChangePassword(event: FormSubmitEvent<ChangePasswordSchema>) {
  if (isChangePasswordSubmitting.value) return
  isChangePasswordSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/teacher/account/password`, {
      method: 'PATCH',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
      body: {
        currentPassword: changePasswordState.currentPassword,
        newPassword: changePasswordState.newPassword,
      },
    })
    toast.add({ title: 'Success', description: 'Password updated.', color: 'success' })
    isChangePasswordOpen.value = false
    changePasswordState.currentPassword = ''
    changePasswordState.newPassword = ''
    changePasswordState.confirmNewPassword = ''
  } catch (error) {
    console.error('Error changing password:', error)
    toast.add({ title: 'Error', description: 'Failed to change password.', color: 'error' })
  } finally {
    isChangePasswordSubmitting.value = false
  }
}

// --- Sign Out (same as dashboard nav) ---
const authToken = useAuthToken()

function signOut() {
  authToken.value = null
  navigateTo('/login')
}

// --- Profile picture upload ---
const profilePicInputRef = ref<HTMLInputElement | null>(null)
const isProfilePicUploading = ref(false)

const PROFILE_PIC_ACCEPT = 'image/jpeg,image/png'
const PROFILE_PIC_EXT = ['.jpg', '.jpeg', '.png']

function triggerProfilePicInput() {
  if (isProfilePicUploading.value) return
  profilePicInputRef.value?.click()
}

async function onProfilePicSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  const lower = file.name.toLowerCase()
  const isAllowedExt = PROFILE_PIC_EXT.some((ext) => lower.endsWith(ext))
  const isAllowedType = file.type === 'image/jpeg' || file.type === 'image/png'
  if (!isAllowedExt || !isAllowedType) {
    toast.add({ title: 'Invalid file', description: 'Only JPG or PNG images are allowed.', color: 'error' })
    return
  }
  isProfilePicUploading.value = true
  try {
    const formData = new FormData()
    formData.append('profilePicture', file, file.name)

    const response = await $fetch<{ teacher?: TeacherAccount; profileImageURL?: string }>(`${API_BASE}/api/teacher/profile-pic`, {
      method: 'POST',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
      body: formData,
    })
    console.log(response);

    const newUrl = response?.teacher?.profileImageURL ?? response?.profileImageURL
    if (user.value && newUrl) {
      user.value.profileImageURL = newUrl
    } else if (user.value && response?.teacher) {
      user.value.profileImageURL = (response.teacher as TeacherAccount).profileImageURL
    }
    toast.add({ title: 'Success', description: 'Profile picture updated.', color: 'success' })
  } catch (error: any) {
    console.error('Error uploading profile picture:', error)
    const message = error?.data?.message ?? error?.response?._data?.message ?? 'Failed to update profile picture.'
    toast.add({ title: 'Error', description: message, color: 'error' })
  } finally {
    isProfilePicUploading.value = false
  }
}

</script>

<template>
  <UContainer>

    <UPageCard v-if="!user" class="flex items-center justify-center h-64">
      <p>Loading teacher profile...</p>
    </UPageCard>
    <template v-else-if="user">
      <UPageGrid>
        <UPageCard class="lg:col-span-3">
          <div class="flex items-center" >
            <input
              ref="profilePicInputRef"
              type="file"
              accept="image/jpeg,image/png"
              class="hidden"
              aria-hidden="true"
              tabindex="-1"
              @change="onProfilePicSelected"
            >
            <button
              type="button"
              class="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50"
              :disabled="isProfilePicUploading"
              aria-label="Change profile picture"
              @click="triggerProfilePicInput"
            >
              <NuxtImg
                :src="user.profileImageURL || 'https://placehold.co/400x400'"
                :alt="`${user.firstName} ${user.lastName}`"
                width="200"
                height="200"
                fit="cover"
                class="rounded-full block"
              />
              <span
                v-if="isProfilePicUploading"
                class="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 text-white text-sm"
              >
                Uploading…
              </span>
              <span
                v-else
                class="absolute inset-0 flex items-center justify-center rounded-full bg-black/0 hover:bg-black/40 transition-colors text-white text-sm opacity-0 hover:opacity-100"
              >
                Change photo
              </span>
            </button>
            <UContainer class="ml-8 w-full">
              <div class="flex items-start justify-between w-full">
                <UPageHeader :title="`${user.firstName} ${user.lastName}`" style="border-bottom: 0; padding-bottom: 0;">
                  <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="email">{{ user.email }}
                  </div>
                  <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="_id">#{{ user._id }}</div>
                </UPageHeader>

              </div>
            </UContainer>
          </div>
        </UPageCard>



  <UButton block icon="i-lucide-pencil" size="lg" color="primary" variant="solid" @click="openEditModal">
    Edit Account
  </UButton>
    <UButton block icon="i-lucide-shield-user" size="lg" color="primary" variant="solid" @click="openChangePasswordModal">
    Change Password
  </UButton>
  <UButton block icon="i-lucide-log-out" size="lg" color="warning" variant="solid" to="/teacher-interface/t-report-issue">
    Report a Problem
  </UButton>

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

            <UFormField label="Gender" name="gender" required block>
              <USelect
                v-model="editState.gender"
                :items="genderOptions"
                placeholder="Select gender"
                class="w-full"
              />
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

      <!-- Change Password Modal -->
      <UModal v-model:open="isChangePasswordOpen" :dismissible="!isChangePasswordSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Change Password</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isChangePasswordSubmitting"
              @click="isChangePasswordOpen = false"
            />
          </div>
        </template>
        <template #body>
          <UForm :validate="validateChangePassword" :state="changePasswordState" class="space-y-4" @submit="onSubmitChangePassword">
            <UFormField label="Current Password" name="currentPassword" required block>
              <UInput
                v-model="changePasswordState.currentPassword"
                type="password"
                class="w-full"
                placeholder="Current password"
                autocomplete="current-password"
              />
            </UFormField>

            <UFormField label="New Password" name="newPassword" required block>
              <UInput
                v-model="changePasswordState.newPassword"
                type="password"
                class="w-full"
                placeholder="New password"
                autocomplete="new-password"
              />
            </UFormField>

            <UFormField label="Confirm New Password" name="confirmNewPassword" required block>
              <UInput
                v-model="changePasswordState.confirmNewPassword"
                type="password"
                class="w-full"
                placeholder="Confirm new password"
                autocomplete="new-password"
              />
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton type="button" variant="outline" :disabled="isChangePasswordSubmitting" @click="isChangePasswordOpen = false">
                Cancel
              </UButton>
              <UButton type="submit" :loading="isChangePasswordSubmitting" :disabled="isChangePasswordSubmitting">
                Update Password
              </UButton>
            </div>
          </UForm>
        </template>
      </UModal>

    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load teacher profile.</p>
    </UPageCard>
  </UContainer>
</template>
