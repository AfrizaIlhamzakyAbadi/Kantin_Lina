import { useEffect } from 'react'

let canvasCtx = null
function getCanvasContext() {
  if (!canvasCtx && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas')
    canvasCtx = canvas.getContext('2d')
  }
  return canvasCtx
}

function measureTextWidth(text, font) {
  const ctx = getCanvasContext()
  if (!ctx) return text.length * 9
  ctx.font = font
  return ctx.measureText(text).width
}

/**
 * Checks an element with bracketed text.
 * If the bracketed text exceeds the maximum width of its containing block,
 * programmatically removes the brackets and treats it as normal multiline text.
 */
export function checkBracketWrapping(el) {
  if (!el || !el.parentElement) return

  const raw = (el.textContent || '').trim()
  if (/^\[.*\]$/.test(raw)) {
    if (el.dataset.originalBracket !== raw && !el.classList.contains('bracket-unwrapped')) {
      el.dataset.originalBracket = raw
    }
  } else if (!el.dataset.originalBracket) {
    return
  }

  const original = el.dataset.originalBracket
  const parent = el.parentElement
  const parentComputed = window.getComputedStyle(parent)
  const paddingLeft = parseFloat(parentComputed.paddingLeft) || 0
  const paddingRight = parseFloat(parentComputed.paddingRight) || 0
  const availableWidth = Math.max(0, parent.clientWidth - paddingLeft - paddingRight)

  if (availableWidth <= 0) return

  const computed = window.getComputedStyle(el)
  const borderLeft = parseFloat(computed.borderLeftWidth) || 0
  const borderRight = parseFloat(computed.borderRightWidth) || 0
  const padLeft = parseFloat(computed.paddingLeft) || 0
  const padRight = parseFloat(computed.paddingRight) || 0
  const extraWidth = borderLeft + borderRight + padLeft + padRight

  const font = computed.font || `${computed.fontSize} ${computed.fontFamily}`
  const measuredWidth = measureTextWidth(original, font) + extraWidth

  if (measuredWidth > availableWidth) {
    // Exceeds container width: programmatically remove brackets and allow multiline wrapping
    const stripped = original.replace(/^\[\s*/, '').replace(/\s*\]$/, '').trim()
    if (el.textContent !== stripped) {
      el.textContent = stripped
    }
    el.classList.add('bracket-unwrapped')
  } else {
    // Fits container width: restore brackets
    if (el.textContent !== original) {
      el.textContent = original
    }
    el.classList.remove('bracket-unwrapped')
  }
}

/**
 * Scans the DOM for bracketed text elements and applies text-wrapping logic.
 */
export function applyAllBracketWrapping(root = document) {
  if (!root || typeof root.querySelectorAll !== 'function') return

  const candidates = root.querySelectorAll(
    '.bracket-token, .result-tag, .sold-out-badge, [data-bracket], .header-status-badge, button, span, p'
  )

  for (const el of candidates) {
    const text = (el.textContent || '').trim()
    if (el.dataset.originalBracket || /^\[.+\]$/.test(text)) {
      if (el.children.length === 0 || el.dataset.originalBracket) {
        checkBracketWrapping(el)
      }
    }
  }
}

/**
 * React hook to auto-apply bracketed text wrapping logic throughout the app.
 */
export default function useBracketWrapping() {
  useEffect(() => {
    let timeoutId = null
    const handler = () => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        applyAllBracketWrapping(document.body)
      }, 50)
    }

    handler()

    window.addEventListener('resize', handler, { passive: true })

    const observer = new MutationObserver(() => {
      handler()
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('resize', handler)
      observer.disconnect()
    }
  }, [])
}
