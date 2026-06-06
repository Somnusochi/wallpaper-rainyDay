<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { DropSimulator, type DropConfig } from '@/composables/useDropSimulation'

interface FullConfig extends DropConfig {
  opacity: number
  fillStyle: string
  blur: number
  enableCollisions: boolean
  backgroundFit: string
  cropAlign: string
}

const props = defineProps<{
  config: FullConfig
  backgroundImage: string
}>()

const MAX_DROPS = 500

const canvasRef = ref<HTMLCanvasElement | null>(null)
const videoRef = ref<HTMLVideoElement | null>(null)

let gl: WebGLRenderingContext | null = null
let simulator: DropSimulator | null = null
let program: WebGLProgram | null = null
let bgTexture: WebGLTexture | null = null
let bgBlurTexture: WebGLTexture | null = null
let originalImg: HTMLImageElement | null = null
let imageAspect = 1.0
let isVideo = false

let animId = 0
let dropUniformLoc: WebGLUniformLocation | null = null
let countUniformLoc: WebGLUniformLocation | null = null
let colorLoc: WebGLUniformLocation | null = null
let refractionLoc: WebGLUniformLocation | null = null
let opacityLoc: WebGLUniformLocation | null = null
let coverScaleLoc: WebGLUniformLocation | null = null
let coverOffsetLoc: WebGLUniformLocation | null = null
let posLoc = -1
let texLoc = -1

const VERT = `
attribute vec2 aPosition;
attribute vec2 aTexCoord;
varying vec2 vTexCoord;
void main() {
    vTexCoord = aTexCoord;
    gl_Position = vec4(aPosition, 0.0, 1.0);
}`

const FRAG_IMAGE = `
precision highp float;
#define MAX_DROPS ${MAX_DROPS}
uniform sampler2D uBlurBg;
uniform sampler2D uSharpBg;
uniform vec4 uDrops[MAX_DROPS];
uniform int uDropCount;
uniform vec3 uColor;
uniform float uRefraction;
uniform float uOpacity;
varying vec2 vTexCoord;

void main() {
    vec2 uv = vTexCoord;
    float insideMask = 0.0;
    vec2 lensDelta = vec2(0.0);
    float spec = 0.0;
    float shadow = 0.0;
    float edge = 0.0;
    float closestDist = 999.0;

    for (int i = 0; i < MAX_DROPS; i++) {
        if (i >= uDropCount) break;
        vec2 center = uDrops[i].xy;
        float radius = uDrops[i].z;
        float speed = uDrops[i].w;
        vec2 delta = uv - center;

        float deform = smoothstep(0.3, 0.5, speed);
        float stretch = 1.0 + deform * 0.3;
        float widen = 1.0 + deform * 0.2;
        vec2 shaped = delta;
        if (delta.y > 0.0) { shaped.y /= stretch; shaped.x /= widen; }
        float dist = length(shaped);
        float norm = dist / radius;

        if (norm < 1.0) {
            float alpha = 1.0 - smoothstep(0.0, 1.0, norm);
            insideMask = max(insideMask, alpha);
            if (dist < closestDist) {
                closestDist = dist;
                float mag = (1.0 - norm) * uRefraction * 8.0;
                float push = norm * norm * uRefraction * 5.0;
                lensDelta = shaped * (push - mag);

                float specY = (-delta.y / radius - speed * 0.15);
                spec = smoothstep(0.50, 0.92, specY)
                     * (1.0 - smoothstep(0.05, 0.30, abs(delta.x / radius)));
                spec *= smoothstep(0.72, 0.96, norm) * (1.0 + speed * 0.3);

                float bottomY = delta.y / radius;
                shadow = smoothstep(-0.1, 0.85, bottomY)
                       * smoothstep(0.65, 0.96, norm) * (0.45 - speed * 0.2);

                edge = smoothstep(0.87, 1.0, norm) * 0.22;
            }
        }
    }

    vec2 sampleUV = clamp(uv + lensDelta, 0.0, 1.0);
    vec3 blurBg = texture2D(uBlurBg, uv).rgb;
    vec3 sharpBg = texture2D(uSharpBg, sampleUV).rgb;
    vec3 dropColor = sharpBg * 1.06 + uColor * 0.04;

    vec3 color = mix(blurBg, dropColor, insideMask);
    color += spec * 0.75;
    color *= 1.0 - shadow;
    color *= 1.0 - edge;
    gl_FragColor = vec4(mix(blurBg, color, uOpacity), 1.0);
}`

