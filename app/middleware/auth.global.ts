export default defineNuxtRouteMiddleware((to, from) => {
  const authToken = useAuthToken()

  // If the user is trying to access the login page, let them.
  if (to.path === '/login') {
    return
  }

  // If the auth token is not present and the user is not on the login page,
  // redirect them to the login page.
  if (!authToken.value) {
    return navigateTo('/login', { replace: true })
  }
})