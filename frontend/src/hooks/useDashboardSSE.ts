import { useEffect, useRef, useState, useCallback } from 'react';
import { getAuthToken } from '../lib/api.js';

export function useDashboardSSE(onEventReceived?: (event: { type: string; data: any }) => void) {
  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<any>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    const token = getAuthToken();
    if (!token) {
      setIsConnected(false);
      return;
    }

    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
    const sseUrl = `${apiBase}/dashboard/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.addEventListener('connected', () => {
      setIsConnected(true);
    });

    const handleEvent = (type: string, e: MessageEvent) => {
      try {
        const data = JSON.parse(e.data);
        setLastEvent({ type, data, timestamp: Date.now() });
        if (onEventReceived) {
          onEventReceived({ type, data });
        }
      } catch (err) {
        console.error(`[SSE] Error parsing ${type}:`, err);
      }
    };

    es.addEventListener('session:created', (e) => handleEvent('session:created', e));
    es.addEventListener('session:ended', (e) => handleEvent('session:ended', e));
    es.addEventListener('usage:update', (e) => handleEvent('usage:update', e));
    es.addEventListener('transcript:update', (e) => handleEvent('transcript:update', e));

    es.onerror = () => {
      setIsConnected(false);
      es.close();
      // Reconnect with backoff
      setTimeout(() => {
        if (getAuthToken()) {
          connect();
        }
      }, 5000);
    };
  }, [onEventReceived]);

  useEffect(() => {
    connect();
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [connect]);

  return { isConnected, lastEvent, reconnect: connect };
}
