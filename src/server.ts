import { config } from '@/config';
import { buildApp, buildJobRegistry } from '@/app';
import { webSocketApp } from '@/delivery/websocket/gateway';
import {
  readyBanner,
  registerShutdownHandlers,
  schedulerBanner,
  startServer as runBootstrapSteps,
} from './server-bootstrap';

// Re-exports for backwards compatibility (tests and helpers import them from '@/server').
export { validateEnvironment, step, formatInterval } from './server-bootstrap';

const startServer = async (): Promise<void> => {
  await runBootstrapSteps();

  const jobRegistry = buildJobRegistry();
  jobRegistry.startAll();
  schedulerBanner();

  const app = buildApp();
  const server = app.listen(config.server.port, () => readyBanner(config.server.port));

  webSocketApp.setup(server);
};

registerShutdownHandlers((code: number) => process.exit(code));

// Start the server
startServer();
