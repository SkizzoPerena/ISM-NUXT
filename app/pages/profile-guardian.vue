<script lang="ts" setup>
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

const route = useRoute()
const guardianId = computed(() => route.query.id as string)

// This will be the info for the students linked to the guardian
type StudentInfo = {
  _id: string
  firstName: string
  lastName: string
  profileImageURL: string
}

type GuardianDetail = {
  _id: string
  firstName: string
  lastName: string
  email: string
  gender: string
  profileImageURL: string
}

// Fetch guardian details from the API using the ID from the URL
const { data: guardian, status } = await useAsyncData<GuardianDetail>(
  `guardian-${guardianId.value}`,
  () => $fetch(`${API_BASE}/api/admin/guardian/${guardianId.value}`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('API Response:', response._data)
    }
  }),
  {
    transform: (response: any): GuardianDetail => {
      const guardianData = response.data || response.guardian || response

      return {
        _id: guardianData._id,
        firstName: guardianData.firstName,
        lastName: guardianData.lastName,
        email: guardianData.email,
        gender: guardianData.gender,
        profileImageURL: guardianData.profileImageURL,
      }
    },
    watch: [guardianId]
  }
)

// Fetch assigned students (wards) for the guardian
const { data: students, status: studentsStatus } = await useAsyncData<StudentInfo[]>(
  `guardian-students-${guardianId.value}`,
  () => $fetch(`${API_BASE}/api/admin/student-guardian/${guardianId.value}/students`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      console.log('Students API Response:', response._data)
    }
  }),
  {
    transform: (response: any): StudentInfo[] => {
      const studentData = response.data || response.students || response
      return Array.isArray(studentData) ? studentData.map((s: any) => ({
        _id: s._id,
        firstName: s.firstName,
        lastName: s.lastName,
        profileImageURL: s.profileImageURL,
      })) : []
    },
    watch: [guardianId]
  }
)

// EDIT / DELETE GUARDIAN
const isEditOpen = ref(false)
const isDeleteOpen = ref(false)
const isEditSubmitting = ref(false)
const isDeleteSubmitting = ref(false)

const editState = reactive({
  firstName: '',
  lastName: '',
  email: '',
  gender: '',
})

type EditSchema = typeof editState

function validateEdit(state: Partial<EditSchema>): FormError[] {
  const errors: FormError[] = []
  if (!state.firstName) errors.push({ name: 'firstName', message: 'Required' })
  if (!state.lastName) errors.push({ name: 'lastName', message: 'Required' })
  if (!state.email) errors.push({ name: 'email', message: 'Required' })
  if (!state.gender) errors.push({ name: 'gender', message: 'Required' })
  return errors
}

const genderOptions = ['Male', 'Female']
const toast = useToast()

function openEditModal() {
  if (!guardian.value) return
  editState.firstName = guardian.value.firstName
  editState.lastName = guardian.value.lastName
  editState.email = guardian.value.email
  editState.gender = guardian.value.gender
  isEditOpen.value = true
}

async function onSubmitEdit(event: FormSubmitEvent<EditSchema>) {
  if (!guardianId.value || isEditSubmitting.value) return
  isEditSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/guardian/${guardianId.value}`, {
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

    toast.add({ title: 'Success', description: 'Guardian updated successfully.', color: 'success' })
    isEditOpen.value = false
    await refreshNuxtData(`guardian-${guardianId.value}`)
  } catch (error) {
    console.error('Error updating guardian:', error)
    toast.add({ title: 'Error', description: 'Failed to update guardian.', color: 'error' })
  } finally {
    isEditSubmitting.value = false
  }
}

async function onDeleteGuardian() {
  if (!guardianId.value || isDeleteSubmitting.value) return
  isDeleteSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/guardian/${guardianId.value}`, {
      method: 'DELETE',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
    })

    toast.add({ title: 'Deleted', description: 'Guardian deleted successfully.', color: 'success' })
    isDeleteOpen.value = false
    await navigateTo('/guardians')
  } catch (error) {
    console.error('Error deleting guardian:', error)
    toast.add({ title: 'Error', description: 'Failed to delete guardian.', color: 'error' })
  } finally {
    isDeleteSubmitting.value = false
  }
}

