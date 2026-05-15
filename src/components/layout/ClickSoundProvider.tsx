'use client'

import { useEffect, useRef } from 'react'

/**
 * Plays a short synthesized mouse-click via Web Audio every time the user
 * clicks an interactive element. Desktop only — on touch devices the sound is
 * skipped (a tap doesn't have the mechanical-mouse association, and the
 * device speaker would broadcast it to anyone nearby). The AudioContext is
 * created lazily on the first real user gesture so autoplay policies are
 * satisfied.
 */
export function ClickSoundProvider() {
  const ctxRef = useRef<AudioContext | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Touch-first devices report `pointer: coarse` — phones, tablets, etc.
    // Stylus-only devices also report coarse, which is fine; they don't have
    // a "click" affordance either.
    const isTouch = window.matchMedia('(pointer: coarse)').matches
    if (isTouch) return

    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const interactive = target.closest(
        'button, a[href], [role="button"], summary'
      ) as HTMLElement | null
      if (!interactive) return
      if (
        interactive instanceof HTMLButtonElement &&
        interactive.disabled
      )
        return
      if (interactive.getAttribute('aria-disabled') === 'true') return
      // Honor an opt-out attribute so we can silence specific elements later
      // (e.g. drag handles, slider thumbs) without ripping out the listener.
      if (interactive.dataset.noClickSound !== undefined) return

      let ctx = ctxRef.current
      if (!ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        if (!AC) return
        ctx = new AC()
        ctxRef.current = ctx
      }
      if (ctx.state === 'suspended') ctx.resume()
      playClick(ctx)
    }

    document.addEventListener('click', handler, true)
    return () => document.removeEventListener('click', handler, true)
  }, [])

  return null
}

function playClick(ctx: AudioContext) {
  // Mechanical mouse-button click — a very short noise burst pushed through a
  // bandpass filter (the "plastic snap"), layered with a low transient thud
  // (the "body" of the button switch). Total duration ~25 ms.
  const now = ctx.currentTime

  // High snap: ~10 ms of white noise centred around 2.6 kHz.
  const snapDuration = 0.012
  const snapBuffer = ctx.createBuffer(
    1,
    Math.max(1, Math.floor(ctx.sampleRate * snapDuration)),
    ctx.sampleRate
  )
  const snapData = snapBuffer.getChannelData(0)
  for (let i = 0; i < snapData.length; i++) {
    snapData[i] = Math.random() * 2 - 1
  }
  const snapSource = ctx.createBufferSource()
  snapSource.buffer = snapBuffer

  const snapFilter = ctx.createBiquadFilter()
  snapFilter.type = 'bandpass'
  snapFilter.frequency.value = 2600
  snapFilter.Q.value = 1.4

  const snapGain = ctx.createGain()
  snapGain.gain.setValueAtTime(0.55, now)
  snapGain.gain.exponentialRampToValueAtTime(0.0005, now + snapDuration)

  snapSource.connect(snapFilter)
  snapFilter.connect(snapGain)
  snapGain.connect(ctx.destination)
  snapSource.start(now)
  snapSource.stop(now + snapDuration + 0.005)

  // Low body: a fast 180 Hz → 90 Hz drop, the "thunk" under the snap.
  const bodyDuration = 0.025
  const body = ctx.createOscillator()
  const bodyGain = ctx.createGain()
  body.connect(bodyGain)
  bodyGain.connect(ctx.destination)
  body.type = 'square'
  body.frequency.setValueAtTime(180, now)
  body.frequency.exponentialRampToValueAtTime(90, now + bodyDuration)
  bodyGain.gain.setValueAtTime(0.12, now)
  bodyGain.gain.exponentialRampToValueAtTime(0.0001, now + bodyDuration)
  body.start(now)
  body.stop(now + bodyDuration + 0.005)
}
