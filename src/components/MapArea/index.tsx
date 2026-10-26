import { Circle } from 'react-native-maps';

import { palette } from '@/constants/colors';
import { withAlpha } from '@/utils/color';

export type MapAreaProps = {
  /** Mesmo ponto do pin — o ponto aproximado que a API devolve. */
  center: { latitude: number; longitude: number };
  /** Raio em metros (`location_radius_m` da API). */
  radiusM: number;
};

// Figma (Components › MapArea): preenchimento palette/primary/700 a 24% e
// borda contínua de 2px em palette/primary/700. O diâmetro de 120px do frame
// é ilustrativo — o tamanho real vem de `radiusM`.
const FILL_OPACITY = 0.24;
const STROKE_WIDTH = 2;

/**
 * Área circular translúcida do local aproximado de um evento privado.
 *
 * Sem estados: se está na tela, é porque o pin está selecionado — quem decide
 * isso é o consumidor. Deve ser filho direto do `MapView`. O raio é em metros,
 * então a área acompanha o zoom do mapa. Não recebe toque: quem seleciona é o
 * `MapPin`.
 *
 * O `center` já é o ponto aproximado; o endereço real fica em algum lugar
 * dentro do círculo, não no centro — não reposicione.
 *
 * Só esta versão (`.tsx`, iOS/Android) importa `react-native-maps`; a web usa
 * `index.web.tsx`.
 */
export function MapArea({ center, radiusM }: MapAreaProps) {
  return (
    <Circle
      center={center}
      radius={radiusM}
      fillColor={withAlpha(palette.primary[700], FILL_OPACITY)}
      strokeColor={palette.primary[700]}
      strokeWidth={STROKE_WIDTH}
    />
  );
}
