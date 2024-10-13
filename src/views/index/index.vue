<template>
  <div>
    <a href="https://www.rspack.dev/" target="_blank">
      <img src="@/assets/rspack.svg" class="logo" alt="Rspack logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="@/assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <HelloWorld :msg="title" />
</template>

<script setup lang="ts">
const title = ref<string>('Rspack + Vue');
</script>

<style lang="scss" scoped></style>
