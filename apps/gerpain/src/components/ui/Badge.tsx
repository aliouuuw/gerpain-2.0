export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface BadgeProps {
  children: string
  variant: BadgeVariant
}

const variantClass: Record<BadgeVariant, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  neutral: 'badge-neutral',
}

export function Badge({ children, variant }: BadgeProps) {
  return <span className={`badge ${variantClass[variant]}`}>{children}</span>
}
