<script setup lang="ts">
const auth = useAuthStore()
const route = useRoute()

const mode = ref<'login' | 'signup'>('login')
const email = ref('')
const password = ref('')
const error = ref<string | null>(null)
const info = ref<string | null>(null)
const submitting = ref(false)

const redirect = computed(() => (route.query.redirect as string) || '/dashboard')

async function submit() {
  error.value = null
  info.value = null
  submitting.value = true
  try {
    if (mode.value === 'login') {
      await auth.login(email.value, password.value)
    } else {
      await auth.signup(email.value, password.value)
      if (!auth.isAuthenticated) {
        info.value = 'Account created — check your email to confirm, then sign in.'
        mode.value = 'login'
        return
      }
    }
    await navigateTo(redirect.value)
  } catch (err) {
    error.value = (err as Error).message || 'Something went wrong'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <UContainer class="flex min-h-[calc(100vh-6rem)] items-center justify-center py-16">
    <div class="w-full max-w-md">
      <div class="mb-8 text-center">
        <h1 class="font-display text-4xl font-bold">
          {{ mode === 'login' ? 'Welcome back' : 'Create an account' }}
        </h1>
        <p class="mt-2 text-sm text-muted">
          {{
            mode === 'login'
              ? 'Sign in to manage your company and ships.'
              : 'Register to bootstrap your space cargo company.'
          }}
        </p>
      </div>

      <div class="border border-default p-8">
        <div class="mb-6 grid grid-cols-2 border border-default text-sm">
          <button
            type="button"
            class="py-2 transition-colors"
            :class="mode === 'login' ? 'bg-elevated font-medium text-default' : 'text-muted hover:text-default'"
            @click="mode = 'login'; error = null; info = null"
          >
            Sign in
          </button>
          <button
            type="button"
            class="py-2 transition-colors"
            :class="mode === 'signup' ? 'bg-elevated font-medium text-default' : 'text-muted hover:text-default'"
            @click="mode = 'signup'; error = null; info = null"
          >
            Sign up
          </button>
        </div>

        <form class="space-y-4" @submit.prevent="submit">
          <UFormField label="Email">
            <UInput v-model="email" type="email" required autocomplete="email" class="w-full" placeholder="pilot@example.com" />
          </UFormField>
          <UFormField label="Password">
            <UInput
              v-model="password"
              type="password"
              required
              :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
              class="w-full"
              placeholder="••••••••"
            />
          </UFormField>

          <UAlert v-if="error" color="error" variant="soft" icon="i-lucide-triangle-alert" :title="error" />
          <UAlert v-if="info" color="success" variant="soft" icon="i-lucide-mail-check" :title="info" />

          <UButton type="submit" color="primary" size="lg" block :loading="submitting">
            {{ mode === 'login' ? 'Sign in' : 'Create account' }}
          </UButton>
        </form>
      </div>

      <p class="mt-6 text-center text-xs text-dimmed">
        Auth is proxied through the game server to Supabase. The site never mints tokens.
      </p>
    </div>
  </UContainer>
</template>
