<template>
  <div class="rain">
    <img id="background" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAcAAAADCAYAAABfwxXFAAAAYklEQVQYVwFXAKj/AXRCrf8E9PIAAxXhAPfv+gDp7+8A5PLsAA0PBgAB0cjr/6l4yQAGE+YAAfnxABkHCwAM/gMA8On2AAFpQbb/7u/wAPcB3ADm/9kAB//6ABoCFAAfDxwACv8maribSVsAAAAASUVORK5CYII=">
  </div>
</template>

<script lang="ts">
  import type { PropType } from 'vue'

  let engine: RainyDayInstance | null = null;
  let resizeTimer: ReturnType<typeof setTimeout> | null = null;

  interface RainConfig {
    fps: number
    blur: number
    opacity: number
    fillStyle: string
    enableCollisions: boolean
    gravityThreshold: number
    gravityAngle: number
    gravityAngleVariance: number
    presetMin: number
    presetBase: number
    presetFreq: number
    rainSpeed: number
  }

  interface RainyDayInstance {
    destroy(): void
    rain(presets: number[][], speed: number): void
  }

  export default {
    props: {
      config: {
        type: Object as PropType<RainConfig>,
        required: true,
      },
    },
    watch: {
      config: {
        deep: true,
        handler() {
          this.rebuildEngine();
        },
      },
    },
    mounted() {
      setTimeout(() => {
        this.rebuildEngine();
      }, 1000);
    },
    beforeUnmount() {
      if (resizeTimer !== null) clearTimeout(resizeTimer);
      if (engine) {
        engine.destroy();
      }
    },
    methods: {
      rebuildEngine() {
        if (resizeTimer !== null) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
          if (engine) {
            engine.destroy();
          }
          const { presetMin, presetBase, presetFreq, rainSpeed, ...options } = this.config;
          engine = new (window as any).RainyDay({
            image: document.getElementById('background'),
            ...options,
          }) as RainyDayInstance;
          engine.rain([[presetMin, presetBase, presetFreq]], rainSpeed);
        }, 200);
      },
    },
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
