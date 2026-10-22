import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocketServer, WebSocket } from 'ws';
import { WsChannel } from '@/delivery/websocket/ws-channel';

vi.mock('ws', () => {
  const mockWebSocket = vi.fn();
  Object.assign(mockWebSocket, { OPEN: 1 });

  const mockWebSocketServer = vi.fn();
  mockWebSocketServer.prototype.handleUpgrade = vi.fn();
  mockWebSocketServer.prototype.on = vi.fn();

  return {
    WebSocket: mockWebSocket,
    WebSocketServer: mockWebSocketServer,
  };
});

describe('WsChannel', () => {
  let channel: WsChannel;
  let mockSubscribeHandler: ReturnType<typeof vi.fn>;

  /** Extracts an event handler registered on the mocked WebSocketServer. */
  const serverEventHandler = (event: string): [string, (...args: unknown[]) => void] => {
    const onMock = WebSocketServer.prototype.on as unknown as { mock: { calls: unknown[][] } };
    const call = onMock.mock.calls.find((c) => c[0] === event);
    expect(call).toBeDefined();
    return call as unknown as [string, (...args: unknown[]) => void];
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeHandler = vi.fn();
    channel = new WsChannel(mockSubscribeHandler as unknown as (ws: WebSocket) => void);
  });

  it('creates a WebSocketServer with noServer: true', () => {
    expect(WebSocketServer).toHaveBeenCalledWith({ noServer: true });
  });

  it('calls onConnect when a client connects', () => {
    const connectionHandler = serverEventHandler('connection');
    expect(connectionHandler).toBeDefined();

    const mockWs = { on: vi.fn(), readyState: WebSocket.OPEN, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    connectionHandler[1](mockWs);

    expect(mockSubscribeHandler).toHaveBeenCalledWith(mockWs);
  });

  it('broadcasts message to connected clients', () => {
    const connectionHandler = serverEventHandler('connection');
    const mockWs1 = { on: vi.fn(), readyState: WebSocket.OPEN, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    const mockWs2 = { on: vi.fn(), readyState: WebSocket.OPEN, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    connectionHandler[1](mockWs1);
    connectionHandler[1](mockWs2);

    channel.broadcast('test message');

    expect(mockWs1.send).toHaveBeenCalledWith('test message');
    expect(mockWs2.send).toHaveBeenCalledWith('test message');
  });

  it('skips closed clients during broadcast', () => {
    const connectionHandler = serverEventHandler('connection');
    const mockWsOpen = { on: vi.fn(), readyState: WebSocket.OPEN, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    const mockWsClosed = { on: vi.fn(), readyState: 3, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    connectionHandler[1](mockWsOpen);
    connectionHandler[1](mockWsClosed);

    channel.broadcast('test');

    expect(mockWsOpen.send).toHaveBeenCalledWith('test');
    expect(mockWsClosed.send).not.toHaveBeenCalled();
  });

  it('handles upgrade requests', () => {
    const mockReq = {} as any;
    const mockSocket = {} as any;
    const mockHead = Buffer.from('');

    channel.handleUpgrade(mockReq, mockSocket, mockHead);

    expect(WebSocketServer.prototype.handleUpgrade).toHaveBeenCalledWith(
      mockReq,
      mockSocket,
      mockHead,
      expect.any(Function),
    );
  });

  it('removes client on close event', () => {
    const connectionHandler = serverEventHandler('connection');
    const mockWs = { on: vi.fn(), readyState: WebSocket.OPEN, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    connectionHandler[1](mockWs);

    channel.broadcast('before');
    expect(mockWs.send).toHaveBeenCalledWith('before');

    // Simulate close event
    const closeHandler = mockWs.on.mock.calls.find((c) => c[0] === 'close');
    expect(closeHandler).toBeDefined();
    closeHandler![1]();

    mockWs.send.mockClear();
    channel.broadcast('after');
    expect(mockWs.send).not.toHaveBeenCalled();
  });

  it('removes client on error event', () => {
    const connectionHandler = serverEventHandler('connection');
    const mockWs = { on: vi.fn(), readyState: WebSocket.OPEN, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    connectionHandler[1](mockWs);

    const errorHandler = mockWs.on.mock.calls.find((c) => c[0] === 'error');
    expect(errorHandler).toBeDefined();
    errorHandler![1]();

    mockWs.send.mockClear();
    channel.broadcast('after error');
    expect(mockWs.send).not.toHaveBeenCalled();
  });

  it('pong resets isAlive on connected client', () => {
    const connectionHandler = serverEventHandler('connection');
    const mockWs = { on: vi.fn(), readyState: WebSocket.OPEN, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    connectionHandler[1](mockWs);

    const pongHandler = mockWs.on.mock.calls.find((c) => c[0] === 'pong');
    expect(pongHandler).toBeDefined();
    // Should not throw
    expect(() => pongHandler![1]()).not.toThrow();
  });
});
