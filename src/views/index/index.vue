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
import observeUserProperties from '@/utils/windowProxy';


const title = ref<string>('');

const handlePropertyChange = (propKey: string, value: any) => {
  title.value = value;
  console.log(`Property ${propKey} changed to ${value}`);
};

// 在组件挂载时设置监听
onMounted(() => {
  // 设置监听
  observeUserProperties(handlePropertyChange);
});

</script>

<style lang="scss" scoped></style>
