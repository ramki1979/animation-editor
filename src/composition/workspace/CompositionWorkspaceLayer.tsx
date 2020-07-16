import React from "react";
import { compileStylesheetLabelled, StyleParams } from "~/util/stylesheets";
import { NodeEditorGraphState } from "~/nodeEditor/nodeEditorReducers";
import { connectActionState } from "~/state/stateUtils";
import { CompositionLayer } from "~/composition/compositionTypes";
import { useLayerNameToProperty } from "~/composition/hook/useLayerNameToProperty";

const styles = ({ css }: StyleParams) => ({
	element: css`
		background: red;
		position: absolute;
	`,
});

const s = compileStylesheetLabelled(styles);

interface OwnProps {
	compositionId: string;
	layerId: string;
}
interface StateProps {
	layer: CompositionLayer;
	graph?: NodeEditorGraphState;
	isSelected: boolean;
}
type Props = OwnProps & StateProps;

const CompositionWorkspaceLayerComponent: React.FC<Props> = (props) => {
	const { layer } = props;

	const nameToProperty = useLayerNameToProperty(props.compositionId, layer.id);

	const {
		Width,
		Height,
		PositionX,
		PositionY,
		Scale,
		Opacity,
		Rotation,
		Fill,
		StrokeWidth,
		StrokeColor,
		BorderRadius,
	} = nameToProperty;

	const fillColor = `rgba(${Fill.join(",")})`;
	const strokeColor = `rgba(${StrokeColor.join(",")})`;

	return (
		<rect
			width={Width}
			height={Height}
			rx={BorderRadius}
			className={s("element")}
			style={{
				left: 0,
				top: 0,
				opacity: Opacity,
				fill: fillColor,
				strokeWidth: StrokeWidth,
				stroke: strokeColor,
				transform: `translateX(${PositionX}px) translateY(${PositionY}px) scale(${Scale}) rotate(${Rotation}deg)`,
				transformOrigin: `${Width / 2}px ${Height / 2}px`,
			}}
		/>
	);
};

const mapState: MapActionState<StateProps, OwnProps> = (
	{ nodeEditor, compositions, compositionSelection },
	{ layerId },
) => {
	const layer = compositions.layers[layerId];
	return {
		layer,
		graph: layer.graphId ? nodeEditor.graphs[layer.graphId] : undefined,
		isSelected: !!compositionSelection.layers[layerId],
	};
};

export const CompositionWorkspaceLayer = connectActionState(mapState)(
	CompositionWorkspaceLayerComponent,
);
