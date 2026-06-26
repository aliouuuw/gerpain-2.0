import type { ReactNode } from 'react'

export interface IconButtonProps {
  children: ReactNode
  'aria-label': string
  onClick?: () => void
}

export function IconButton({
  children,
  'aria-label': ariaLabel,
  onClick,
}: IconButtonProps) {
  return (
    <button type="button" className="icon-btn" aria-label={ariaLabel} onClick={onClick}>
      {children}
    </button>
  )
}
