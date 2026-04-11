import { IncomingMessage, Server } from 'http';
import { WsChannel } from '@/utils/ws-channel';
import { statusService } from '@/services/status.service';
import { isAuthorized } from '@/middlewares/auth.middleware';

class WebSocketService {
  private channels: Map<string, WsChannel> = new Map();

  setup(server: Server): void {
    this.setupChannels();

    server.on('upgrade', (req: IncomingMessage, socket, head) => {
      if (!isAuthorized(req)) {
        socket.write('HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n');
        socket.destroy();
        return;
      }

      const url = req.url?.split('?')[0] ?? '';
      const channel = this.channels.get(url);
      if (!channel) {
        socket.destroy();
        return;
      }
      channel.handleUpgrade(req, socket, head);
    });
  }

  private setupChannels(): void {
    // Status WebSocket
    const statusChannel = new WsChannel((ws) => {
      ws.send(JSON.stringify(statusService.getStatusSnapshot()));
    });
    this.channels.set('/api/v1/status', statusChannel);
    statusService.registerStateChangeCallback(() => {
      statusChannel.broadcast(JSON.stringify(statusService.getStatusSnapshot()));
    });
  }
}

export const webSocketService = new WebSocketService();
