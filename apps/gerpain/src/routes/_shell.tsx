import { createFileRoute, Outlet, useRouterState } from '@tanstack/react-router'

import { DayContextBar } from '#/components/shell/DayContextBar'
import { getShellPageMeta } from '#/components/shell/page-meta'
import { ShellHeader } from '#/components/shell/ShellHeader'
import { TabNav } from '#/components/shell/TabNav'
import { shellSearchSchema } from '#/lib/shell-date'

export const Route = createFileRoute('/_shell')({
  validateSearch: shellSearchSchema,
  component: ShellLayout,
})

function ShellLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname })
  const meta = getShellPageMeta(pathname)

  return (
    <div className="shell-app">
      <ShellHeader />
      <DayContextBar />
      <TabNav />
      <div className="page-header">
        <h1>{meta.title}</h1>
        {meta.subtitle ? <p>{meta.subtitle}</p> : null}
      </div>
      <div className="app-body">
        <Outlet />
      </div>
    </div>
  )
}
