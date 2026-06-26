import type { ReactNode } from 'react'

export interface HelpNoteProps {
  children: ReactNode
}

export function HelpNote({ children }: HelpNoteProps) {
  return (
    <p className="help-note" role="note">
      {children}
    </p>
  )
}
