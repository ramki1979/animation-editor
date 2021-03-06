import React from "react";
import { compileStylesheetLabelled } from "~/util/stylesheets";
import { separateLeftRightMouse } from "~/util/mouse";
import { NodeEditorNodeInput } from "~/nodeEditor/nodeEditorIO";
import { nodeHandlers } from "~/nodeEditor/nodes/nodeHandlers";
import { connectActionState } from "~/state/stateUtils";
import { useNumberInputAction } from "~/hook/useNumberInputAction";
import { nodeEditorActions } from "~/nodeEditor/nodeEditorActions";
import NodeStyles from "~/nodeEditor/nodes/Node.styles";
import { NodeEditorTValueInput } from "~/nodeEditor/components/NodeEditorTValueInput";

const s = compileStylesheetLabelled(NodeStyles);

interface OwnProps {
	areaId: string;
	graphId: string;
	nodeId: string;
	index: number;
}
interface StateProps {
	input: NodeEditorNodeInput;
}
type Props = OwnProps & StateProps;

const NodeTValueInputComponent: React.FC<Props> = (props) => {
	const { graphId, nodeId, index, input } = props;

	const { onChange, onChangeEnd } = useNumberInputAction({
		onChange: (value, params) => {
			params.dispatch(nodeEditorActions.setNodeInputValue(graphId, nodeId, index, value));
		},
		onChangeEnd: (_type, params) => {
			params.submitAction("Update input value");
		},
	});

	return (
		<div className={s("input")}>
			<div
				className={s("input__circle")}
				onMouseDown={separateLeftRightMouse({
					left: input.pointer
						? (e) =>
								nodeHandlers.onInputWithPointerMouseDown(
									e,
									props.areaId,
									props.graphId,
									props.nodeId,
									index,
								)
						: (e) =>
								nodeHandlers.onInputMouseDown(
									e,
									props.areaId,
									props.graphId,
									props.nodeId,
									index,
								),
				})}
			/>
			{input.pointer ? (
				<div className={s("input__name")}>{input.name}</div>
			) : (
				<NodeEditorTValueInput
					label={input.name}
					onChange={onChange}
					onChangeEnd={onChangeEnd}
					value={input.value}
					paddingRight
				/>
			)}
		</div>
	);
};

const mapStateToProps: MapActionState<StateProps, OwnProps> = (
	{ nodeEditor },
	{ graphId, nodeId, index },
) => {
	const graph = nodeEditor.graphs[graphId];
	const node = graph.nodes[nodeId];
	return {
		input: node.inputs[index],
	};
};

export const NodeTValueInput = connectActionState(mapStateToProps)(NodeTValueInputComponent);