const FRAG_VIDEO = `
precision highp float;
#define MAX_DROPS ${MAX_DROPS}
uniform vec4 uDrops[MAX_DROPS];
uniform int uDropCount;
uniform vec3 uColor;
uniform float uOpacity;
varying vec2 vTexCoord;

void main() {
    vec2 uv = vTexCoord;
    float insideMask = 0.0;
    float spec = 0.0;
    float shadow = 0.0;
    float edge = 0.0;
    float closestDist = 999.0;

    for (int i = 0; i < MAX_DROPS; i++) {
        if (i >= uDropCount) break;
        vec2 center = uDrops[i].xy;
        float radius = uDrops[i].z;
        float speed = uDrops[i].w;
        vec2 delta = uv - center;

        float deform = smoothstep(0.3, 0.5, speed);
        float stretch = 1.0 + deform * 0.3;
        float widen = 1.0 + deform * 0.2;
        vec2 shaped = delta;
        if (delta.y > 0.0) { shaped.y /= stretch; shaped.x /= widen; }
        float dist = length(shaped);
        float norm = dist / radius;

        if (norm < 1.0) {
            float alpha = 1.0 - smoothstep(0.0, 1.0, norm);
            insideMask = max(insideMask, alpha);
            if (dist < closestDist) {
                closestDist = dist;
                float specY = (-delta.y / radius - speed * 0.15);
                spec = smoothstep(0.50, 0.92, specY)
                     * (1.0 - smoothstep(0.05, 0.30, abs(delta.x / radius)));
                spec *= smoothstep(0.72, 0.96, norm) * (1.0 + speed * 0.3);

                float bottomY = delta.y / radius;
                shadow = smoothstep(-0.1, 0.85, bottomY)
                       * smoothstep(0.65, 0.96, norm) * 0.4;

                edge = smoothstep(0.87, 1.0, norm) * 0.22;
            }
        }
    }

    // Video overlay: clear water drops
    float bodyAlpha = insideMask * 0.4 * uOpacity;
    vec3 bodyColor = uColor * 0.5;

    float specAlpha = spec * 0.9;
    vec3 specColor = vec3(1.0);

    float edgeAlpha = edge * 0.35;

    float alpha = clamp(bodyAlpha + specAlpha + edgeAlpha, 0.0, 1.0);

    vec3 color = bodyColor * bodyAlpha + specColor * specAlpha;
    color = mix(color, color * 0.6, shadow * 0.5);
    gl_FragColor = vec4(color, alpha);
}`

function compileShader(type: number, source: string): WebGLShader {
  const shader = gl!.createShader(type)!
  gl!.shaderSource(shader, source)
  gl!.compileShader(shader)
  if (!gl!.getShaderParameter(shader, gl!.COMPILE_STATUS)) {
    console.error('Shader error:', gl!.getShaderInfoLog(shader))
    gl!.deleteShader(shader)
    throw new Error('Shader compilation failed')
  }
  return shader
}

function finishInit() {
  const canvasEl = canvasRef.value!
  const dpr = window.devicePixelRatio || 1
  canvasEl.width = canvasEl.clientWidth * dpr
  canvasEl.height = canvasEl.clientHeight * dpr
  gl!.viewport(0, 0, canvasEl.width, canvasEl.height)
  updateCoverUV()
  simulator = new DropSimulator(canvasEl.width, canvasEl.height, props.config)
}

function updateCoverUV() {
  if (!gl || !program) return
  const c = canvasRef.value!
  const canvasAspect = c.width / c.height
  const fit = (props.config.backgroundFit as string) || 'fitWidth'
  const align = (props.config.cropAlign as string) || 'bottom'
  let sx = 1.0, sy = 1.0, ox = 0.0, oy = 0.0

  if (fit === 'fill') {
    // stretch
  } else if (fit === 'fitWidth') {
    sx = 1.0
    sy = imageAspect / canvasAspect
    if (align === 'top') oy = 0.0
    else if (align === 'center') oy = (1.0 - sy) / 2.0
    else oy = 1.0 - sy
  } else if (fit === 'fitHeight') {
    sy = 1.0
    sx = canvasAspect / imageAspect
    if (align === 'left') ox = 0.0
    else if (align === 'center') ox = (1.0 - sx) / 2.0
    else ox = 1.0 - sx
  } else {
    if (canvasAspect > imageAspect) { sy = 1.0; sx = imageAspect / canvasAspect; ox = (1.0 - sx) / 2.0 }
    else { sx = 1.0; sy = canvasAspect / imageAspect; oy = (1.0 - sy) / 2.0 }
  }
  gl.useProgram(program)
  if (coverScaleLoc) gl.uniform2f(coverScaleLoc, sx, sy)
  if (coverOffsetLoc) gl.uniform2f(coverOffsetLoc, ox, oy)
}

