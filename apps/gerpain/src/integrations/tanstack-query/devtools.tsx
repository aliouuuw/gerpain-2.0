import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools'
import { useRouteContext } from '@tanstack/react-router'

export function AppDevtools() {
  const { queryClient } = useRouteContext({ from: '__root__' })

  return (
    <>
      <ReactQueryDevtools client={queryClient} buttonPosition="bottom-left" />
      <TanStackRouterDevtools position="bottom-right" />
    </>
  )
}
