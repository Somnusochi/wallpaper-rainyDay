export interface DropConfig {
  fps: number
  gravityThreshold: number
  gravityAngle: number
  gravityAngleVariance: number
  presetMin: number
  presetBase: number
  presetFreq: number
  rainSpeed: number
  enableCollisions: boolean
  maxDrops: number
}

export interface Drop {
  x: number
  y: number
  r: number
  seed: number
  yspeed: number
  xspeed: number
  skipping: boolean
  slowing: boolean
  collided: boolean
  moving: boolean
  life: number
  trailY: number
}

export class DropSimulator {
  private drops: Drop[] = []
  private lastPhysicsTick = 0
  private gravityY = 0
  private gravityX = 0
  private width: number
  private height: number
  config: DropConfig

  constructor(width: number, height: number, config: DropConfig) {
    this.width = width
    this.height = height
    this.config = { ...config }
    this.recalcGravity()
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
  }

  updateConfig(partial: Partial<DropConfig>) {
    Object.assign(this.config, partial)
    this.recalcGravity()
  }

  private recalcGravity() {
    // Exact rainyday.js formula
    this.gravityY = (this.config.fps * 0.001) / 25
    this.gravityX =
      ((Math.PI / 2 - this.config.gravityAngle) * (this.config.fps * 0.001)) / 50
  }

  update(timestamp: number) {
    // Physics at rainSpeed interval (matches original callback rate)
    if (timestamp - this.lastPhysicsTick >= this.config.rainSpeed) {
      this.spawnDrops()
      this.lastPhysicsTick = timestamp

      for (let i = this.drops.length - 1; i >= 0; i--) {
        if (!this.updateDrop(this.drops[i])) {
          this.drops.splice(i, 1)
        }
      }

      if (this.config.enableCollisions) {
        this.handleCollisions()
      }
    }
  }

  private handleCollisions() {
    const removed = new Set<number>()
    for (let i = 0; i < this.drops.length; i++) {
      if (removed.has(i)) continue
      for (let j = i + 1; j < this.drops.length; j++) {
        if (removed.has(j)) continue
        const a = this.drops[i]
        const b = this.drops[j]
        const dx = a.x - b.x
        const dy = a.y - b.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < a.r + b.r) {
          // rainyday.js COLLISION_SIMPLE: higher drop absorbed, lower takes max radius ×1.001
          if (a.y < b.y) {
            b.r = Math.max(b.r, a.r) * 1.001
            b.x += (a.x - b.x) * 0.5
            b.collided = true
            removed.add(i)
          } else {
            a.r = Math.max(a.r, b.r) * 1.001
            a.x += (b.x - a.x) * 0.5
            a.collided = true
            removed.add(j)
          }
          break // a drop can only collide once per frame
        }
      }
    }
    // Remove absorbed drops (in reverse order to preserve indices)
    const sorted = [...removed].sort((a, b) => b - a)
    for (const i of sorted) {
      this.drops.splice(i, 1)
    }
  }

  getDrops(): Drop[] {
    return this.drops
  }

  private spawnDrops() {
    const { presetMin, presetBase, presetFreq } = this.config
    if (presetFreq >= 1) {
      for (let i = 0; i < presetFreq; i++) {
        this.addDrop(
          Math.random() * this.width,
          Math.random() * this.height,
          presetMin,
          presetBase,
        )
      }
    } else if (Math.random() < presetFreq) {
      this.addDrop(
        Math.random() * this.width,
        Math.random() * this.height,
        presetMin,
        presetBase,
      )
    }
  }

  private addDrop(x: number, y: number, min: number, base: number) {
    if (this.drops.length >= (this.config.maxDrops || 500)) return
    const r = Math.ceil(Math.random() * base + min)
    const moving = r > this.config.gravityThreshold
    this.drops.push({
      x,
      y,
      r,
      seed: 0,
      yspeed: 0,
      xspeed: 0,
      skipping: false,
      slowing: true,
      collided: false,
      moving,
      life: Infinity, // static drops stay forever (like rainyday.js glass canvas)
      trailY: 0,
    })
  }

  private updateDrop(drop: Drop): boolean {
    // Static drops: stay forever (like rainyday.js glass canvas)
    if (!drop.moving) return true

    if (
      drop.y - drop.r > this.height ||
      drop.x - drop.r > this.width ||
      drop.x + drop.r < 0
    ) {
      return false
    }

    if (drop.collided) {
      drop.collided = false
      drop.seed = Math.floor(drop.r * Math.random() * this.config.fps)
      drop.skipping = false
      drop.slowing = false
    } else if (!drop.seed || drop.seed < 0) {
      drop.seed = Math.floor(drop.r * Math.random() * this.config.fps)
      drop.skipping = !drop.skipping
      drop.slowing = true
    }
    drop.seed--

    if (drop.yspeed) {
      if (drop.slowing) {
        drop.yspeed /= 1.1
        drop.xspeed /= 1.1
        if (drop.yspeed < this.gravityY * 0.1) {
          drop.slowing = false
        }
      } else if (drop.skipping) {
        drop.yspeed = this.gravityY * 0.5
        drop.xspeed = this.gravityX * 0.5
      } else {
        drop.yspeed += this.gravityY * Math.floor(drop.r)
        drop.xspeed += this.gravityX * Math.floor(drop.r)
      }
    } else {
      drop.yspeed = this.gravityY
      drop.xspeed = this.gravityX
    }

    if (this.config.gravityAngleVariance !== 0) {
      drop.xspeed +=
        (Math.random() * 2 - 1) * drop.yspeed * this.config.gravityAngleVariance
    }

    drop.y += Math.floor(drop.yspeed)
    drop.x += Math.floor(drop.xspeed)

    // Trail drops: left behind by moving drops (rainyday.js TRAIL_DROPS)
    if (!drop.trailY || drop.y - drop.trailY >= drop.r) {
      drop.trailY = drop.y
      const trailR = Math.ceil(drop.r / 4)
      if (trailR >= 2) {
        this.addDrop(
          drop.x + (Math.random() - 0.5) * drop.r * 0.8,
          drop.y - drop.r * 0.5,
          trailR,
          0,
        )
      }
    }

    return true
  }
}
