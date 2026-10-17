export type MapPinState =
  | 'Default'
  | 'Unselected'
  | 'Selected'
  | 'Cluster'
  | 'UserLocation';

type MapPinAction = {
  onPress?: () => void;
};

export type MapPinProps = MapPinAction &
  (
    | {
        state?: 'Default' | 'Unselected' | 'Selected';
        uri?: string;
        /**
         * Desenha o selo de cadeado no canto superior direito do pin (evento
         * privado, pin no ponto aproximado). Padrão `false`. Só existe nos
         * estados de evento — `Cluster` e `UserLocation` não têm essa prop.
         */
        isApproximate?: boolean;
      }
    | {
        state: 'Cluster';
        count: number;
      }
    | {
        state: 'UserLocation';
      }
  );
