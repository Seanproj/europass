// flag-icons의 1x1 SVG. 데이터셋에 있는 나라만 번들에 넣는다 (countries.json과 목록을 맞출 것)
const FLAG_URLS = import.meta.glob<string>(
  '../../../node_modules/flag-icons/flags/1x1/{ad,al,at,ba,be,bg,ch,cy,cz,de,dk,ee,es,fi,fr,gb,gr,hr,hu,ie,is,it,li,lt,lu,lv,mc,me,mk,mt,nl,no,pl,pt,ro,rs,se,si,sk,sm,xk}.svg',
  { eager: true, query: '?url', import: 'default' },
);

/** 원형 국기 SVG 주소 (공유 카드에서도 그대로 그린다) */
export const flagUrl = (code: string): string | undefined =>
  FLAG_URLS[`../../../node_modules/flag-icons/flags/1x1/${code.toLowerCase()}.svg`];
