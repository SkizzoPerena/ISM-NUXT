<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent } from '@nuxt/ui'
import { useApiBase } from '~/composables/useApiBase'

const toast = useToast()

const API_BASE = useApiBase()

const state = reactive({
  email: 'teacherjuan@gmail.com',
  password: 'password',
  remember: false
})

const destination = ref('/')

function setDestination(path: string) {
  destination.value = path
}

const schema = z.object({
  email: z.email('Invalid email'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  remember: z.boolean().optional()
})

type Schema = z.output<typeof schema>

async function onSubmit(event: FormSubmitEvent<Schema>) {
  try {
    // Get a reference to our cookie-based auth token state
    const authToken = useAuthToken()

    const loginUrl = destination.value === '/'
      ? `${API_BASE}/api/admin/login`
      : `${API_BASE}/api/teacher/login`

    // Make a POST request to your login API endpoint
    const response = await $fetch<{ token: string }>(loginUrl, {
      method: 'POST',
      body: event.data
    })

    // If "Remember me" is checked, set the cookie to expire in 7 days.
    // Otherwise, it will be a session cookie.
    if (event.data.remember) {
      const expires = new Date()
      expires.setDate(expires.getDate() + 7)
      authToken.value = response.token
      // Note: useCookie options must be set on both read and write for consistency.
      // We are re-creating the cookie ref here with the new expiry option.
      useCookie('authToken', { expires }).value = response.token
    } else {
      authToken.value = response.token
    }

    toast.add({ title: 'Login successful!', color: 'success' })

    // Redirect to the destination page on successful login
    await navigateTo(destination.value)
  } catch (error: any) {
    const errorMessage = error.data?.message || 'An unknown error occurred.'
    toast.add({ title: 'Login Failed', description: errorMessage, color: 'error' })
    console.error('Login error:', error)
  }
}

const show = ref(false)
const password = ref('')
</script>

<template>
  <UMain class="flex flex-col items-center justify-center">
    <UPageCard class="w-full max-w-sm">

      <div class="text-center space-y-2">
        <UIcon name="i-lucide-lock" class="text-4xl" />
        <h2 class="text-2xl font-bold">Welcome back!</h2>
        <p class="text-gray-500 dark:text-gray-400">Sign in as an admin to continue</p>
      </div>


      <UForm :schema="schema" :state="state" class="space-y-4" @submit="onSubmit">
        <UFormField label="Email" name="email" required>
          <UInput v-model="state.email" placeholder="Enter your email" type="email" class="w-full" />
        </UFormField>

        <UFormField label="Password" name="password" required>
          <template #hint>
            <ULink to="/forgot-password" class="text-primary font-medium" tabindex="-1">Forgot password?</ULink>
          </template>
          <UInput v-model="state.password" placeholder="Enter your password" class="w-full"
            :type="show ? 'text' : 'password'" :ui="{ trailing: 'pe-1' }">
            <template #trailing>
              <UButton color="neutral" variant="link" size="sm" :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
                :aria-label="show ? 'Hide password' : 'Show password'" :aria-pressed="show" aria-controls="password"
                @click="show = !show" />
            </template>
          </UInput>
        </UFormField>

        <UFormField name="remember">
          <UCheckbox v-model="state.remember" label="Remember me" />
        </UFormField>

        <div class="flex flex-col gap-2 pt-2">
          <UButton type="submit" block @click="setDestination('/')">
            Sign In as Admin
          </UButton>
          <UButton type="submit" block color="secondary" @click="setDestination('/teacher-interface/t-index')">
            Sign In as Teacher
          </UButton>
        </div>
      </UForm>


      <p class="text-sm text-center text-gray-500 dark:text-gray-400">
        By signing in, you agree to our <ULink to="#" class="text-primary font-medium">Terms of Service</ULink>.</p>

    </UPageCard>
  </UMain>
</template>
