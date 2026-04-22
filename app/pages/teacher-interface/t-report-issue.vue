
<script lang="ts" setup>
import { ref } from 'vue'

definePageMeta({
    layout: 't-dashboard',
})

const API_BASE = 'https://noteworthy-z9k0.onrender.com'

const toast = useToast()

type TeacherAccount = {
  _id: string
  email: string
  firstName: string
  lastName: string
  profileImageURL?: string
  gender?: string
}

const user = useState<TeacherAccount | null>('user')

const report = ref({
    title: '',
    description: '',
})

const attachmentFile = ref<File | null>(null)
const isSubmitting = ref(false)

function mediaKindFromFile(file: File | null): 'image' | 'other' | null {
  if (!file) return null
  const type = (file.type || '').toLowerCase()
  if (type.startsWith('image/')) return 'image'
  const lower = (file.name || '').toLowerCase()
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg') || lower.endsWith('.png')) return 'image'
  return 'other'
}

function resetAttachment() {
  attachmentFile.value = null
}

function validate(): string | null {
  if (!report.value.title?.trim()) return 'Title is required.'
  if (!report.value.description?.trim()) return 'Description is required.'
  return null
}

async function submitReport() {
  const err = validate()
  if (err) {
    toast.add({ title: 'Validation failed', description: err, color: 'error' })
    return
  }
  if (!user.value?._id) {
    toast.add({ title: 'Error', description: 'Missing teacher account. Please re-login.', color: 'error' })
    return
  }
  if (isSubmitting.value) return
  isSubmitting.value = true
  
  try {
    const baseBody = {
      user: user.value._id,
      userType: 'TEACHER',
      title: report.value.title.trim(),
      description: report.value.description.trim(),
    }

    const file = attachmentFile.value
    const kind = mediaKindFromFile(file)
    if (file && kind === 'other') {
      toast.add({ title: 'Invalid file', description: 'Only images (.jpg, .jpeg, .png) are supported.', color: 'error' })
      return
    }

    let requestData: any = baseBody
    if (file) {
      const formData = new FormData()
      for (const [k, v] of Object.entries(baseBody)) formData.append(k, String(v))
      formData.append('supplementaryFile', file, file.name)
      requestData = formData
    }

    await $fetch(`${API_BASE}/api/teacher/issues`, {
      method: 'POST',
      headers: {
        Authorization: `${useAuthToken().value}`,
      },
      body: requestData,
    })

    toast.add({ title: 'Success', description: 'Your report has been submitted. We will look into it shortly.', color: 'success' })
    
    report.value.title = ''
    report.value.description = ''
    attachmentFile.value = null

    await navigateTo('/teacher-interface/t-profile-teacher')
  } catch (error: any) {
    const message = error?.data?.message ?? error?.response?._data?.message ?? error?.message ?? 'Failed to submit report. Please try again later.'
    toast.add({ title: 'Error', description: message, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UContainer>
    <UPageCard>
      <div class="text-lg font-bold">Report a Problem</div>
      <USeparator />
      <UPageGrid class="mt-4">
        <UForm>
          <UFormGroup class="space-y-4">
            <UFormField label="Title" name="title" required>
              <UInput v-model="report.title" class="w-full" placeholder="e.g., Unable to view student submissions" />
            </UFormField>

            <UFormField label="Description" name="description" required>
              <UTextarea v-model="report.description" class="w-full" placeholder="Please provide as much detail as possible..." :rows="8" />
            </UFormField>
          </UFormGroup>
        </UForm>

        <div>
          <UFormField label="Attach File (Optional)" name="attachment">
            <UFileUpload
              v-model="attachmentFile"
              label="Click or drag to upload an image"
              accept="image/jpeg,image/png"
            />
            <div v-if="attachmentFile" class="flex items-center gap-2 mt-2">
              <span class="text-sm text-gray-500">{{ attachmentFile.name }}</span>
              <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" @click="resetAttachment">
                Remove
              </UButton>
            </div>
          </UFormField>
        </div>
      </UPageGrid>
    </UPageCard>

    <UPageCard class="mt-4">
      <UButton size="lg" icon="i-lucide-send" block :loading="isSubmitting" @click="submitReport">Submit Report</UButton>
    </UPageCard>
  </UContainer>
</template>
