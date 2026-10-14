/** 공유 카드용 안개 지도 스냅샷. 지도가 준비되면 MapView가 등록한다 */
export interface SnapshotRequest {
  /** 카드의 가로/세로 비율 */
  aspect: number;
  /** 카드 위쪽에서 지도가 보이는 비율 (아래는 내용 판이 덮음). 방문 도시가 이 안에 들어오게 맞춘다 */
  visible: number;
}

type Provider = (req: SnapshotRequest) => Promise<HTMLCanvasElement | null>;

let provider: Provider | null = null;

export function registerMapSnapshot(p: Provider | null) {
  provider = p;
}

/** 지도가 없으면(WebGL 없음, 아직 로딩 중) null → 카드는 육지색 바탕으로 */
export async function captureMap(req: SnapshotRequest): Promise<HTMLCanvasElement | null> {
  try {
    return (await provider?.(req)) ?? null;
  } catch {
    return null;
  }
}
