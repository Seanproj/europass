import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

/** 그리기 대신 호출만 기록하는 가짜 AudioContext */
function fakeAudio() {
  const log: string[] = [];
  const param = () => ({
    setValueAtTime: () => undefined,
    exponentialRampToValueAtTime: () => undefined,
    value: 0,
  });
  const node = (name: string) => ({
    connect(next: unknown) {
      return next;
    },
    start: () => log.push(`${name}.start`),
    stop: () => undefined,
    frequency: param(),
    gain: param(),
    type: '',
    buffer: null as unknown,
  });
  class Ctx {
    state = 'running';
    currentTime = 0;
    sampleRate = 8000;
    destination = node('dest');
    constructor() {
      log.push('new');
    }
    resume = () => Promise.resolve();
    createOscillator = () => node('osc');
    createGain = () => node('gain');
    createBiquadFilter = () => node('filter');
    createBufferSource = () => node('noise');
    createBuffer = (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) });
  }
  return { Ctx, log };
}

describe('도장 소리', () => {
  let audio: ReturnType<typeof fakeAudio>;
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    audio = fakeAudio();
    vi.stubGlobal('AudioContext', audio.Ctx);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('기본은 켬: 쿵(사인파)과 탁(잡음)을 재생', async () => {
    const { loadSoundSetting, playStampSound } = await import('./stampSound');
    expect(loadSoundSetting()).toBe(true);
    expect(playStampSound()).toBe(true);
    expect(audio.log).toEqual(['new', 'osc.start', 'noise.start']);
    // 두 번째부터는 같은 AudioContext를 다시 쓴다
    playStampSound();
    expect(audio.log.filter((l) => l === 'new')).toHaveLength(1);
  });

  it('끄면 소리를 내지 않고, 설정은 기기에 남는다', async () => {
    const { loadSoundSetting, playStampSound, saveSoundSetting } = await import('./stampSound');
    saveSoundSetting(false);
    expect(loadSoundSetting()).toBe(false);
    expect(playStampSound()).toBe(false);
    expect(audio.log).toEqual([]);
    saveSoundSetting(true);
    expect(loadSoundSetting()).toBe(true);
  });

  it('기념 소리는 세 음, 같은 설정을 따른다', async () => {
    const { playMilestoneSound, saveSoundSetting } = await import('./stampSound');
    expect(playMilestoneSound()).toBe(true);
    expect(audio.log).toEqual(['new', 'osc.start', 'osc.start', 'osc.start']);
    saveSoundSetting(false);
    expect(playMilestoneSound()).toBe(false);
    expect(audio.log).toHaveLength(4);
  });

  it('오디오를 못 쓰는 브라우저에서는 조용히 넘어간다', async () => {
    vi.stubGlobal('AudioContext', undefined);
    const { playStampSound } = await import('./stampSound');
    expect(playStampSound()).toBe(false);
  });
});
