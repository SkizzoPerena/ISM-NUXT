export default defineNuxtRouteMiddleware((to, from) => {
  const authToken = useAuthToken()

  // Public auth routes (no token required).
  if (to.path === '/login' || to.path.startsWith('/forgot-password')) {
    return
  }

  // If the auth token is not present and the user is not on the login page,
  // redirect them to the login page.
  if (!authToken.value) {
    return navigateTo('/login', { replace: true })
  }
})