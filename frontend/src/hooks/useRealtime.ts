/**
 * Hook de tiempo real. Abre un WebSocket a /api/realtime (mismo origen, la
 * cookie httpOnly viaja en el handshake), reconecta con backoff y entrega
 * los eventos del servidor al callback.
 */
import { useEffect, useRef, useState } from "react";

export interface RealtimeEvent {
  type: "ready" | "config.created" | "config.updated" | "config.deleted" | "config.restored" | "pong" | "error";
  configId?: number;
  data?: unknown;
  version?: number;
  at?: number;
}

type Status = "connecting" | "online" | "offline";

export function useRealtime(onEvent: (e: RealtimeEvent) => void) {
  const [status, setStatus] = useState<Status>("connecting");
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closed = false;
    let retry = 0;
    let pingTimer: ReturnType<typeof setInterval> | null = null;

    function connect() {
      if (closed) return;
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${window.location.host}/api/realtime`);
      setStatus("connecting");

      ws.onopen = () => {
        retry = 0;
        setStatus("online");
        pingTimer = setInterval(() => ws?.readyState === 1 && ws.send("ping"), 25_000);
      };

      ws.onmessage = (e) => {
        try {
          onEventRef.current(JSON.parse(e.data));
        } catch {
          /* ignora frames no-JSON */
        }
      };

      ws.onclose = () => {
        if (pingTimer) clearInterval(pingTimer);
        setStatus("offline");
        if (closed) return;
        // backoff exponencial suave (máx 8s)
        retry += 1;
        setTimeout(connect, Math.min(1000 * 2 ** retry, 8000));
      };

      ws.onerror = () => ws?.close();
    }

    connect();
    return () => {
      closed = true;
      if (pingTimer) clearInterval(pingTimer);
      ws?.close();
    };
  }, []);

  return { status };
}
