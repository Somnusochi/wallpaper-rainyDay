<template>
  <div class="index">
    <Rain></Rain>
  </div>
</template>

<script setup>
import observeUserProperties from '@/utils/windowProxy';
const title = ref('Rspack + Vue');

const handlePropertyChange = (propKey, value) => {
  title.value = value;
  console.log(`Property ${propKey} changed to ${value}`);
};

// 在组件挂载时设置监听
onMounted(() => {
  // 设置监听
  observeUserProperties(handlePropertyChange);
});
</script>

<style lang="scss" scoped>
.index {
  min-width: 100vw;
  min-height: 100vh;
  background-color: #999;
}
</style>
