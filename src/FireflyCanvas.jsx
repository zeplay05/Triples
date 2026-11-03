import { useEffect, useRef } from 'react'

export default function FireflyCanvas() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')

    let animationFrameId
    let canvasWidth = window.innerWidth
    let canvasHeight = window.innerHeight

    const handleResize = () => {
      if (!canvas) return
      canvasWidth = window.innerWidth
      canvasHeight = window.innerHeight
      canvas.width = canvasWidth
      canvas.height = canvasHeight
    }

    handleResize()
    window.addEventListener('resize', handleResize)

    const numberOfFirefly = 35
    const persons = []

    // Palette: Galactic Tea + warm ambient glow
    const fireflyColors = [
      'rgba(74, 49, 89,',
      'rgba(130, 91, 109,',
      'rgba(185, 136, 131,',
      'rgba(249, 241, 204,',
      'rgba(255, 195, 120,', // warm ember
      'rgba(235, 100, 75,',  // subtle fiery spark matching Triples dragon
    ]

    function getRandomInt(min, max, exept) {
      const i = Math.floor(Math.random() * (max - min + 1)) + min
      if (typeof exept === 'undefined') return i
      if (typeof exept === 'number' && i === exept) return getRandomInt(min, max, exept)
      if (typeof exept === 'object' && i >= exept[0] && i <= exept[1]) return getRandomInt(min, max, exept)
      return i
    }

    function degToRad(deg) {
      return deg * (Math.PI / 180)
    }

    // Slow speed multiplier (ปรับให้ช้าลงตามคำขอ)
    const SPEED_SCALE = 0.4

    class Firefly {
      constructor(id) {
        this.id = id
        this.reset(true)
      }

      reset(initial = false) {
        this.width = getRandomInt(2, 5)
        this.height = this.width
        this.x = getRandomInt(0, Math.max(10, canvas.width - this.width))
        // ขยับจุดเกิดให้ขึ้นมาด้านบนอีกนิด ไม่ให้เริ่มจากขอบล่างสุด
        this.y = initial
          ? getRandomInt(Math.floor(canvas.height * 0.05), Math.max(10, Math.floor(canvas.height * 0.78)))
          : getRandomInt(Math.floor(canvas.height * 0.50), Math.max(10, Math.floor(canvas.height * 0.78)))
        // ปรับ speed ให้นุ่มนวลและ slow ลง
        this.speed = ((this.width <= 4) ? 1.4 : 0.85) * SPEED_SCALE
        this.alpha = getRandomInt(5, 10) / 10
        this.alphaReduction = getRandomInt(1, 3) / 1800 // ค่อยๆ หรี่ช้าลง
        this.color = fireflyColors[getRandomInt(0, fireflyColors.length - 1)]
        // ทิศทางลอยขึ้นด้านบนนุ่มนวล (Upward float angle: 210° - 330°)
        this.direction = getRandomInt(210, 330)
        this.turner = getRandomInt(0, 1) === 0 ? -1 : 1
        this.turnerAmp = getRandomInt(1, 2) * 0.6
        this.stepCounter = 0
        this.changeDirectionFrequency = getRandomInt(40, 180)
        this.shadowBlur = getRandomInt(8, 22)
      }

      walk() {
        let next_x = this.x + Math.cos(degToRad(this.direction)) * this.speed
        let next_y = this.y + Math.sin(degToRad(this.direction)) * this.speed

        // Bounds wrap / bounce
        if (next_x >= (canvas.width - this.width) && (this.direction < 90 || this.direction > 270)) {
          next_x = canvas.width - this.width
          this.direction = getRandomInt(90, 270, this.direction)
        }
        if (next_x <= 0 && (this.direction > 90 && this.direction < 270)) {
          next_x = 0
          this.direction = getRandomInt(0, 360, [90, 270])
        }

        // ขยับขอบเขตล่างให้อยู่สูงขึ้น ไม่ให้จมลงไปข้างล่างสุด
        const maxBottom = Math.max(10, canvas.height * 0.88)
        if (next_y >= maxBottom && (this.direction > 0 && this.direction < 180)) {
          next_y = maxBottom
          this.direction = getRandomInt(200, 340, this.direction)
        }
        if (next_y <= 15 && (this.direction > 180 && this.direction < 360)) {
          next_y = 15
          this.direction = getRandomInt(10, 170, this.direction)
        }

        this.x = next_x
        this.y = next_y

        this.stepCounter++
        if (this.changeDirectionFrequency && this.stepCounter >= this.changeDirectionFrequency) {
          this.turner = this.turner === -1 ? 1 : -1
          this.turnerAmp = getRandomInt(1, 2) * 0.7
          this.stepCounter = 0
          this.changeDirectionFrequency = getRandomInt(30, 180)
        }

        this.direction += this.turner * this.turnerAmp

        // Fade in & out
        this.alpha -= this.alphaReduction
        if (this.alpha <= 0.05) {
          this.reset(false)
        }

        this.render()
      }

      render() {
        context.beginPath()
        context.fillStyle = this.color + Math.max(0, this.alpha) + ')'
        context.arc(
          this.x + this.width / 2,
          this.y + this.height / 2,
          this.width / 2,
          0,
          2 * Math.PI,
          false
        )
        context.shadowColor = this.color + Math.max(0, this.alpha) + ')'
        context.shadowBlur = this.shadowBlur
        context.shadowOffsetX = 0
        context.shadowOffsetY = 0
        context.fill()
      }
    }

    // Initialize fireflies
    for (let i = 0; i < numberOfFirefly; i++) {
      persons.push(new Firefly(i))
    }

    const animate = () => {
      context.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < persons.length; i++) {
        if (persons[i]) {
          persons[i].walk()
        }
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return <canvas ref={canvasRef} className="firefly-bg-canvas" />
}

