import { afterEach, describe, expect, it, vi } from 'vitest';
import { estimateStorage, formatBytes, isQuotaError } from './storage';

describe('storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('용량 형식', () => {
    expect(formatBytes(500)).toBe('1KB');
    expect(formatBytes(300 * 1024)).toBe('300KB');
    expect(formatBytes(3.25 * 1024 ** 2)).toBe('3.3MB');
    expect(formatBytes(120 * 1024 ** 2)).toBe('120MB');
    expect(formatBytes(1.5 * 1024 ** 3)).toBe('1.5GB');
  });

  it('용량 초과 오류 판별 (Dexie가 감싼 것도)', () => {
    expect(isQuotaError(new DOMException('x', 'QuotaExceededError'))).toBe(true);
    expect(isQuotaError({ name: 'AbortError', inner: { name: 'QuotaExceededError' } })).toBe(true);
    expect(isQuotaError(new Error('x'))).toBe(false);
    expect(isQuotaError(null)).toBe(false);
  });

  it('estimate가 없거나 실패하면 null', async () => {
    vi.stubGlobal('navigator', { storage: undefined });
    expect(await estimateStorage()).toBeNull();
    vi.stubGlobal('navigator', { storage: { estimate: () => Promise.resolve({ usage: 90, quota: 100 }) } });
    expect(await estimateStorage()).toEqual({ usage: 90, quota: 100, ratio: 0.9 });
    vi.stubGlobal('navigator', { storage: { estimate: () => Promise.reject(new Error('no')) } });
    expect(await estimateStorage()).toBeNull();
  });
});
