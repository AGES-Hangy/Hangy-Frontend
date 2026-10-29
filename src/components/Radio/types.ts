export type RadioProps = {
	/** Define se o radio está selecionado. */
	selected?: boolean;
	/** Impede interação e aplica o visual desabilitado. */
	disabled?: boolean;
	/** Texto associado ao controle e incluído na área de toque. */
	label?: string;
	/** Chamado ao tocar quando não desabilitado. */
	onChange?: (selected: boolean) => void;
};
