import { useEffect, useRef } from 'react'
import { checkBracketWrapping } from '../hooks/useBracketWrapping.js'

/**
 * BracketText component:
 * Encloses text in brackets. If the bracketed text exceeds the maximum width
 * of its containing block, programmatically removes the brackets and wraps cleanly
 * to the next line as normal multiline text.
 */
export default function BracketText({
  children,
  as: Component = 'span',
  className = '',
  ...props
}) {
  const ref = useRef(null)

  useEffect(() => {
    if (ref.current) {
      checkBracketWrapping(ref.current)
    }
  })

  // Format children with brackets if not already present
  const rawText = typeof children === 'string' ? children.trim() : ''
  const bracketed = rawText.startsWith('[') && rawText.endsWith(']') ? rawText : `[ ${rawText} ]`

  return (
    <Component
      ref={ref}
      className={`bracket-token ${className}`}
      data-bracket="true"
      data-original-bracket={bracketed}
      {...props}
    >
      {bracketed}
    </Component>
  )
}
