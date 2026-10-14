import { describe, expect, it } from 'vitest';
import pkg from '../../package.json';
import { LICENSES } from './licenses';

// 런타임 의존성을 추가하면 앱 정보의 라이선스 목록에도 넣었는지 확인
const NAME_OF: Record<string, string> = {
  react: 'React',
  'react-dom': 'React',
  'maplibre-gl': 'MapLibre GL JS',
  dexie: 'Dexie.js',
  'dexie-react-hooks': 'Dexie.js',
  zustand: 'Zustand',
  motion: 'Motion',
  'lucide-react': 'Lucide',
  'flag-icons': 'flag-icons',
  fflate: 'fflate',
  exifr: 'exifr',
  'es-hangul': 'es-hangul',
  pretendard: 'Pretendard',
  '@fontsource/jetbrains-mono': 'JetBrains Mono',
};

describe('LICENSES', () => {
  it('모든 런타임 의존성이 목록에 있다', () => {
    const names = new Set(LICENSES.map((l) => l.name));
    for (const dep of Object.keys(pkg.dependencies)) {
      expect(NAME_OF[dep], `${dep}를 licenses.ts와 이 테스트에 추가`).toBeDefined();
      expect(names.has(NAME_OF[dep]!)).toBe(true);
    }
  });
});
