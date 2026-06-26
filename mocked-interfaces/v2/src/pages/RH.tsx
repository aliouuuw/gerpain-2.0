import { Card } from '../components/Card';
import { agents } from '../data';

export function RH() {
  return (
    <main className="page-content">
      <section className="cards-grid">
        {agents.map((agent) => (
          <Card key={agent.id}>
            <div className="agent-card">
              <div className="agent-avatar agent-avatar-lg">{agent.initials}</div>
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
  );
}
