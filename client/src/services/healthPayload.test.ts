import { readServerHealth } from './api';

jest.mock('axios', () => ({
  create: () => ({
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })
}));

test('accepts the server health payload without a success envelope', () => {
  expect(readServerHealth({
    status: 'healthy',
    timestamp: '2026-09-30T00:00:00.000Z',
    version: '1.2.0'
  })).toEqual({
    status: 'healthy',
    timestamp: '2026-09-30T00:00:00.000Z',
    version: '1.2.0'
  });
});

test('accepts a wrapped health payload', () => {
  expect(readServerHealth({
    success: true,
    data: { status: 'ok', timestamp: 't', version: '1.2.0' }
  })).toEqual({
    status: 'ok',
    timestamp: 't',
    version: '1.2.0'
  });
});

test('rejects a payload that is not healthy', () => {
  expect(() => readServerHealth({ error: 'down' })).toThrow('down');
  expect(() => readServerHealth(undefined)).toThrow('Health check failed');
});
