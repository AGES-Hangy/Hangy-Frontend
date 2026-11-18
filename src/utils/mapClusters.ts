/**
 * Agrupamento de pins do mapa Ao Vivo: pins que ficariam um por cima do outro
 * na tela viram um pin `Cluster` com a contagem. Funciona em pontos da tela,
 * não em metros, então o grupo se desfaz sozinho conforme o zoom aproxima.
 */

export type Coordinate = { latitude: number; longitude: number };

export type MapRegion = Coordinate & { latitudeDelta: number; longitudeDelta: number };

export type MapSize = { width: number; height: number };

export type MapCluster<T> =
  | { kind: 'single'; item: T }
  | { kind: 'cluster'; key: string; items: T[]; center: Coordinate };

/**
 * Posição aproximada do ponto na tela, em pontos. Ignora a distorção de
 * Mercator dentro da área visível — para decidir se dois pins se encostam,
 * basta.
 */
function toScreen(point: Coordinate, region: MapRegion, size: MapSize) {
  return {
    x: ((point.longitude - region.longitude) / region.longitudeDelta) * size.width,
    y: ((region.latitude - point.latitude) / region.latitudeDelta) * size.height,
  };
}

/**
 * Agrupa, na ordem recebida, cada item com os que ainda estão soltos a menos
 * de `thresholdPt` dele na tela. Guloso e O(n²) — o nearby devolve poucas
 * dezenas de eventos, não vale um índice espacial.
 *
 * A chave do grupo é a do primeiro item, para o `Marker` não remontar a cada
 * movimento do mapa enquanto o grupo continua o mesmo.
 */
export function clusterByScreenDistance<T>(
  items: readonly T[],
  getKey: (item: T) => string,
  getCoordinate: (item: T) => Coordinate,
  region: MapRegion,
  size: MapSize,
  thresholdPt: number,
): MapCluster<T>[] {
  if (size.width <= 0 || size.height <= 0 || region.latitudeDelta <= 0 || region.longitudeDelta <= 0) {
    return items.map((item) => ({ kind: 'single', item }));
  }

  const points = items.map((item) => toScreen(getCoordinate(item), region, size));
  const taken = new Array<boolean>(items.length).fill(false);
  const result: MapCluster<T>[] = [];

  for (let i = 0; i < items.length; i += 1) {
    if (taken[i]) continue;
    taken[i] = true;
    const members = [i];
    for (let j = i + 1; j < items.length; j += 1) {
      if (taken[j]) continue;
      if (Math.hypot(points[j].x - points[i].x, points[j].y - points[i].y) < thresholdPt) {
        taken[j] = true;
        members.push(j);
      }
    }

    if (members.length === 1) {
      result.push({ kind: 'single', item: items[i] });
      continue;
    }

    const groupItems = members.map((index) => items[index]);
    const coordinates = groupItems.map(getCoordinate);
    result.push({
      kind: 'cluster',
      key: `cluster-${getKey(items[i])}`,
      items: groupItems,
      center: {
        latitude: coordinates.reduce((sum, point) => sum + point.latitude, 0) / coordinates.length,
        longitude: coordinates.reduce((sum, point) => sum + point.longitude, 0) / coordinates.length,
      },
    });
  }

  return result;
}

const EARTH_RADIUS_M = 6371000;

/** Maior distância, em metros, entre dois pontos do grupo. */
export function spreadInMeters(points: readonly Coordinate[]): number {
  let max = 0;
  for (let i = 0; i < points.length; i += 1) {
    for (let j = i + 1; j < points.length; j += 1) {
      const a = points[i];
      const b = points[j];
      const lat1 = (a.latitude * Math.PI) / 180;
      const lat2 = (b.latitude * Math.PI) / 180;
      const dLat = lat2 - lat1;
      const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
      const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
      max = Math.max(max, 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h))));
    }
  }
  return max;
}
