/**
 * 도장 "쾅" 소리. 파일 없이 Web Audio로 합성한다 (외부 리소스·용량 0):
 * 낮게 떨어지는 사인파 "쿵" + 아주 짧은 잡음 "탁"(종이에 닿는 소리).
 * 기기 무음·볼륨은 브라우저와 OS에 맡긴다
 */

const KEY = 'euro-passport:stamp-sound';

/** 기본은 켬. 끈 경우만 기록한다 (기기마다 다를 수 있어 localStorage) */
export function loadSoundSetting(): boolean {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
}

export function saveSoundSetting(on: boolean) {
  try {
    if (on) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, 'off');
  } catch {
    // 저장이 막혀도 무시
  }
}

/** 도장이 "쾅" 하고 닿는 순간 (도장 연출 스프링 260ms 중) */
export const IMPACT_DELAY = 0.12;

type AudioCtor = typeof AudioContext;
let ctx: AudioContext | null = null;

/** 설정이 켜져 있으면 소리를 낸다. 실제로 재생을 예약했으면 true */
export function playStampSound(delay = IMPACT_DELAY): boolean {
  if (!loadSoundSetting()) return false;
  const AC: AudioCtor | undefined =
    window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext;
  if (!AC) return false;
  try {
    // 첫 체크인(사용자 탭) 때 만든다 — 브라우저 자동 재생 정책
    ctx ??= new AC();
    if (ctx.state === 'suspended') void ctx.resume();
    const t = ctx.currentTime + delay;

    // 쿵: 140Hz → 55Hz로 떨어지며 0.16초 안에 사라짐
    const osc = ctx.createOscillator();
    const body = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.09);
    body.gain.setValueAtTime(0.0001, t);
    body.gain.exponentialRampToValueAtTime(0.7, t + 0.005);
    body.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(body).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.18);

    // 탁: 40ms 잡음을 낮은 쪽만 남겨 종이 소리처럼
    const len = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1800;
    const tap = ctx.createGain();
    tap.gain.value = 0.35;
    noise.connect(filter).connect(tap).connect(ctx.destination);
    noise.start(t);
    return true;
  } catch {
    // 오디오를 못 쓰는 환경이면 조용히 넘어간다 (진동과 연출은 그대로)
    return false;
  }
}
