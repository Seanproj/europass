/** 앱에 함께 배포되는 오픈소스 (런타임 의존성). package.json의 dependencies와 맞출 것 */
export interface License {
  name: string;
  license: string;
  url: string;
}

export const LICENSES: License[] = [
  { name: 'React', license: 'MIT', url: 'https://github.com/facebook/react' },
  { name: 'MapLibre GL JS', license: 'BSD-3-Clause', url: 'https://github.com/maplibre/maplibre-gl-js' },
  { name: 'Dexie.js', license: 'Apache-2.0', url: 'https://github.com/dexie/Dexie.js' },
  { name: 'Zustand', license: 'MIT', url: 'https://github.com/pmndrs/zustand' },
  { name: 'Motion', license: 'MIT', url: 'https://github.com/motiondivision/motion' },
  { name: 'Lucide', license: 'ISC', url: 'https://github.com/lucide-icons/lucide' },
  { name: 'flag-icons', license: 'MIT', url: 'https://github.com/lipis/flag-icons' },
  { name: 'fflate', license: 'MIT', url: 'https://github.com/101arrowz/fflate' },
  { name: 'exifr', license: 'MIT', url: 'https://github.com/MikeKovarik/exifr' },
  { name: 'es-hangul', license: 'MIT', url: 'https://github.com/toss/es-hangul' },
  { name: 'Pretendard', license: 'OFL-1.1', url: 'https://github.com/orioncactus/pretendard' },
  { name: 'JetBrains Mono', license: 'OFL-1.1', url: 'https://github.com/JetBrains/JetBrainsMono' },
];
