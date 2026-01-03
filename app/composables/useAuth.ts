/**
 * A composable to manage the authentication token state.
 * `useCookie` creates a reactive ref that is synced with a browser cookie.
 * This ensures the token persists across page reloads and browser sessions.
 */
export const useAuthToken = () => useCookie<string | null>('authToken')