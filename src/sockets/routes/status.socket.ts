import { WsChannel } from '@/utils/ws-channel';
import { statusService } from '@/services/status.service';

const statusChannel = new WsChannel((ws) => {
  const route = "/api/v1/status";

  console.log(`✓ WebSocket ${route} client connected`);

  ws.on('close', () => {
    console.log(`✗ WebSocket ${route} client disconnected`);
  });

  ws.on('error', (err) => {
    console.error(`WebSocket ${route} client error:`, err);
  });
});

statusChannel.broadcast(JSON.stringify(statusService.getStatusSnapshot()));

statusService.registerStateChangeCallback(() => {
  statusChannel.broadcast(JSON.stringify(statusService.getStatusSnapshot()));
});

export const statusSocket = statusChannel;
