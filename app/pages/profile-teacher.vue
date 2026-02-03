<script lang="ts" setup>
import type { FormError, FormSubmitEvent } from '@nuxt/ui'

definePageMeta({
  layout: 'dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

const route = useRoute()
const teacherId = computed(() => route.query.id as string)

type SectionInfo = {
  _id: string
  name: string
}

type TeacherDetail = {
  _id: string
  firstName: string
  lastName: string
  email: string
  gender: string
  profileImageURL: string
  assignedSections: SectionInfo[]
}

// Fetch teacher details from the API using the ID from the URL
const { data: teacher, status } = await useAsyncData<TeacherDetail>(
  `teacher-${teacherId.value}`,
  () => $fetch(`${API_BASE}/api/admin/teacher/${teacherId.value}`, {
    headers: {
      Authorization: `${useAuthToken().value}`
    },
    onResponse({ response }) {
      // This will log the raw response body.
      // Check your browser's developer console to see the structure of the data.
      console.log('API Response:', response._data)
    }
  }),
  {
    transform: (response: any): TeacherDetail => {
      // The API response for a single item is likely nested under a 'data' or 'teacher' key.
      const teacherData = response.data || response.teacher || response

      // We explicitly map the fields to ensure the 'teacher' object always matches the 'TeacherDetail' type.
      return {
        _id: teacherData._id,
        firstName: teacherData.firstName,
        lastName: teacherData.lastName,
        email: teacherData.email,
        gender: teacherData.gender,
        profileImageURL: teacherData.profileImageURL,
        assignedSections: teacherData.assignedSections || [],
      }
    },
    // This ensures the data re-fetches if you navigate between teachers without a full page reload
    watch: [teacherId]
  }
)

// Fetch all sections (same endpoint as profile-student) for Assign Section dropdown
type SectionOption = { _id: string; name: string }
const { data: allSections } = await useAsyncData<SectionOption[]>(
  'all-sections',
  () => $fetch(`${API_BASE}/api/admin/sections`, {
    headers: { Authorization: `${useAuthToken().value}` }
  }),
  {
    transform: (response: any) => {
      const sectionData = response?.data ?? response?.sections ?? response
      const rows = Array.isArray(sectionData) ? sectionData : []
      return rows.map((s: any) => ({ _id: s._id, name: s.name }))
    }
  }
)

// Assign teacher to section (teacher can have multiple sections)
const isAssignSectionOpen = ref(false)
const assignSectionSelectedId = ref<string | undefined>(undefined)
const isAssignSectionSubmitting = ref(false)

function openAssignSectionModal() {
  isAssignSectionOpen.value = true
  assignSectionSelectedId.value = undefined
}

const assignSectionDropdownItems = computed(() =>
  (allSections.value ?? []).map((s) => ({ label: s.name, value: s._id }))
)

async function confirmAssignSection() {
  if (!teacherId.value || !assignSectionSelectedId.value || isAssignSectionSubmitting.value) return
  isAssignSectionSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/sections/${assignSectionSelectedId.value}/assign-teacher/${teacherId.value}`, {
      method: 'POST',
      headers: { Authorization: `${useAuthToken().value}` }
    })
    toast.add({ title: 'Success', description: 'Teacher assigned to section.', color: 'success' })
    isAssignSectionOpen.value = false
    assignSectionSelectedId.value = undefined
    await refreshNuxtData(`teacher-${teacherId.value}`)
  } catch (error) {
    console.error('Error assigning teacher to section', error)
    toast.add({ title: 'Error', description: 'Failed to assign teacher to section.', color: 'error' })
  } finally {
    isAssignSectionSubmitting.value = false
  }
}

// Unassign teacher from section
const sectionToUnassign = ref<SectionInfo | null>(null)
const isUnassignSectionOpen = ref(false)
const isUnassignSectionSubmitting = ref(false)

function openUnassignSectionConfirm(section: SectionInfo) {
  sectionToUnassign.value = section
  isUnassignSectionOpen.value = true
}

function closeUnassignSectionConfirm() {
  isUnassignSectionOpen.value = false
  sectionToUnassign.value = null
}

async function confirmUnassignSection() {
  if (!teacherId.value || !sectionToUnassign.value || isUnassignSectionSubmitting.value) return
  isUnassignSectionSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/sections/${sectionToUnassign.value._id}/unassign-teacher/${teacherId.value}`, {
      method: 'PATCH',
      headers: { Authorization: `${useAuthToken().value}` }
    })
    toast.add({ title: 'Success', description: 'Teacher removed from section.', color: 'success' })
    closeUnassignSectionConfirm()
    await refreshNuxtData(`teacher-${teacherId.value}`)
  } catch (error) {
    console.error('Error unassigning teacher from section', error)
    toast.add({ title: 'Error', description: 'Failed to remove teacher from section.', color: 'error' })
  } finally {
    isUnassignSectionSubmitting.value = false
  }
}

