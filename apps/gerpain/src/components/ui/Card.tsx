import type { ReactNode } from 'react'

export interface CardProps {
  children: ReactNode
  className?: string
  title?: string
  actions?: ReactNode
}

export function Card({ children, className = '', title, actions }: CardProps) {
  return (
    <div className={`card ${className}`}>
      {title || actions ? (
        <div className="card-header">
          {title ? <span className="card-header__title">{title}</span> : <span />}
          {actions ? <div className="card-header__actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="card-body">{children}</div>
    </div>
  )
}
