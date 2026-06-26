import { ORPCError } from '@orpc/server'

const MANAGER_ROLES = new Set(['owner', 'admin'])

export function isManagerRole(role: string): boolean {
  return MANAGER_ROLES.has(role)
}

export function assertManagerRole(role: string): void {
  if (!isManagerRole(role)) {
    throw new ORPCError('FORBIDDEN', {
      message: 'Action réservée aux responsables',
    })
  }
}
