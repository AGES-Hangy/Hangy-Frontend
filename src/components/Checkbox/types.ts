export type CheckboxProps = {
	/** Define se o checkbox está marcado. */
	checked?: boolean;
	/** Define se o checkbox representa uma seleção parcial. */
	indeterminate?: boolean;
	/** Impede interação e aplica o visual desabilitado. */
	disabled?: boolean;
	/** Texto associado ao checkbox e incluído na área de toque. */
	label?: string;
	/** Recebe o próximo valor marcado quando o controle é alternado. */
	onChange?: (value: boolean) => void;
};
