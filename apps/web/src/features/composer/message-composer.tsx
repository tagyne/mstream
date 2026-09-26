import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { OutboundMessageResult, Platform, PlatformStatus } from '@mstream/contracts';

export function MessageComposer({ statuses }: { statuses: PlatformStatus[] }) {
  const connected = useMemo(() => statuses.filter((status) => status.state === 'connected').map((status) => status.platform), [statuses]);
  const [selected, setSelected] = useState<Platform[]>([]);
  const [message, setMessage] = useState('');
  const [results, setResults] = useState<OutboundMessageResult[]>([]);
  useEffect(() => setSelected(connected), [connected.join(',')]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!message.trim() || selected.length === 0) return;
    const response = await fetch('/commands/messages', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: message.trim(), destinations: selected }) });
    setResults(await response.json() as OutboundMessageResult[]);
    setMessage('');
  }

  return <form className="composer" onSubmit={submit} aria-labelledby="composer-title">
    <h2 id="composer-title">Répondre</h2>
    <div className="recipient-list">{(['twitch', 'kick'] as const).map((platform) => <label key={platform}><input type="checkbox" checked={selected.includes(platform)} disabled={!connected.includes(platform)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, platform] : current.filter((value) => value !== platform))} /> {platform}</label>)}</div>
    <div className="composer-row"><label className="sr-only" htmlFor="message">Message</label><input id="message" value={message} maxLength={500} onChange={(event) => setMessage(event.target.value)} placeholder="Écrire un message…" /><button type="submit" disabled={!message.trim() || selected.length === 0}>Envoyer</button></div>
    {results.length > 0 && <ul className="result-list" aria-live="polite">{results.map((result) => <li key={result.platform}><span>{result.platform}</span><strong>{result.status}</strong>{result.message && <small>{result.message}</small>}</li>)}</ul>}
  </form>;
}
