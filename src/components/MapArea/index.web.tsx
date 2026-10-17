type MapAreaProps = {
  /** Mesmo ponto do pin — o ponto aproximado que a API devolve. */
  center: { latitude: number; longitude: number };
  /** Raio em metros (`location_radius_m` da API). */
  radiusM: number;
};

/**
 * Versão web (Metro resolve `.web.tsx` antes de `.tsx` nesta plataforma) —
 * `react-native-maps` não roda no navegador (importa internals nativos do
 * RN), então não existe `MapView` onde desenhar a área: o componente não
 * renderiza nada, mas mantém a mesma API para o consumidor compilar igual.
 */
export function MapArea(_props: MapAreaProps) {
  return null;
}
