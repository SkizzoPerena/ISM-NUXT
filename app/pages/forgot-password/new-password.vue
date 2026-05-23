<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useApiBase } from '~/composables/useApiBase'

const toast = useToast()
const route = useRoute()
const API_BASE = useApiBase()

const otpId = computed(() => {
  const id = route.query.otpId
  return typeof id === 'string' ? id : ''
})

onMounted(() => {
  if (!otpId.value) {
    navigateTo('/forgot-password', { replace: true })
  }
})

const isSubmitting = ref(false)
const showPassword = ref(false)
const showConfirm = ref(false)

const state = reactive({
  newPassword: '',
  confirmPassword: '',
})

const schema = z
  .object({
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(8, 'Confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!otpId.value) return

  isSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/otp/change-password/${otpId.value}`, {
      method: 'PATCH',
      body: { newPassword: event.data.newPassword },
    })

    toast.add({
      title: 'Password updated',
      description: 'Sign in with your new password.',
      color: 'success',
    })

    await navigateTo('/login', { replace: true })
  } catch (error: any) {
    const errorMessage = error.data?.message || 'Could not update password. Please try again.'
    toast.add({ title: 'Update failed', description: errorMessage, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UMain class="flex flex-col items-center justify-center min-h-[70vh]">
    <UPageCard v-if="otpId" class="w-full max-w-sm">
      <div class="text-center space-y-2">
        <UIcon name="i-lucide-key-round" class="text-4xl mx-auto" />
        <h2 class="text-2xl font-bold">Set new password</h2>
        <p class="text-gray-500 dark:text-gray-400">
          Choose a new password for your account.
        </p>
      </div>

      <UForm :schema="schema" :state="state" class="space-y-4 mt-6" @submit="onSubmit">
        <UFormField label="New password" name="newPassword" required>
          <UInput
            v-model="state.newPassword"
            placeholder="New password"
            class="w-full"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="new-password"
            :ui="{ trailing: 'pe-1' }"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showPassword ? 'Hide password' : 'Show password'"
                @click="showPassword = !showPassword"
              />
            </template>
          </UInput>
        </UFormField>

        <UFormField label="Confirm password" name="confirmPassword" required>
          <UInput
            v-model="state.confirmPassword"
            placeholder="Confirm password"
            class="w-full"
            :type="showConfirm ? 'text' : 'password'"
            autocomplete="new-password"
            :ui="{ trailing: 'pe-1' }"
          >
            <template #trailing>
              <UButton
                color="neutral"
                variant="link"
                size="sm"
                :icon="showConfirm ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="showConfirm ? 'Hide password' : 'Show password'"
                @click="showConfirm = !showConfirm"
              />
            </template>
          </UInput>
        </UFormField>

        <UButton type="submit" block :loading="isSubmitting" :disabled="isSubmitting">
          Set new password
        </UButton>
      </UForm>

      <p class="text-sm text-center text-gray-500 dark:text-gray-400 mt-4">
        <ULink to="/login" class="text-primary font-medium">Back to sign in</ULink>
      </p>
    </UPageCard>
  </UMain>
</template>
