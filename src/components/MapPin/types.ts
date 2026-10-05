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
      }
    | {
        state: 'Cluster';
        count: number;
      }
    | {
        state: 'UserLocation';
      }
  );