/** 데이터·에셋 출처. 앱 정보 화면(Phase 6)에서 그대로 보여준다 */
export interface Attribution {
  name: string;
  /** 무엇에 썼는지 */
  usage: string;
  license: string;
  url: string;
}

export const ATTRIBUTIONS: Attribution[] = [
  {
    name: 'GeoNames',
    usage: '도시 이름, 좌표, 인구',
    license: 'CC BY 4.0',
    url: 'https://www.geonames.org/',
  },
  {
    name: 'Wikidata',
    usage: '도시의 한글, 영문, 현지 이름',
    license: 'CC0 1.0',
    url: 'https://www.wikidata.org/',
  },
  {
    name: 'Natural Earth (world-atlas)',
    usage: '나라 경계, 국기 퍼즐 조각',
    license: 'Public Domain (world-atlas: ISC)',
    url: 'https://www.naturalearthdata.com/',
  },
  {
    name: 'OpenFreeMap · OpenMapTiles · OpenStreetMap',
    usage: '지도 타일과 스타일',
    license: 'OSM 데이터 ODbL, OpenMapTiles 스키마 BSD/CC-BY',
    url: 'https://openfreemap.org/',
  },
  {
    name: 'MapLibre GL JS',
    usage: '지도 렌더링',
    license: 'BSD-3-Clause',
    url: 'https://maplibre.org/',
  },
  {
    name: 'flag-icons',
    usage: '국기 이미지',
    license: 'MIT',
    url: 'https://github.com/lipis/flag-icons',
  },
];