</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading guardian profile...</p>
    </UPageCard>
    <template v-else-if="guardian">
      <UPageCard>
        <div class="flex items-center">
          <NuxtImg :src="guardian.profileImageURL || 'https://placehold.co/400x400'" :alt="`${guardian.firstName} ${guardian.lastName}`" width="200" height="200" class="rounded-full" fit="fill" preload/>
          <UContainer class="ml-8 w-full">
            <div class="flex items-start justify-between w-full">
              <UPageHeader :title="`${guardian.firstName} ${guardian.lastName}`" style="border-bottom: 0; padding-bottom: 0;">
                <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="email">{{ guardian.email }}</div>
                <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="_id">#{{ guardian._id }}</div>
              </UPageHeader>

              <div class="flex items-start gap-2">
                <UButton
                  icon="i-lucide-pencil"
                  variant="ghost"
                  aria-label="Edit guardian"
                  @click="openEditModal"
                />
                <UButton
                  icon="i-lucide-trash"            
                  variant="ghost"
                  aria-label="Delete guardian"
                  @click="isDeleteOpen = true"
                />
              </div>
            </div>
          </UContainer>
        </div>
      </UPageCard>

      <UPageCard class="mt-8" v-if="students && students.length > 0">
        <template #header>
          <h3 class="text-lg font-semibold">Assigned Students</h3>
        </template>

        <div class="space-y-4">
          <div v-for="student in students" :key="student._id" class="flex items-center gap-4">
            <UAvatar :src="student.profileImageURL" :alt="`${student.firstName} ${student.lastName}`" />
            <div>
              <NuxtLink :to="`/profile-student?id=${student._id}`" class="text-primary font-medium hover:underline">
                {{ student.firstName }} {{ student.lastName }}
              </NuxtLink>
            </div>
          </div>
        </div>
      </UPageCard>
      <UPageCard v-else-if="studentsStatus === 'success'" class="mt-8">
        <template #header>
          <h3 class="text-lg font-semibold">Assigned Students</h3>
        </template>
        <p>No wards assigned to this guardian.</p>
      </UPageCard>

      <!-- Edit Guardian Modal -->
      <UModal v-model:open="isEditOpen" :dismissible="!isEditSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Edit Guardian</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isEditSubmitting"
              @click="isEditOpen = false"
            />
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
              <USelect v-model="editState.gender" :items="genderOptions" placeholder="Select gender" class="w-full" />
            </UFormField>

            <div class="flex justify-end gap-2">
              <UButton
                type="button"
                variant="outline"
                :disabled="isEditSubmitting"
                @click="isEditOpen = false"
              >
                Cancel
              </UButton>
              <UButton type="submit" :loading="isEditSubmitting" :disabled="isEditSubmitting">
                Update Guardian
              </UButton>
            </div>
          </UForm>
        </template>
      </UModal>

      <!-- Delete Confirmation Modal -->
      <UModal v-model:open="isDeleteOpen" :dismissible="!isDeleteSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Delete Guardian</h3>
        </template>
        <template #body>
          <p>Are you sure you want to delete this guardian? This action cannot be undone.</p>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              type="button"
              variant="outline"
              :disabled="isDeleteSubmitting"
              @click="isDeleteOpen = false"
            >
              Cancel
            </UButton>
            <UButton
              :loading="isDeleteSubmitting"
              :disabled="isDeleteSubmitting"
              @click="onDeleteGuardian"
            >
              Delete
            </UButton>
          </div>
        </template>
      </UModal>

    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load guardian profile.</p>
    </UPageCard>
  </UContainer>
</template>