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
const isResending = ref(false)

const state = reactive({
  pinCode: '',
})

const schema = z.object({
  pinCode: z
    .string()
    .length(6, 'Enter the 6-digit code from your email')
    .regex(/^\d{6}$/, 'Code must contain only digits'),
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  if (!otpId.value) return

  isSubmitting.value = true
  try {
    await $fetch(`${API_BASE}/api/otp/verify/${otpId.value}`, {
      method: 'PATCH',
      body: { pinCode: event.data.pinCode },
    })

    toast.add({
      title: 'Code verified',
      description: 'You can now set a new password.',
      color: 'success',
    })

    await navigateTo({
      path: '/forgot-password/new-password',
      query: { otpId: otpId.value },
    })
  } catch (error: any) {
    const errorMessage = error.data?.message || 'Invalid or expired code. Please try again.'
    const expired = error?.status === 410 || /expired/i.test(errorMessage)
    toast.add({
      title: 'Verification failed',
      description: expired
        ? `${errorMessage} Request a new code from the forgot-password page.`
        : errorMessage,
      color: 'error',
    })
  } finally {
    isSubmitting.value = false
  }
}

async function resendOtp() {
  if (!otpId.value) return

  isResending.value = true
  try {
    await $fetch(`${API_BASE}/api/otp/resend/${otpId.value}`, {
      method: 'PATCH',
    })
    toast.add({
      title: 'OTP resent',
      description: 'A new code has been sent to your email.',
      color: 'success',
    })
  } catch (error: any) {
    const errorMessage = error.data?.message || 'Could not resend OTP.'
    const expired = error?.status === 410 || /expired|request a new/i.test(errorMessage)
    toast.add({
      title: 'Resend failed',
      description: expired
        ? `${errorMessage} Use "Use a different email" below to start again.`
        : errorMessage,
      color: 'error',
    })
  } finally {
    isResending.value = false
  }
}
</script>

<template>
  <UMain class="flex flex-col items-center justify-center min-h-[70vh]">
    <UPageCard v-if="otpId" class="w-full max-w-sm">
      <div class="text-center space-y-2">
        <UIcon name="i-lucide-shield-check" class="text-4xl mx-auto" />
        <h2 class="text-2xl font-bold">Enter OTP</h2>
        <p class="text-gray-500 dark:text-gray-400">
          Enter the 6-digit code we sent to your email.
        </p>
      </div>

      <UForm :schema="schema" :state="state" class="space-y-4 mt-6" @submit="onSubmit">
        <UFormField label="One-time code" name="pinCode" required>
          <UInput
            v-model="state.pinCode"
            type="text"
            inputmode="numeric"
            maxlength="6"
            placeholder="000000"
            class="w-full text-center tracking-widest text-lg"
            autocomplete="one-time-code"
          />
        </UFormField>

        <UButton type="submit" block :loading="isSubmitting" :disabled="isSubmitting">
          Verify code
        </UButton>
      </UForm>

      <div class="flex flex-col items-center gap-2 mt-4">
        <UButton
          variant="link"
          color="primary"
          :loading="isResending"
          :disabled="isResending || isSubmitting"
          @click="resendOtp"
        >
          Resend OTP
        </UButton>
        <ULink to="/forgot-password" class="text-sm text-primary font-medium">
          Use a different email
        </ULink>
        <ULink to="/login" class="text-sm text-gray-500 dark:text-gray-400">
          Back to sign in
        </ULink>
      </div>
    </UPageCard>
  </UMain>
</template>
