export type DialogVariant = 'LeaveEvent' | 'DeleteEvent' | 'SendRequest';

export type DialogProps = {
  visible: boolean;
  variant: DialogVariant;

  onConfirm: () => void;

  onCancel: () => void;
};