function loadImageBackground(src: string) {
  if (!gl) return
  isVideo = false
  const img = new Image()
  img.onload = () => {
    if (!gl) return
    originalImg = img
    imageAspect = (img.naturalWidth || img.width) / (img.naturalHeight || img.height)

    bgTexture = gl.createTexture()
    gl.bindTexture(gl.TEXTURE_2D, bgTexture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)

    rebuildBlur()
    finishInit()
  }
  img.onerror = () => finishInit()
  img.src = src
}

function rebuildBlur() {
  if (!gl || !originalImg) return
  const c = document.createElement('canvas')
  c.width = originalImg.naturalWidth || originalImg.width
  c.height = originalImg.naturalHeight || originalImg.height
  const bctx = c.getContext('2d')!
  bctx.filter = `blur(${(props.config.blur as number) ?? 3}px)`
  bctx.drawImage(originalImg, 0, 0)

  if (bgBlurTexture) gl.deleteTexture(bgBlurTexture)
  bgBlurTexture = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, bgBlurTexture)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c)
}

function loadVideoBackground(src: string) {
  isVideo = true
  const cleanSrc = src.replace('?type=video', '')
  if (videoRef.value) {
    videoRef.value.src = cleanSrc
    videoRef.value.play().catch(() => {})
  }
}

function initWebGL() {
  const canvas = canvasRef.value!
  gl = canvas.getContext('webgl', { antialias: false, alpha: true, premultipliedAlpha: true })
  if (!gl) { console.error('WebGL not supported'); return }

  const fragSrc = isVideo ? FRAG_VIDEO : FRAG_IMAGE
  const vertShader = compileShader(gl.VERTEX_SHADER, VERT)
  const fragShader = compileShader(gl.FRAGMENT_SHADER, fragSrc)
  program = gl.createProgram()!
  gl.attachShader(program, vertShader)
  gl.attachShader(program, fragShader)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Program link failed')

  const v = new Float32Array([-1,-1,0,1, 1,-1,1,1, -1,1,0,0, 1,1,1,0])
  const buf = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buf)
  gl.bufferData(gl.ARRAY_BUFFER, v, gl.STATIC_DRAW)

  const stride = 16
  posLoc = gl.getAttribLocation(program, 'aPosition')
  gl.enableVertexAttribArray(posLoc)
  gl.vertexAttribPointer(posLoc, 2, gl.FLOAT, false, stride, 0)

  texLoc = gl.getAttribLocation(program, 'aTexCoord')
  gl.enableVertexAttribArray(texLoc)
  gl.vertexAttribPointer(texLoc, 2, gl.FLOAT, false, stride, 8)

  dropUniformLoc = gl.getUniformLocation(program, 'uDrops')
  countUniformLoc = gl.getUniformLocation(program, 'uDropCount')
  colorLoc = gl.getUniformLocation(program, 'uColor')
  refractionLoc = gl.getUniformLocation(program, 'uRefraction')
  opacityLoc = gl.getUniformLocation(program, 'uOpacity')
  coverScaleLoc = gl.getUniformLocation(program, 'uCoverScale')
  coverOffsetLoc = gl.getUniformLocation(program, 'uCoverOffset')

  gl.useProgram(program)
  const hex = (props.config.fillStyle as string) || '#8ED6FF'
  gl.uniform3f(colorLoc, parseInt(hex.slice(1,3),16)/255, parseInt(hex.slice(3,5),16)/255, parseInt(hex.slice(5,7),16)/255)
  if (refractionLoc) gl.uniform1f(refractionLoc, 0.04)
  if (opacityLoc) gl.uniform1f(opacityLoc, (props.config.opacity as number) ?? 1)

  if (isVideo) {
    loadVideoBackground(props.backgroundImage)
    finishInit()
  } else {
    if (videoRef.value) videoRef.value.style.display = 'none'
    loadImageBackground(props.backgroundImage)
  }
}

