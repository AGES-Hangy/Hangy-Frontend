// Folder names under `(tabs)/(screens)/` that should hide the bottom tab bar when focused.
//
// EventDetail e ManageEvent têm ação fixa no rodapé (o CTA do evento e o par
// "Editar evento"/"Cancelar evento") e, no Figma, nenhuma das duas mostra a
// barra de abas — ela brigaria com esses botões.
export const noNavbarScreens: string[] = ['CreateEvent', 'EventDetail', 'ManageEvent'];
