
<script lang="ts" setup>
import { ref } from 'vue'

definePageMeta({
    layout: 't-dashboard',
})

const toast = useToast()

const report = ref({
    title: '',
    description: '',
})

const attachmentFile = ref<File | null>(null)
const isSubmitting = ref(false)

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
  if (isSubmitting.value) return
  isSubmitting.value = true
  
  try {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500))

    toast.add({ title: 'Success', description: 'Your report has been submitted. We will look into it shortly.', color: 'success' })
    
    report.value.title = ''
    report.value.description = ''
    attachmentFile.value = null
  } catch (error: any) {
    toast.add({ title: 'Error', description: 'Failed to submit report. Please try again later.', color: 'error' })
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
              label="Click or drag to upload a screenshot or file"
            />
            <div v-if="attachmentFile" class="flex items-center gap-2 mt-2">
              <span class="text-sm text-gray-500">{{ attachmentFile.name }}</span>
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
