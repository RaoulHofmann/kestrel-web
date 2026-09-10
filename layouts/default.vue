<template>
  <div class="flex min-h-screen flex-col bg-default text-default">
    <StatusBar />
    <AppHeader />
    <main class="flex-1">
      <slot />
    </main>
    <AppFooter />
  </div>
</template>
