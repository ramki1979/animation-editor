import React from "react";
import { CompWorkspaceCompChildren } from "~/composition/workspace/layers/CompWorkspaceCompChildren";
import { cssVariables } from "~/cssVariables";
import { compileStylesheetLabelled, StyleParams } from "~/util/stylesheets";

const styles = ({ css }: StyleParams) => ({
	container: css`
		background: ${cssVariables.gray800};
		transform: translate(-50%, -50%);
	`,
});

const s = compileStylesheetLabelled(styles);

interface OwnProps {
	compositionId: string;
	width: number;
	height: number;
	top: number;
	left: number;
}
type Props = OwnProps;

export const CompositionWorkspaceViewport: React.FC<Props> = (props) => {
	const { top, left, width, height } = props;

	return (
		<svg
			className={s("container")}
			width={width}
			height={height}
			x={left}
			y={top}
			style={{ transform: `translate(${left}px, ${top}px)` }}
		>
			<CompWorkspaceCompChildren compositionId={props.compositionId} />
		</svg>
	);
};