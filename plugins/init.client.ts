export default defineNuxtPlugin(() => {
  const auth = useAuthStore()
  auth.restore()

  const server = useServerStatusStore()
  server.start()
})
