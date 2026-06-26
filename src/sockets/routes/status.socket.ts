import { WsChannel } from '@/utils/ws-channel';
import { statusService } from '@/services/status.service';
import { log } from '@/services/log.service';

const statusChannel = new WsChannel((ws) => {
  const route = '/api/v1/status';

  log.debug(`WebSocket ${route} client connected`);

  ws.on('close', () => {
    log.info(`WebSocket ${route} client disconnected`);
  });

  ws.on('error', (err) => {
    log.error(`WebSocket ${route} client error:`, err);
  });
});

statusChannel.broadcast(JSON.stringify(statusService.getCleanSnapshot()));

statusService.registerStateChangeCallback(() => {
  statusChannel.broadcast(JSON.stringify(statusService.getCleanSnapshot()));
});

export const statusSocket = statusChannel;
