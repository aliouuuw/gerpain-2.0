import { Card } from '#/components/ui/Card'
import { agents } from '#/mock/operational'

export function EquipeView() {
  return (
    <main className="page-content">
      <section className="cards-grid">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <div className="agent-card">
              <div className="avatar agent-avatar-lg">{agent.initials}</div>
              <div className="agent-card-info">
                <div className="agent-name">{agent.name}</div>
                <div className="agent-role">{agent.role}</div>
                <div className="agent-phone">{agent.phone}</div>
              </div>
            </div>
          </Card>
        ))}
      </section>
    </main>
  )
}
