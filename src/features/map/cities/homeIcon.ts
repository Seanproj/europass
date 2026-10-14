import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { House } from 'lucide-react';

/** lucide House 아이콘을 원형 배지에 얹은 지도 이미지 (MapLibre addImage용) */
export async function renderHomeIcon(colors: { fg: string; bg: string }, dpr: number): Promise<ImageData> {
  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() => root.render(createElement(House, { size: 14, color: colors.fg, strokeWidth: 2.4 })));
  const svg = host.innerHTML;
  root.unmount();

  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  await img.decode();

  const size = Math.round(24 * dpr);
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = colors.bg;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
  ctx.fill();
  const icon = 14 * dpr;
  ctx.drawImage(img, (size - icon) / 2, (size - icon) / 2, icon, icon);
  return ctx.getImageData(0, 0, size, size);
}
