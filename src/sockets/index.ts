import { IncomingMessage, Server } from 'http';
import { WsChannel } from '@/utils/ws-channel';
import { AuthMiddleware } from '@/middlewares/auth.middleware';
import { statusSocket } from '@/sockets/routes/status.socket';

export class WebSocketApp {
  private channels: Map<string, WsChannel> = new Map();

  setup(server: Server): void {
    this.registerChannels();

    server.on('upgrade', (req: IncomingMessage, socket, head: Buffer) => {
      if (!req.url) {
        socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      const channelPath = req.url.split('?')[0];
      const channel = this.channels.get(channelPath);

      if (channel) {
        AuthMiddleware.wsAuth(req, socket, head);
        
        if (socket.writableEnded === false) {
          channel.handleUpgrade(req, socket, head);
        }
        return;
      }

      socket.write('HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n');
      socket.destroy();
    });
  }

  private registerChannels(): void {
    this.channels.set('/api/v1/status', statusSocket);
  }
}

export const webSocketApp = new WebSocketApp();
