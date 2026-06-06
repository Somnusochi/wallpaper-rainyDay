<template>
  <div class="index">
    <RainWebGL :config="rainConfig" :background-image="String(rainConfig.backgroundImage)" />
    <div class="control-panel">
      <div class="panel-title">雨滴参数</div>

      <div class="control" style="margin-bottom:10px">
        <button class="upload-btn" @click="fileInput?.click()">📁 更换背景图/视频</button>
        <input ref="fileInput" type="file" accept="image/*,video/*" @change="onFilePicked" style="display:none" />
      </div>

      <div class="section">外观</div>
      <div class="control" v-for="ctrl in visualCtrls" :key="ctrl.key">
        <label>{{ ctrl.label }} <span class="val">{{ displayVal(ctrl, rainConfig[ctrl.key]) }}</span></label>
        <input v-if="ctrl.type === 'range'" type="range" :min="ctrl.min" :max="ctrl.max" :step="ctrl.step" :value="rainConfig[ctrl.key]" @input="setVal(ctrl.key, $event)" />
        <input v-if="ctrl.type === 'color'" type="color" :value="rainConfig[ctrl.key]" @input="setVal(ctrl.key, $event)" />
        <select v-if="ctrl.type === 'select'" :value="rainConfig[ctrl.key]" @change="setVal(ctrl.key, $event)" class="sel">
          <option value="fitWidth">按宽度裁切</option>
          <option value="fitHeight">按高度裁切</option>
          <option value="contain">完整显示</option>
          <option value="fill">拉伸铺满</option>
        </select>
        <select v-if="ctrl.type === 'select2'" :value="rainConfig[ctrl.key]" @change="setVal(ctrl.key, $event)" class="sel">
          <option value="bottom">底部</option>
          <option value="center">居中</option>
          <option value="top">顶部</option>
        </select>
      </div>

      <div class="section">水滴</div>
      <div class="control" v-for="ctrl in dropCtrls" :key="ctrl.key">
        <label>{{ ctrl.label }} <span class="val">{{ displayVal(ctrl, rainConfig[ctrl.key]) }}</span></label>
        <input v-if="ctrl.type === 'range'" type="range" :min="ctrl.min" :max="ctrl.max" :step="ctrl.step" :value="rainConfig[ctrl.key]" @input="setVal(ctrl.key, $event)" />
      </div>

      <div class="section">物理</div>
      <div class="control" v-for="ctrl in physicsCtrls" :key="ctrl.key">
        <label>{{ ctrl.label }} <span class="val">{{ displayVal(ctrl, rainConfig[ctrl.key]) }}</span></label>
        <input v-if="ctrl.type === 'range'" type="range" :min="ctrl.min" :max="ctrl.max" :step="ctrl.step" :value="rainConfig[ctrl.key]" @input="setVal(ctrl.key, $event)" />
        <label v-if="ctrl.type === 'bool'" class="toggle">
          <input type="checkbox" :checked="rainConfig[ctrl.key]" @change="setVal(ctrl.key, $event)" />
          <span>{{ rainConfig[ctrl.key] ? '开' : '关' }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import observeUserProperties from '@/utils/windowProxy'

const rainConfig = reactive<Record<string, unknown>>({ ...window.userProperties })
const fileInput = ref<HTMLInputElement | null>(null)

const handlePropertyChange = (propKey: string, value: unknown) => {
  rainConfig[propKey] = value
}

const setVal = (key: string, e: Event) => {
  const target = e.target as HTMLInputElement
  const val = target.type === 'checkbox' ? target.checked : target.type === 'range' ? parseFloat(target.value) : target.value
  rainConfig[key] = val
}

interface Ctrl { key: string; label: string; type: string; min: number; max: number; step: number; unit?: string }

const displayVal = (ctrl: Ctrl, v: unknown) => {
  if (ctrl.type === 'select') return ''
  const n = Number(v)
  if (isNaN(n)) return v
  return ctrl.unit ? `${n.toFixed(ctrl.step < 1 ? 2 : 0)}${ctrl.unit}` : n
}

const visualCtrls: Ctrl[] = [
  { key: 'fillStyle', label: '水滴颜色', type: 'color', min: 0, max: 0, step: 0 },
  { key: 'blur', label: '背景模糊', type: 'range', min: 0, max: 50, step: 0.1, unit: 'px' },
  { key: 'opacity', label: '水滴不透明度', type: 'range', min: 0, max: 1, step: 0.01 },
  { key: 'backgroundFit', label: '背景适配', type: 'select', min: 0, max: 0, step: 0 },
  { key: 'cropAlign', label: '裁切起点', type: 'select2', min: 0, max: 0, step: 0 },
]

const dropCtrls: Ctrl[] = [
  { key: 'presetMin', label: '最小半径', type: 'range', min: 1, max: 30, step: 1, unit: 'px' },
  { key: 'presetBase', label: '随机浮动半径', type: 'range', min: 0, max: 30, step: 1, unit: 'px' },
  { key: 'maxDrops', label: '最大水滴数', type: 'range', min: 10, max: 500, step: 10 },
  { key: 'presetFreq', label: '每帧生成数量', type: 'range', min: 0.1, max: 30, step: 0.1 },
  { key: 'gravityThreshold', label: '滚动大小阈值', type: 'range', min: 1, max: 30, step: 1, unit: 'px' },
]

const physicsCtrls: Ctrl[] = [
  { key: 'rainSpeed', label: '物理更新间隔', type: 'range', min: 5, max: 500, step: 5, unit: 'ms' },
  { key: 'fps', label: '重力倍率', type: 'range', min: 1, max: 200, step: 1 },
  { key: 'gravityAngle', label: '风向下落角度', type: 'range', min: 0, max: 3.14, step: 0.01 },
  { key: 'gravityAngleVariance', label: '风向随机变化', type: 'range', min: 0, max: 2, step: 0.01 },
  { key: 'enableCollisions', label: '水滴碰撞合并', type: 'bool', min: 0, max: 0, step: 0 },
]

const onFilePicked = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const url = URL.createObjectURL(file)
  // Append MIME type hint for video detection
  if (file.type.startsWith('video/')) {
    rainConfig.backgroundImage = url + '?type=video'
  } else {
    rainConfig.backgroundImage = url
  }
}

