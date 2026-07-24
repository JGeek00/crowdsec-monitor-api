import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebSocketServer, WebSocket } from 'ws';
import { WsChannel } from '@/utils/ws-channel';

vi.mock('ws', () => {
  const mockWebSocket = vi.fn();
  mockWebSocket.OPEN = 1;

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

  beforeEach(() => {
    vi.clearAllMocks();
    mockSubscribeHandler = vi.fn();
    channel = new WsChannel(mockSubscribeHandler);
  });

  it('creates a WebSocketServer with noServer: true', () => {
    expect(WebSocketServer).toHaveBeenCalledWith({ noServer: true });
  });

  it('calls onConnect when a client connects', () => {
    const connectionHandler = (WebSocketServer.prototype.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: [string]) => call[0] === 'connection',
    );
    expect(connectionHandler).toBeDefined();

    const mockWs = { on: vi.fn(), readyState: WebSocket.OPEN, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    connectionHandler[1](mockWs);

    expect(mockSubscribeHandler).toHaveBeenCalledWith(mockWs);
  });

  it('broadcasts message to connected clients', () => {
    const connectionHandler = (WebSocketServer.prototype.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: [string]) => call[0] === 'connection',
    );
    const mockWs1 = { on: vi.fn(), readyState: WebSocket.OPEN, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    const mockWs2 = { on: vi.fn(), readyState: WebSocket.OPEN, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    connectionHandler[1](mockWs1);
    connectionHandler[1](mockWs2);

    channel.broadcast('test message');

    expect(mockWs1.send).toHaveBeenCalledWith('test message');
    expect(mockWs2.send).toHaveBeenCalledWith('test message');
  });

  it('skips closed clients during broadcast', () => {
    const connectionHandler = (WebSocketServer.prototype.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: [string]) => call[0] === 'connection',
    );
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
    const connectionHandler = (WebSocketServer.prototype.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: [string]) => call[0] === 'connection',
    );
    const mockWs = { on: vi.fn(), readyState: WebSocket.OPEN, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    connectionHandler[1](mockWs);

    channel.broadcast('before');
    expect(mockWs.send).toHaveBeenCalledWith('before');

    // Simulate close event
    const closeHandler = mockWs.on.mock.calls.find((c: [string]) => c[0] === 'close');
    expect(closeHandler).toBeDefined();
    closeHandler[1]();

    mockWs.send.mockClear();
    channel.broadcast('after');
    expect(mockWs.send).not.toHaveBeenCalled();
  });

  it('removes client on error event', () => {
    const connectionHandler = (WebSocketServer.prototype.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: [string]) => call[0] === 'connection',
    );
    const mockWs = { on: vi.fn(), readyState: WebSocket.OPEN, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    connectionHandler[1](mockWs);

    const errorHandler = mockWs.on.mock.calls.find((c: [string]) => c[0] === 'error');
    expect(errorHandler).toBeDefined();
    errorHandler[1]();

    mockWs.send.mockClear();
    channel.broadcast('after error');
    expect(mockWs.send).not.toHaveBeenCalled();
  });

  it('pong resets isAlive on connected client', () => {
    const connectionHandler = (WebSocketServer.prototype.on as ReturnType<typeof vi.fn>).mock.calls.find(
      (call: [string]) => call[0] === 'connection',
    );
    const mockWs = { on: vi.fn(), readyState: WebSocket.OPEN, send: vi.fn(), ping: vi.fn(), terminate: vi.fn() };
    connectionHandler[1](mockWs);

    const pongHandler = mockWs.on.mock.calls.find((c: [string]) => c[0] === 'pong');
    expect(pongHandler).toBeDefined();
    // Should not throw
    expect(() => pongHandler[1]()).not.toThrow();
  });
});
