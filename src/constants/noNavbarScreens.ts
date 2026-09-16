// Folder names under `(tabs)/(screens)/` that should hide the bottom tab bar when focused.
//
// These screens either provide their own navigation or have fixed actions in
// the footer, so the tab bar would compete with their primary controls.
export const noNavbarScreens: string[] = [
  'CreateEvent',
  'EventDetail',
  'ManageEvent',
  'EventPublished',
];
