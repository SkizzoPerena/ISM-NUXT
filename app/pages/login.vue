<script setup lang="ts">
import * as z from 'zod'
import type { FormSubmitEvent, AuthFormField } from '@nuxt/ui'

const toast = useToast()

const fields: AuthFormField[] = [{
  name: 'email',
  type: 'email',
  label: 'Email',
  placeholder: 'Enter your email',
  defaultValue: 'noteworthyadmin@gmail.com',
  required: true
}, {
  name: 'password',
  label: 'Password',
  type: 'password',
  placeholder: 'Enter your password',
  defaultValue: 'admin1234',
  required: true
}, {
  name: 'remember',
  label: 'Remember me',
  type: 'checkbox',
  defaultValue: false,
}]


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

    // Make a POST request to your login API endpoint
    const response = await $fetch<{ token: string }>('https://noteworthy-z9k0.onrender.com/api/admin/login', {
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

    // Redirect to the home page on successful login
    await navigateTo('/')
  } catch (error: any) {
    const errorMessage = error.data?.message || 'An unknown error occurred.'
    toast.add({ title: 'Login Failed', description: errorMessage, color: 'error' })
    console.error('Login error:', error)
  }
}
</script>

<template>
  <UMain class="flex flex-col items-center justify-center">
    <UPageCard class="w-full max-w-sm h-125" >
      <UAuthForm
        :schema="schema"
        :fields="fields"
        title="Welcome back!"
        icon="i-lucide-lock"
        @submit="onSubmit" class="max-w-md"
      >
        <template #description>
          <div class="text-default">Sign in as an admin to continue</div>
          <div class="text-sm pt-2">Not an admin? <ULink to="/t-login" class="text-primary font-medium">Sign in as a teacher instead</Ulink>.</div>
        </template>
        <template #password-hint>
          <ULink to="#" class="text-primary font-medium" tabindex="-1">Forgot password?</ULink>
        </template> 
        <template #footer>
          By signing in, you agree to our <ULink to="#" class="text-primary font-medium">Terms of Service</ULink>.
        </template>
      </UAuthForm>
    </UPageCard>
  </UMain>
</template>
