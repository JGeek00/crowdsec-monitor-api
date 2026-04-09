import { WebSocket, WebSocketServer } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';

type WsAlive = WebSocket & { isAlive?: boolean };

export class WsChannel {
  private readonly clients = new Set<WebSocket>();
  private readonly wss = new WebSocketServer({ noServer: true });

  constructor(private readonly onConnect?: (ws: WebSocket) => void) {
    const heartbeatInterval = setInterval(() => {
      for (const ws of this.clients) {
        if ((ws as WsAlive).isAlive === false) {
          this.clients.delete(ws);
          ws.terminate();
          return;
        }
        (ws as WsAlive).isAlive = false;
        ws.ping();
      }
    }, 30_000);
    heartbeatInterval.unref();

    this.wss.on('connection', (ws: WebSocket) => {
      (ws as WsAlive).isAlive = true;
      ws.on('pong', () => { (ws as WsAlive).isAlive = true; });
      this.clients.add(ws);
      this.onConnect?.(ws);
      ws.on('close', () => this.clients.delete(ws));
      ws.on('error', () => this.clients.delete(ws));
    });
  }

  broadcast(payload: string): void {
    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): void {
    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.wss.emit('connection', ws, req);
    });
  }
}
