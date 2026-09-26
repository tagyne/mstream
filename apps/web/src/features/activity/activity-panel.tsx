import type { UnifiedEvent } from '@mstream/contracts';

export function ActivityPanel({ events }: { events: UnifiedEvent[] }) {
  return <section className="panel activity-panel" aria-labelledby="activity-title">
    <div className="panel-heading"><h2 id="activity-title">Fil d’actualité</h2><span>{events.length} événements</span></div>
    {events.length === 0 ? <p className="empty-state">Les événements de la session apparaîtront ici.</p> : <ol className="event-list">{events.map((event) => <li key={`${event.platform}-${event.externalId}`}><span className={`platform-badge platform-${event.platform}`}>{event.platform}</span><strong className={`event-type event-${event.type}`}>{event.type}</strong><span>{event.actor ?? 'Plateforme'}</span></li>)}</ol>}
  </section>;
}
