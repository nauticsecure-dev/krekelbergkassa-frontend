'use client';

import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { yardEndpoint } from './YardHistory';

const socketUrl = process.env.NEXT_PUBLIC_YARD_BROADCAST_URL;
const channel = 'private-werfcanvas';

export function useYardRefresh(onRefresh: () => void) {
  const { user } = useAuth();
  const refresh = useRef(onRefresh);
  refresh.current = onRefresh;

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    let checking = false;
    let previous: string | undefined;
    let needsRefresh = false;
    let socket: WebSocket | undefined;
    let retry: number | undefined;

    async function check() {
      if (checking || !navigator.onLine || document.visibilityState === 'hidden') return;
      checking = true;
      try {
        const { revision } = await api<{ revision: string }>(`${yardEndpoint}/revision`);
        if (!active || !revision) return;
        if (needsRefresh || (previous !== undefined && previous !== revision)) refresh.current();
        previous = revision;
        needsRefresh = false;
      } catch {
        needsRefresh = true;
      } finally {
        checking = false;
      }
    }

    function reconnect() {
      needsRefresh = true;
      void check();
    }

    function connect() {
      if (!socketUrl || !active) return;
      let connection: WebSocket;
      try { connection = new WebSocket(socketUrl); } catch { return; }
      socket = connection;
      connection.onmessage = async ({ data }) => {
        try {
          const event = JSON.parse(data);
          if (event.event === 'pusher:connection_established') {
            const { socket_id } = JSON.parse(event.data);
            const { auth } = await api<{ auth: string }>(`${yardEndpoint}/broadcast-auth`, {
              method: 'POST', body: { socket_id, channel_name: channel },
            });
            if (active && connection.readyState === WebSocket.OPEN) {
              connection.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel, auth } }));
            }
          } else if (event.event === 'pusher:ping') {
            connection.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
          } else if (event.channel === channel && ['pusher_internal:subscription_succeeded', 'yard.updated'].includes(event.event)) {
            if (active) refresh.current();
          }
        } catch {
          connection.close();
        }
      };
      connection.onclose = () => { if (active) retry = window.setTimeout(connect, 15000); };
    }

    connect();
    void check();
    const timer = window.setInterval(check, 5000);
    window.addEventListener('online', reconnect);
    document.addEventListener('visibilitychange', check);
    return () => {
      active = false;
      socket?.close();
      window.clearTimeout(retry);
      window.clearInterval(timer);
      window.removeEventListener('online', reconnect);
      document.removeEventListener('visibilitychange', check);
    };
  }, [user?.id]);
}
