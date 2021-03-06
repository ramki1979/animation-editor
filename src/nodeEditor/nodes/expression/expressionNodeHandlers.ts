import { requestAction } from "~/listener/requestAction";
import { nodeEditorActions } from "~/nodeEditor/nodeEditorActions";
import { getActionState, getAreaActionState } from "~/state/stateUtils";

import { transformGlobalToNodeEditorPosition } from "~/nodeEditor/nodeEditorUtils";
import { getDistance } from "~/util/math";
import { NODE_EDITOR_EXPRESSION_NODE_MIN_TEXTAREA_HEIGHT, AreaType } from "~/constants";
import { NODE_HEIGHT_CONSTANTS } from "~/nodeEditor/util/calculateNodeHeight";
import { getAreaViewport } from "~/area/util/getAreaViewport";

export const expressionNodeHandlers = {
	onTextareaHeightResizeMouseDown: (
		e: React.MouseEvent,
		areaId: string,
		graphId: string,
		nodeId: string,
	) => {
		const { pan, scale } = getAreaActionState<AreaType.NodeEditor>(areaId);
		const viewport = getAreaViewport(areaId, AreaType.NodeEditor);

		const transformMousePosition = (mousePosition: Vec2) =>
			transformGlobalToNodeEditorPosition(mousePosition, viewport, scale, pan);

		const initialMousePos = transformMousePosition(Vec2.fromEvent(e));

		requestAction({ history: true }, (params) => {
			const { submitAction, cancelAction, dispatch, addListener } = params;

			const graph = getActionState().nodeEditor.graphs[graphId];

			const node = graph.nodes[nodeId];

			const { borderWidth, headerHeight, outputHeight, spacing } = NODE_HEIGHT_CONSTANTS;
			const textareaY =
				node.position.y +
				borderWidth +
				headerHeight +
				spacing +
				node.outputs.length * outputHeight +
				(node.outputs.length ? spacing : 0);

			let hasMoved = false;

			addListener.repeated("mousemove", (e) => {
				const mousePos = transformMousePosition(Vec2.fromEvent(e));
				if (!hasMoved) {
					// We don't consider the mouse to be "moved" until the mouse has moved at least
					// 5px from where it was initially.
					if (getDistance(initialMousePos, mousePos) > 5 / scale) {
						hasMoved = true;
					} else {
						return;
					}
				}

				const height = Math.max(
					NODE_EDITOR_EXPRESSION_NODE_MIN_TEXTAREA_HEIGHT,
					Math.round(mousePos.y - textareaY),
				);
				dispatch(
					nodeEditorActions.setExpressionNodeTextareaHeight(graphId, nodeId, height),
				);
			});

			addListener.once("mouseup", () => {
				if (!hasMoved) {
					cancelAction();
					return;
				}

				submitAction("Resize expression node textarea height");
			});
		});
	},
};