// EDIT / DELETE TEACHER
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
  if (!teacher.value) return
  editState.firstName = teacher.value.firstName
  editState.lastName = teacher.value.lastName
  editState.email = teacher.value.email
  editState.gender = teacher.value.gender
  isEditOpen.value = true
}

async function onSubmitEdit(event: FormSubmitEvent<EditSchema>) {
  if (!teacherId.value || isEditSubmitting.value) return
  isEditSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/teacher/${teacherId.value}`, {
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

    toast.add({ title: 'Success', description: 'Teacher updated successfully.', color: 'success' })
    isEditOpen.value = false
    await refreshNuxtData(`teacher-${teacherId.value}`)
  } catch (error) {
    console.error('Error updating teacher:', error)
    toast.add({ title: 'Error', description: 'Failed to update teacher.', color: 'error' })
  } finally {
    isEditSubmitting.value = false
  }
}

async function onDeleteTeacher() {
  if (!teacherId.value || isDeleteSubmitting.value) return
  isDeleteSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/admin/teacher/${teacherId.value}`, {
      method: 'DELETE',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
    })

    toast.add({ title: 'Deleted', description: 'Teacher deleted successfully.', color: 'success' })
    isDeleteOpen.value = false
    await navigateTo('/teachers')
  } catch (error) {
    console.error('Error deleting teacher:', error)
    toast.add({ title: 'Error', description: 'Failed to delete teacher.', color: 'error' })
  } finally {
    isDeleteSubmitting.value = false
  }
}

</script>

