<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useApiBase } from '~/composables/useApiBase'

const toast = useToast()
const API_BASE = useApiBase()

const isSubmitting = ref(false)

const state = reactive({
  email: '',
})

const schema = z.object({
  email: z.email('Enter a valid email address'),
})

type Schema = z.output<typeof schema>

function extractOtpId(response: unknown): string | null {
  if (!response || typeof response !== 'object') return null
  const r = response as Record<string, unknown>
  const otp = r.otp as Record<string, unknown> | undefined
  const id = otp?._id
  if (typeof id === 'string' && id.length > 0) return id
  if (id != null) return String(id)
  return null
}

async function onSubmit(event: FormSubmitEvent<Schema>) {
  isSubmitting.value = true
  try {
    const response = await $fetch(`${API_BASE}/api/otp/generate`, {
      method: 'POST',
      body: { email: event.data.email },
    })

    const otpId = extractOtpId(response)
    if (!otpId) {
      toast.add({
        title: 'Unexpected response',
        description: 'Could not start password reset. Please try again.',
        color: 'error',
      })
      return
    }

    toast.add({
      title: 'OTP sent',
      description: 'Check your email for a 6-digit code.',
      color: 'success',
    })

    await navigateTo({
      path: '/forgot-password/verify',
      query: { otpId },
    }, { replace: true })
  } catch (error: any) {
    const errorMessage = error.data?.message || 'Failed to send OTP. Please try again.'
    toast.add({ title: 'Could not send OTP', description: errorMessage, color: 'error' })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <UMain class="flex flex-col items-center justify-center min-h-[70vh]">
    <UPageCard class="w-full max-w-sm">
      <div class="text-center space-y-2">
        <UIcon name="i-lucide-mail" class="text-4xl mx-auto" />
        <h2 class="text-2xl font-bold">Forgot password</h2>
        <p class="text-gray-500 dark:text-gray-400">
          Enter the email on your NoteWorthy account. We will send you a one-time code.
        </p>
      </div>

      <UForm :schema="schema" :state="state" class="space-y-4 mt-6" @submit="onSubmit">
        <UFormField label="Email" name="email" required>
          <UInput
            v-model="state.email"
            type="email"
            placeholder="you@example.com"
            class="w-full"
            autocomplete="email"
          />
        </UFormField>

        <UButton type="submit" block :loading="isSubmitting" :disabled="isSubmitting">
          Send OTP
        </UButton>
      </UForm>

      <p class="text-sm text-center text-gray-500 dark:text-gray-400 mt-4">
        <ULink to="/login" class="text-primary font-medium">Back to sign in</ULink>
      </p>
    </UPageCard>
  </UMain>
</template>
