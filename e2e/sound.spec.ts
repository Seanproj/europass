/** 도장 찍는 소리 (Phase 13): 체크인할 때 한 번, 설정에서 끄면 나지 않고 다시 열어도 꺼져 있다 */
import { expect, test, type Page } from '@playwright/test';
import { checkInBySearch, openApp } from './support/app';

type SoundWindow = Window & { __sounds: number };

/** 실제 소리 대신 재생 횟수만 센다 (사인파 start = 도장 한 번) */
async function countSounds(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as SoundWindow;
    w.__sounds = 0;
    const param = () => ({ setValueAtTime() {}, exponentialRampToValueAtTime() {}, value: 0 });
    const node = (onStart?: () => void) => ({
      connect: (n: unknown) => n,
      start: () => onStart?.(),
      stop() {},
      frequency: param(),
      gain: param(),
      type: '',
      buffer: null,
    });
    class FakeAudio {
      state = 'running';
      currentTime = 0;
      sampleRate = 8000;
      destination = node();
      resume = () => Promise.resolve();
      createOscillator = () => node(() => (w.__sounds += 1));
      createGain = () => node();
      createBiquadFilter = () => node();
      createBufferSource = () => node();
      createBuffer = (_c: number, len: number) => ({ getChannelData: () => new Float32Array(len) });
    }
    (window as unknown as { AudioContext: unknown }).AudioContext = FakeAudio;
  });
}

const sounds = (page: Page) => page.evaluate(() => (window as unknown as SoundWindow).__sounds);

test('체크인 소리: 기본으로 나고, 설정에서 끄면 나지 않는다', async ({ page }) => {
  await countSounds(page);
  await openApp(page);
  await checkInBySearch(page, '프라하');
  await expect(page.getByText('프라하 도장 획득')).toBeVisible();
  // 도장 "쾅" 1번 + 첫 나라 기념 "딩-동-댕" 3음 (Phase 15)
  await expect.poll(() => sounds(page)).toBe(4);

  await page.goto('/?profile');
  const toggle = page.getByRole('switch', { name: /도장 소리/ });
  await expect(toggle).toBeChecked();
  await toggle.uncheck();

  // 다시 열어도 꺼져 있다
  await openApp(page);
  await checkInBySearch(page, '파리');
  await expect(page.getByText('파리 도장 획득')).toBeVisible();
  expect(await sounds(page)).toBe(0);
  await page.goto('/?profile');
  await expect(page.getByRole('switch', { name: /도장 소리/ })).not.toBeChecked();
});