<template>
  <UContainer>

    <UPageCard v-if="status === 'pending'" class="flex items-center justify-center h-64">
      <p>Loading teacher profile...</p>
    </UPageCard>
    <template v-else-if="teacher">
      <UPageCard>
        <div class="flex items-center">
          <NuxtImg :src="teacher.profileImageURL || 'https://placehold.co/400x400'" :alt="`${teacher.firstName} ${teacher.lastName}`" width="200" height="200" class="rounded-full" />
          <UContainer class="ml-8 w-full">
            <div class="flex items-start justify-between w-full">
              <UPageHeader :title="`${teacher.firstName} ${teacher.lastName}`" style="border-bottom: 0; padding-bottom: 0;">
                <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="email">{{ teacher.email }}</div>
                <div class="text-xl font-medium mt-2 text-gray-500 dark:text-gray-400" id="_id">#{{ teacher._id }}</div>
              </UPageHeader>

              <div class="flex items-start gap-2">
                <UButton
                  icon="i-lucide-pencil"
                  variant="ghost"
                  aria-label="Edit teacher"
                  @click="openEditModal"
                />
                <UButton
                  icon="i-lucide-trash"
                  variant="ghost"
                  aria-label="Delete teacher"
                  @click="isDeleteOpen = true"
                />
              </div>
            </div>
          </UContainer>
        </div>
      </UPageCard>

      <UPageCard class="mt-8">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Assigned Sections</h3>
            <UButton
              label="Assign New Section"
              icon="i-lucide-folder-plus"
              variant="outline"
              @click="openAssignSectionModal"
            />
          </div>
        </template>

        <div v-if="teacher.assignedSections && teacher.assignedSections.length > 0" class="space-y-2">
          <div
            v-for="section in teacher.assignedSections"
            :key="section._id"
            class="flex items-center justify-between gap-2 py-1"
          >
            <NuxtLink :to="`/profile-section?id=${section._id}`" class="text-primary font-medium hover:underline">
              {{ section.name }}
            </NuxtLink>
            <UButton
              icon="i-lucide-trash"
              color="error"
              variant="ghost"
              square
              aria-label="Unassign teacher from section"
              @click="openUnassignSectionConfirm(section)"
            />
          </div>
        </div>
        <p v-else class="text-gray-500 dark:text-gray-400">No sections assigned.</p>
      </UPageCard>

      <!-- Edit Teacher Modal -->
      <UModal v-model:open="isEditOpen" :dismissible="!isEditSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Edit Teacher</h3>
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
                Update Teacher
              </UButton>
            </div>
          </UForm>
        </template>
      </UModal>

      <!-- Delete Confirmation Modal -->
      <UModal v-model:open="isDeleteOpen" :dismissible="!isDeleteSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Delete Teacher</h3>
        </template>
        <template #body>
          <p>Are you sure you want to delete this teacher? This action cannot be undone.</p>
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
              color="error"
              :loading="isDeleteSubmitting"
              :disabled="isDeleteSubmitting"
              @click="onDeleteTeacher"
            >
              Delete
            </UButton>
          </div>
        </template>
      </UModal>

      <!-- Assign Section Modal -->
      <UModal v-model:open="isAssignSectionOpen" :dismissible="!isAssignSectionSubmitting">
        <template #header>
          <div class="flex items-center justify-between w-full">
            <h3 class="text-lg font-semibold">Assign Teacher to Section</h3>
            <UButton
              icon="i-lucide-x"
              variant="ghost"
              :disabled="isAssignSectionSubmitting"
              @click="isAssignSectionOpen = false"
            />
          </div>
        </template>
        <template #body>
          <form class="space-y-4" @submit.prevent="confirmAssignSection">
            <UFormField label="Section" name="sectionId" required block>
              <USelect
                v-model="assignSectionSelectedId"
                :items="assignSectionDropdownItems"
                placeholder="Select a section"
                class="w-full"
              />
            </UFormField>
            <div class="flex justify-end gap-2">
              <UButton
                type="button"
                variant="outline"
                :disabled="isAssignSectionSubmitting"
                @click="isAssignSectionOpen = false"
              >
                Cancel
              </UButton>
              <UButton
                type="submit"
                :loading="isAssignSectionSubmitting"
                :disabled="!assignSectionSelectedId || isAssignSectionSubmitting"
              >
                Assign Section
              </UButton>
            </div>
          </form>
        </template>
      </UModal>

      <!-- Unassign Section Confirmation Modal -->
      <UModal v-model:open="isUnassignSectionOpen" :dismissible="!isUnassignSectionSubmitting">
        <template #header>
          <h3 class="text-lg font-semibold">Remove teacher from section</h3>
        </template>
        <template #body>
          <p v-if="sectionToUnassign">
            Are you sure you want to remove this teacher from {{ sectionToUnassign.name }}?
          </p>
          <div class="flex justify-end gap-2 mt-6">
            <UButton
              type="button"
              variant="outline"
              :disabled="isUnassignSectionSubmitting"
              @click="closeUnassignSectionConfirm"
            >
              Cancel
            </UButton>
            <UButton
              color="error"
              :loading="isUnassignSectionSubmitting"
              :disabled="isUnassignSectionSubmitting"
              @click="confirmUnassignSection"
            >
              Remove
            </UButton>
          </div>
        </template>
      </UModal>
    </template>
    <UPageCard v-else class="flex items-center justify-center h-64">
      <p>Could not load teacher profile.</p>
    </UPageCard>
  </UContainer>
</template>
