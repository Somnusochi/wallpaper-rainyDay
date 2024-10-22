<template>
  <div class="rain">
    <img id="background" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAADCAYAAABfwxXFAAAAYklEQVQYVwFXAKj/AXRCrf8E9PIAAxXhAPfv+gDp7+8A5PLsAA0PBgAB0cjr/6l4yQAGE+YAAfnxABkHCwAM/gMA8On2AAFpQbb/7u/wAPcB3ADm/9kAB//6ABoCFAAfDxwACv8maribSVsAAAAASUVORK5CYII=">
  </div>
</template>

<script>
  export default {
    mounted() {
      setTimeout(() => {
        const engine = new RainyDay({
          image: 'background'
        });
        engine.rain([
          [3, 2, 2]
        ], 100);
      }, 1000);
    }
  }
</script>

<style lang="scss">
#canvas {
  position: absolute;
  top: 0;
  left: 0;
  min-width: 100vw;
  min-height: 100vh;
}
</style>
