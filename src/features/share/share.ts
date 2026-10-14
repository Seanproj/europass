import { flagUrl } from '../../components/Flag/flagUrl';
import type { Ctx } from '../../lib/canvas';
import { todayISO } from '../../lib/date';
import type { Profile, Visit } from '../../db/types';
import { loadPuzzleData, projectPuzzle } from '../map/puzzle/data';
import { captureMap } from '../map/snapshot';
import { cityCardData, countryCardData, summaryCardData, type WrapData } from './cardData';
import { RecordingContext } from './recorder';
import {
  FEED,
  STORY,
  drawCityCard,
  drawCountryCard,
  drawFeedCard,
  drawStoryCard,
  drawWrapSlide,
  type WrapSlide,
} from './render';
import { readCardTheme } from './theme';

type Size = { w: number; h: number };

/**
 * 카드 한 장을 PNG로. 먼저 기록용 컨텍스트로 한 번 그려 쓰인 글꼴·글자를 모으고,
 * 그 글꼴(한글은 필요한 글자 묶음만)을 다 불러온 뒤 진짜 캔버스에 그린다
 */
export async function renderPng(size: Size, draw: (ctx: Ctx) => void): Promise<Blob> {
  const rec = new RecordingContext();
  draw(rec);
  await Promise.all([...rec.texts].map(([font, text]) => document.fonts.load(font, text).catch(() => [])));
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = size.w;
  canvas.height = size.h;
  draw(canvas.getContext('2d')!);
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('이미지를 만들지 못했어요'))), 'image/png'),
  );
}

function loadImage(url: string | undefined): Promise<HTMLImageElement | null> {
  if (!url) return Promise.resolve(null);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

export type SummaryFormat = 'feed' | 'story';

/** 프로필의 공유 카드 (피드 4:5 / 스토리 9:16) */
export async function makeSummaryCard(
  format: SummaryFormat,
  visits: Visit[],
  profile: Profile,
): Promise<Blob> {
  const size = format === 'feed' ? FEED : STORY;
  const map = await captureMap({
    aspect: size.w / size.h,
    visible: format === 'feed' ? 720 / 1350 : 900 / 1920,
  });
  const data = summaryCardData(visits, profile, todayISO());
  const theme = readCardTheme();
  return renderPng(size, (ctx) =>
    format === 'feed' ? drawFeedCard(ctx, data, theme, map) : drawStoryCard(ctx, data, theme, map),
  );
}

/** 국가 상세의 공유 카드 */
export async function makeCountryCard(code: string, visits: Visit[], profile: Profile): Promise<Blob> {
  const [flag, puzzleData] = await Promise.all([loadImage(flagUrl(code)), loadPuzzleData()]);
  const data = countryCardData(code, visits, profile.name, todayISO());
  const puzzle = projectPuzzle(puzzleData, code, FEED.w - 72 * 2 - 96, 540 - 80);
  const theme = readCardTheme();
  return renderPng(FEED, (ctx) => drawCountryCard(ctx, data, theme, { flag, puzzle }));
}

/** 도시 상세의 공유 카드 (2번 이상 간 도시) */
export async function makeCityCard(cityId: string, visits: Visit[], profile: Profile): Promise<Blob> {
  const data = cityCardData(cityId, visits, profile.name, todayISO());
  if (!data) throw new Error('알 수 없는 도시');
  const photo = data.photo ? await createImageBitmap(data.photo).catch(() => null) : null;
  const theme = readCardTheme();
  return renderPng(FEED, (ctx) => drawCityCard(ctx, data, theme, photo));
}

/** 연말 결산 한 장 */
export async function makeWrapSlide(slide: WrapSlide, data: WrapData): Promise<Blob> {
  const flag = slide === 'country' && data.topCountry ? await loadImage(flagUrl(data.topCountry.code)) : null;
  const theme = readCardTheme();
  return renderPng(STORY, (ctx) => drawWrapSlide(ctx, slide, data, theme, { flag }));
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

/** 공유 시트가 파일을 받을 수 있으면 공유, 아니면 PNG 내려받기 */
export async function shareOrDownload(blob: Blob, fileName: string, title: string): Promise<ShareResult> {
  const file = new File([blob], fileName, { type: blob.type || 'image/png' });
  if (canShareFiles(file)) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return 'cancelled';
      // 공유가 막히면(권한 등) 내려받기로
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}

export function canShareFiles(file?: File): boolean {
  const probe = file ?? new File([new Uint8Array(1)], 'card.png', { type: 'image/png' });
  return typeof navigator.canShare === 'function' && navigator.canShare({ files: [probe] });
}
