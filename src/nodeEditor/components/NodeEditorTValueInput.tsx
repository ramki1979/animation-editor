import React from "react";
import { NumberInput } from "~/components/common/NumberInput";
import { compileStylesheetLabelled } from "~/util/stylesheets";
import { NODE_EDITOR_NODE_H_PADDING } from "~/constants";

const s = compileStylesheetLabelled(({ css }) => ({
	container: css`
		height: 20px;
		padding: 2px 0;

		&--horizontalPadding {
			padding-left: ${NODE_EDITOR_NODE_H_PADDING};
			padding-right: ${NODE_EDITOR_NODE_H_PADDING};
		}

		&--paddingLeft {
			padding-left: ${NODE_EDITOR_NODE_H_PADDING};
		}

		&--paddingRight {
			padding-right: ${NODE_EDITOR_NODE_H_PADDING};
		}
	`,
}));

interface Props {
	label: string;
	value: number;
	onChange: (value: number) => void;
	onChangeEnd: ((type: "relative" | "absolute") => void) | undefined;
	horizontalPadding?: boolean;
	paddingRight?: boolean;
	paddingLeft?: boolean;
}

export const NodeEditorTValueInput: React.FC<Props> = (props) => {
	const { horizontalPadding = false, paddingLeft = false, paddingRight = false } = props;
	return (
		<div className={s("container", { horizontalPadding, paddingLeft, paddingRight })}>
			<NumberInput
				label={props.label}
				value={props.value}
				onChange={props.onChange}
				onChangeEnd={props.onChangeEnd}
				max={1}
				min={0}
				decimalPlaces={2}
				tick={0.01}
				fullWidth
				fillWidth
			/>
		</div>
	);
};
