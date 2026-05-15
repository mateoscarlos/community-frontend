import { useEffect } from 'react'

/**
 * Locks `<html>` and `<body>` scroll while the component is mounted.
 * Used on pages that must stay exactly viewport-sized (landing, play) to
 * prevent the 1–2px bounce that mobile browsers introduce with svh/dvh.
 */
export function useLockBodyScroll() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtml = html.style.overflow
    const prevBody = body.style.overflow
    const prevHtmlHeight = html.style.height
    const prevBodyHeight = body.style.height
    html.style.overflow = 'hidden'
    body.style.overflow = 'hidden'
    html.style.height = '100%'
    body.style.height = '100%'
    return () => {
      html.style.overflow = prevHtml
      body.style.overflow = prevBody
      html.style.height = prevHtmlHeight
      body.style.height = prevBodyHeight
    }
  }, [])
}