function render(timestamp: number) {
  if (!gl || !program || !simulator) { animId = requestAnimationFrame(render); return }
  if (!isVideo && !bgTexture) { animId = requestAnimationFrame(render); return }

  gl.useProgram(program)
  simulator.update(timestamp)
  const drops = simulator.getDrops()
  const count = Math.min(drops.length, MAX_DROPS)

  const dropData = new Float32Array(MAX_DROPS * 4)
  const c = canvasRef.value!
  const w = c.width, h = c.height, maxDim = Math.max(w, h)
  for (let i = 0; i < count; i++) {
    const d = drops[i]
    dropData[i*4] = d.x / w
    dropData[i*4+1] = d.y / h
    dropData[i*4+2] = d.r / maxDim
    dropData[i*4+3] = Math.min(Math.abs(d.yspeed) / 5.0, 1.0)
  }
  gl.uniform4fv(dropUniformLoc, dropData)
  gl.uniform1i(countUniformLoc, count)

  if (!isVideo) {
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, bgBlurTexture)
    gl.uniform1i(gl.getUniformLocation(program, 'uBlurBg'), 0)
    gl.activeTexture(gl.TEXTURE1)
    gl.bindTexture(gl.TEXTURE_2D, bgTexture)
    gl.uniform1i(gl.getUniformLocation(program, 'uSharpBg'), 1)
  }

  gl.disable(gl.BLEND)
  gl.clear(gl.COLOR_BUFFER_BIT)
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)

  animId = requestAnimationFrame(render)
}

function handleResize() {
  if (!gl || !canvasRef.value) return
  const canvas = canvasRef.value
  const dpr = window.devicePixelRatio || 1
  canvas.width = canvas.clientWidth * dpr
  canvas.height = canvas.clientHeight * dpr
  gl.viewport(0, 0, canvas.width, canvas.height)
  updateCoverUV()
  simulator?.resize(canvas.width, canvas.height)
}

watch(() => props.backgroundImage, (newSrc) => {
  if (!gl || !newSrc) return
  originalImg = null
  if (bgTexture) { gl.deleteTexture(bgTexture); bgTexture = null }
  if (bgBlurTexture) { gl.deleteTexture(bgBlurTexture); bgBlurTexture = null }

  const willBeVideo = /\.(mp4|webm|ogg|mov)($|\?)/i.test(newSrc) || newSrc.includes('type=video')
  
  if (willBeVideo !== isVideo || !program) {
    isVideo = willBeVideo
    if (program) { gl.deleteProgram(program); program = null }
    nextTick(() => {
      initWebGL()
    })
  } else {
    if (isVideo) {
      loadVideoBackground(newSrc)
    } else {
      loadImageBackground(newSrc)
    }
  }
})

watch(() => props.config, (newCfg) => {
  if (!simulator) return
  simulator.updateConfig(newCfg)
  if (gl && program) {
    gl.useProgram(program)
    const hex = (newCfg.fillStyle as string) || '#8ED6FF'
    if (colorLoc) gl.uniform3f(colorLoc, parseInt(hex.slice(1,3),16)/255, parseInt(hex.slice(3,5),16)/255, parseInt(hex.slice(5,7),16)/255)
    if (opacityLoc) gl.uniform1f(opacityLoc, (newCfg.opacity as number) ?? 1)
    updateCoverUV()
  }
  if (originalImg) rebuildBlur()
}, { deep: true })

onMounted(() => {
  const src = props.backgroundImage || ''
  if (/\.(mp4|webm|ogg|mov)($|\?)/i.test(src) || src.includes('type=video')) {
    isVideo = true
  }

  initWebGL()
  window.addEventListener('resize', handleResize)
  animId = requestAnimationFrame(render)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(animId)
  window.removeEventListener('resize', handleResize)
  if (gl && program) gl.deleteProgram(program)
})
</script>

<template>
  <video ref="videoRef" v-if="isVideo" muted loop playsinline class="bg-video" :style="{ filter: `blur(${(config.blur as number) ?? 3}px)` }" />
  <canvas ref="canvasRef" class="rain-webgl-canvas" />
</template>

<style scoped>
.rain-webgl-canvas {
  position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;
}
.bg-video {
  position: absolute; top: 0; left: 0; width: 100vw; height: 100vh;
  object-fit: cover;
}
</style>