onMounted(() => {
  observeUserProperties(handlePropertyChange)
})
</script>

<style lang="scss" scoped>
.index {
  min-width: 100vw;
  min-height: 100vh;
  background-color: #000;
}
.control-panel {
  position: fixed; top: 12px; right: 12px; z-index: 10;
  background: rgba(0, 0, 0, 0.78); backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 12px;
  padding: 16px 18px; color: #ccc; font-size: 11px; width: 260px;
  max-height: 94vh; overflow-y: auto;
  font-family: -apple-system, 'SF Mono', Menlo, monospace; user-select: none;
}
.panel-title { font-size: 14px; font-weight: 700; margin-bottom: 12px; color: #fff; }
.section {
  font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.4); margin: 12px 0 6px; padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.control { margin-bottom: 7px; }
.control label { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; font-size: 11px; }
.val { color: #8ED6FF; font-weight: 500; }
input[type="range"] {
  width: 100%; height: 3px; -webkit-appearance: none; appearance: none;
  background: rgba(255, 255, 255, 0.18); border-radius: 2px; outline: none;
  &::-webkit-slider-thumb {
    -webkit-appearance: none; width: 13px; height: 13px; border-radius: 50%;
    background: #8ED6FF; cursor: pointer; border: none;
    box-shadow: 0 0 6px rgba(142, 214, 255, 0.4);
  }
}
input[type="color"] {
  width: 100%; height: 26px; border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 5px; cursor: pointer; background: transparent; padding: 1px;
}
.sel {
  width: 100%; height: 26px; background: rgba(255, 255, 255, 0.1); color: #ddd;
  border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 5px; font-size: 11px;
  cursor: pointer; outline: none;
  option { background: #1a1a2e; color: #ddd; }
}
.toggle {
  display: flex; align-items: center; gap: 8px; cursor: pointer; margin-top: 4px;
  span { font-size: 11px; font-weight: 500; }
}
.upload-btn {
  display: block; text-align: center; padding: 6px; background: rgba(142,214,255,0.15);
  border: 1px dashed rgba(142,214,255,0.4); border-radius: 6px; color: #8ED6FF;
  font-size: 12px; transition: 0.2s;
  &:hover { background: rgba(142,214,255,0.25); }
}
</style>
