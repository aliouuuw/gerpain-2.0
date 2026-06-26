import { useQuery } from '@tanstack/react-query'

import { orpc } from '#/lib/orpc-client'

export function usePermissions() {
  const access = useQuery(orpc.me.access.queryOptions({}))

  return {
    memberRole: access.data?.memberRole ?? null,
    canManageCollections: access.data?.canManageCollections ?? false,
    isLoading: access.isLoading,
  }
}
