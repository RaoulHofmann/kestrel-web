export default defineNuxtRouteMiddleware(() => {
  const auth = useAuthStore()
  if (!auth.ready) auth.restore()
  if (!auth.isAuthenticated) return navigateTo('/login')
})
