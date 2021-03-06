import { areaActions } from "~/area/state/areaActions";
import { areaInitialStates } from "~/area/state/areaInitialStates";
import { computeAreaToViewport } from "~/area/util/areaToViewport";
import { getAreaToOpenTargetId } from "~/area/util/areaUtils";
import { getAreaRootViewport } from "~/area/util/getAreaViewport";
import { compositionActions } from "~/composition/compositionReducer";
import { compSelectionActions } from "~/composition/compositionSelectionReducer";
import { CompositionLayer, CompositionProperty } from "~/composition/compositionTypes";
import {
	getTimelineIdsReferencedByComposition,
	reduceLayerPropertiesAndGroups,
} from "~/composition/compositionUtils";
import {
	didCompSelectionChange,
	getCompSelectionFromState,
} from "~/composition/util/compSelectionUtils";
import { AreaType, COMP_TIME_BETWEEN_LAYERS, COMP_TIME_LAYER_HEIGHT } from "~/constants";
import { isKeyDown } from "~/listener/keyboard";
import {
	requestAction,
	RequestActionCallback,
	RequestActionParams,
	ShouldAddToStackFn,
} from "~/listener/requestAction";
import { createArrayModifierGraph, createLayerGraph } from "~/nodeEditor/graph/createLayerGraph";
import { nodeEditorActions } from "~/nodeEditor/nodeEditorActions";
import { getActionState, getAreaActionState } from "~/state/stateUtils";
import { timelineActions } from "~/timeline/timelineActions";
import { timelineAreaActions } from "~/timeline/timelineAreaReducer";
import { createTimelineContextMenu } from "~/timeline/timelineContextMenu";
import {
	createTimelineForLayerProperty,
	getTimelineValueAtIndex,
	transformGlobalToTimelineX,
} from "~/timeline/timelineUtils";
import {
	getTimelineLayerListHeight,
	getTimelineTrackYPositions,
} from "~/trackEditor/trackEditorUtils";
import { PropertyGroupName } from "~/types";
import { mouseDownMoveAction } from "~/util/action/mouseDownMoveAction";
import { animate } from "~/util/animation/animate";
import { capToRange, getDistance, interpolate } from "~/util/math";

const ZOOM_FAC = 0.25;

export const timelineHandlers = {
	onScrubMouseDown: (
		e: React.MouseEvent,
		options: {
			compositionId: string;
			viewBounds: [number, number];
			viewport: Rect;
			compositionLength: number;
		},
	): void => {
		const { compositionId } = options;

		const composition = getActionState().compositionState.compositions[compositionId];

		const initialPosition = Vec2.fromEvent(e);

		const fn: RequestActionCallback = (params) => {
			const { addListener, dispatch, submitAction } = params;

			const onMove = (e?: MouseEvent) => {
				const pos = e ? Vec2.fromEvent(e) : initialPosition;
				const x = transformGlobalToTimelineX(pos.x, options);
				dispatch(
					compositionActions.setFrameIndex(
						composition.id,
						capToRange(0, composition.length - 1, Math.round(x)),
					),
				);
			};
			addListener.repeated("mousemove", onMove);
			onMove();

			addListener.once("mouseup", () => {
				submitAction("Move scrubber");
			});
		};
		requestAction({ history: true }, fn);
	},

	onZoomClick: (
		e: React.MouseEvent,
		areaId: string,
		options: {
			viewBounds: [number, number];
			width: number;
			left: number;
		},
	): void => {
		const { viewBounds, width, left } = options;

		const mousePos = Vec2.fromEvent(e).subX(left);
		const t = mousePos.x / width;

		let newBounds: [number, number];

		if (isKeyDown("Alt")) {
			const add = Math.abs(viewBounds[0] - viewBounds[1]) * ZOOM_FAC;
			newBounds = [
				capToRange(0, 1, viewBounds[0] - add * t),
				capToRange(0, 1, viewBounds[1] + add * (1 - t)),
			];
		} else {
			const remove = Math.abs(viewBounds[0] - viewBounds[1]) * ZOOM_FAC;
			newBounds = [viewBounds[0] + remove * t, viewBounds[1] - remove * (1 - t)];
		}

		requestAction({ history: false }, ({ dispatch, submitAction }) => {
			animate({ duration: 0 }, (t) => {
				dispatch(
					areaActions.dispatchToAreaState(
						areaId,
						timelineAreaActions.setViewBounds([
							interpolate(viewBounds[0], newBounds[0], t),
							interpolate(viewBounds[1], newBounds[1], t),
						]),
					),
				);
			}).then(() => submitAction());
		});
	},

	onWheelPan: (
		e: WheelEvent,
		areaId: string,
		options: {
			compositionId: string;
			compositionLength: number;
			viewBounds: [number, number];
			viewport: Rect;
			panY: number;
			lockY: boolean;
		},
	): void => {
		const { viewBounds, compositionLength, compositionId } = options;

		requestAction({ history: false }, ({ submitAction, dispatch }) => {
			const compositionState = getActionState().compositionState;

			const [x0, x1] = [0, e.deltaX].map((x) => transformGlobalToTimelineX(x, options));

			const xt0 = x0 / compositionLength;
			const xt1 = x1 / compositionLength;

			const tChange = (xt0 - xt1) * -1;

			const rightShiftMax = 1 - viewBounds[1];
			const leftShiftMax = -viewBounds[0];

			let newBounds = [viewBounds[0], viewBounds[1]] as [number, number];
			if (tChange > rightShiftMax) {
				newBounds[1] = 1;
				newBounds[0] += rightShiftMax;
			} else if (tChange < leftShiftMax) {
				newBounds[0] = 0;
				newBounds[1] += leftShiftMax;
			} else {
				newBounds[0] += tChange;
				newBounds[1] += tChange;
			}

			const toDispatch: any[] = [
				areaActions.dispatchToAreaState(
					areaId,
					timelineAreaActions.setViewBounds(newBounds),
				),
			];

			if (!options.lockY) {
				const yChange = e.deltaY;
				let yPan = options.panY + yChange;

				yPan = Math.min(
					yPan,
					getTimelineLayerListHeight(compositionId, compositionState) -
						options.viewport.height,
				);
				yPan = Math.max(0, yPan);

				toDispatch.push(
					areaActions.dispatchToAreaState(areaId, timelineAreaActions.setPanY(yPan)),
				);
			}

			dispatch(toDispatch);
			submitAction();
		});
	},

	/**
	 * When the user Space + Mouse drags the timeline around
	 */
	onPan: (
		e: React.MouseEvent,
		areaId: string,
		options: {
			compositionId: string;
			compositionLength: number;
			viewBounds: [number, number];
			viewport: Rect;
			panY: number;
			lockY: boolean;
		},
	): void => {
		const { viewBounds, compositionLength, viewport, compositionId } = options;

		const initialMousePosition = Vec2.fromEvent(e);
		const initialPos = transformGlobalToTimelineX(initialMousePosition.x, options);

		const fn: RequestActionCallback = ({ addListener, submitAction, dispatch }) => {
			const compositionState = getActionState().compositionState;

			let initialT = initialPos / compositionLength;

			addListener.repeated("mousemove", (e) => {
				const mousePosition = Vec2.fromEvent(e);
				const pos = transformGlobalToTimelineX(mousePosition.x, options);

				const t = pos / compositionLength;

				const tChange = (t - initialT) * -1;

				const rightShiftMax = 1 - viewBounds[1];
				const leftShiftMax = -viewBounds[0];

				let newBounds = [viewBounds[0], viewBounds[1]] as [number, number];
				if (tChange > rightShiftMax) {
					newBounds[1] = 1;
					newBounds[0] += rightShiftMax;
				} else if (tChange < leftShiftMax) {
					newBounds[0] = 0;
					newBounds[1] += leftShiftMax;
				} else {
					newBounds[0] += tChange;
					newBounds[1] += tChange;
				}

				const toDispatch: any[] = [
					areaActions.dispatchToAreaState(
						areaId,
						timelineAreaActions.setViewBounds(newBounds),
					),
				];

				if (!options.lockY) {
					const yChange = initialMousePosition.y - mousePosition.y;
					let yPan = options.panY + yChange;

					yPan = Math.min(
						yPan,
						getTimelineLayerListHeight(compositionId, compositionState) -
							viewport.height,
					);
					yPan = Math.max(0, yPan);

					toDispatch.push(
						areaActions.dispatchToAreaState(areaId, timelineAreaActions.setPanY(yPan)),
					);
				}

				dispatch(toDispatch);
			});

			addListener.once("mouseup", () => submitAction());
		};
		requestAction({ history: false }, fn);
	},

	onPropertyKeyframeIconMouseDown: (
		e: React.MouseEvent,
		compositionId: string,
		propertyId: string,
		timelineId: string,
	): void => {
		e.stopPropagation();

		const { compositionState, timelines, timelineSelection } = getActionState();
		const composition = compositionState.compositions[compositionId];
		const property = compositionState.properties[propertyId] as CompositionProperty;
		const layer = compositionState.layers[property.layerId];

		if (timelineId) {
			// Delete timeline and make the value of the timeline at the current time
			// the value of the property
			const timeline = timelines[timelineId];
			const value = getTimelineValueAtIndex({
				timeline,
				frameIndex: composition.frameIndex,
				layerIndex: layer.index,
				selection: timelineSelection[timeline.id],
			});

			requestAction({ history: true }, ({ dispatch, submitAction }) => {
				dispatch(
					timelineActions.removeTimeline(timelineId),
					compositionActions.setPropertyValue(propertyId, value),
					compositionActions.setPropertyTimelineId(propertyId, ""),
				);
				submitAction("Remove timeline from property");
			});
			return;
		}

		// Create timeline with a single keyframe at the current time
		requestAction({ history: true }, ({ dispatch, submitAction }) => {
			const timeline = createTimelineForLayerProperty(property.value, composition.frameIndex);
			dispatch(
				timelineActions.setTimeline(timeline.id, timeline),
				compositionActions.setPropertyTimelineId(propertyId, timeline.id),
			);
			submitAction("Add timeline to property");
		});
	},

	onMouseDownOut: (compositionId: string): void => {
		requestAction(
			{ history: true, shouldAddToStack: didCompSelectionChange(compositionId) },
			(params) => {
				const { compositionState } = getActionState();

				params.dispatch(compSelectionActions.clearCompositionSelection(compositionId));

				const timelineIds = getTimelineIdsReferencedByComposition(
					compositionId,
					compositionState,
				);
				params.dispatch(
					timelineIds.map((timelineId) => timelineActions.clearSelection(timelineId)),
				);

				params.submitAction("Clear timeline selection");
			},
		);
	},

	onRightClickOut: (e: React.MouseEvent, compositionId: string): void => {
		const position = Vec2.fromEvent(e);
		createTimelineContextMenu(position, { compositionId });
	},

	onLayerRightClick: (e: React.MouseEvent, layer: CompositionLayer): void => {
		const position = Vec2.fromEvent(e);
		createTimelineContextMenu(position, {
			compositionId: layer.compositionId,
			layerId: layer.id,
		});
	},

	onLayerNameMouseDown: (
		e: React.MouseEvent,
		areaId: string,
		compositionId: string,
		layerId: string,
		layerWrapper: React.RefObject<HTMLDivElement>,
	): void => {
		e.stopPropagation();

		const areaState = getAreaActionState<AreaType.Timeline>(areaId);

		const { compositionState, compositionSelectionState } = getActionState();

		const composition = compositionState.compositions[compositionId];
		const compositionSelection = getCompSelectionFromState(
			compositionId,
			compositionSelectionState,
		);
		const willBeSelected = !compositionSelection.layers[layerId];
		const additiveSelection = isKeyDown("Shift") || isKeyDown("Command");

		const rect = layerWrapper.current!.getBoundingClientRect();

		const yPosMap = getTimelineTrackYPositions(compositionId, compositionState, areaState.panY);

		const getInsertBelowLayerIndex = (
			mousePosGlobal: Vec2,
		): { type: "above" | "below" | "invalid"; layerId: string } | null => {
			const compositionSelection = getCompSelectionFromState(
				compositionId,
				getActionState().compositionSelectionState,
			);

			const mousePos = mousePosGlobal.sub(Vec2.new(rect.left, rect.top));

			for (let i = 0; i < composition.layers.length; i += 1) {
				const l0y = yPosMap.layer[composition.layers[i]];
				const l1y = yPosMap.layer[composition.layers[i + 1]] ?? Infinity;

				if (mousePos.y < l0y || mousePos.y > l1y + COMP_TIME_BETWEEN_LAYERS) {
					continue;
				}

				const distl0 = mousePos.y - l0y;
				const distl1 = l1y - mousePos.y;

				let j = distl0 < distl1 ? i : i + 1;

				for (; j >= 0; j--) {
					const layerId = composition.layers[j];
					const l0y = yPosMap.layer[layerId];
					const l1y = yPosMap.layer[composition.layers[j + 1]] ?? Infinity;

					if (l0y < mousePos.y && mousePos.y < l1y + COMP_TIME_BETWEEN_LAYERS) {
						if (compositionSelection.layers[layerId]) {
							return {
								layerId,
								type: "invalid",
							};
						}

						const distl0 = mousePos.y - l0y;
						const distl1 = yPosMap.layer[composition.layers[j + 1]]
							? l1y - mousePos.y
							: l0y + COMP_TIME_LAYER_HEIGHT - mousePos.y;

						return {
							layerId,
							type: distl0 > distl1 ? "below" : "above",
						};
					}
				}
			}

			return { layerId: "", type: "below" }; // Insert at 0
		};

		const addLayerToSelection = (params: RequestActionParams) => {
			params.dispatch(compSelectionActions.addLayerToSelection(compositionId, layerId));
		};

		const removeLayerFromSelection = (params: RequestActionParams) => {
			params.dispatch(
				compSelectionActions.removeLayersFromSelection(compositionId, [layerId]),
			);
		};

		const clearCompositionSelection = (params: RequestActionParams) => {
			// Clear composition selection
			params.dispatch(compSelectionActions.clearCompositionSelection(compositionId));

			// Clear timeline selection of selected properties
			const timelineIds = getTimelineIdsReferencedByComposition(
				compositionId,
				compositionState,
			);
			params.dispatch(
				timelineIds.map((timelineId) => timelineActions.clearSelection(timelineId)),
			);
		};

		const deselectLayerProperties = (params: RequestActionParams) => {
			// Deselect all properties and timeline keyframes
			const propertyIds = reduceLayerPropertiesAndGroups<string[]>(
				layerId,
				compositionState,
				(acc, property) => {
					acc.push(property.id);
					return acc;
				},
				[],
			).filter((propertyId) => compositionSelection.properties[propertyId]);

			const timelineIds = propertyIds.reduce<string[]>((acc, propertyId) => {
				const property = compositionState.properties[propertyId];

				if (property.type === "property" && property.timelineId) {
					acc.push(property.timelineId);
				}

				return acc;
			}, []);

			params.dispatch(
				compSelectionActions.removePropertiesFromSelection(compositionId, propertyIds),
			);
			params.dispatch(
				timelineIds.map((timelineId) => timelineActions.clearSelection(timelineId)),
			);
		};

		const didLayerOrderChange: ShouldAddToStackFn = (a, b) => {
			const layersA = a.compositionState.compositions[compositionId].layers;
			const layersB = b.compositionState.compositions[compositionId].layers;

			for (let i = 0; i < layersA.length; i += 1) {
				if (layersA[i] !== layersB[i]) {
					return true;
				}
			}

			return false;
		};

		mouseDownMoveAction(e, {
			keys: [],
			shouldAddToStack: [didCompSelectionChange(compositionId), didLayerOrderChange],
			beforeMove: (params) => {
				if (!additiveSelection && willBeSelected) {
					// The selection is non-additive and the layer will be selected.
					//
					// Clear the composition selection and then add the layer to selection.
					clearCompositionSelection(params);
					addLayerToSelection(params);
					return;
				}

				if (additiveSelection && !willBeSelected) {
					// The selection is additive and the layer will NOT be selected.
					//
					// Deselect the layer and its properties.
					deselectLayerProperties(params);
					removeLayerFromSelection(params);
				}
			},
			mouseMove: (params, { mousePosition }) => {
				// Layer was deselected, do not move selected layers.
				if (additiveSelection && !willBeSelected) {
					return;
				}

				params.dispatchToAreaState(
					areaId,
					timelineAreaActions.setFields({
						moveLayers: getInsertBelowLayerIndex(mousePosition.global),
					}),
				);
			},
			mouseUp: (params) => {
				if (additiveSelection && !willBeSelected) {
					params.submitAction("Remove layer from selection");
					return;
				}

				const { moveLayers } = getAreaActionState<AreaType.Timeline>(areaId);

				if (moveLayers) {
					// Clear `moveLayers`
					params.dispatchToAreaState(
						areaId,
						timelineAreaActions.setFields({ moveLayers: null }),
					);

					if (moveLayers.type === "invalid") {
						params.submitAction("Add layer to selection");
						return;
					}

					const { compositionSelectionState } = getActionState();

					params.dispatch(
						compositionActions.moveLayers(
							compositionId,
							moveLayers as { layerId: string; type: "above" | "below" },
							compositionSelectionState,
						),
					);
					params.submitAction("Move layers");
					return;
				}

				if (!additiveSelection) {
					clearCompositionSelection(params);
				}

				addLayerToSelection(params);

				params.submitAction("Add layer to selection");
				// See if we are moving layer to an eligible target
			},
		});
	},

	onPropertyGraphMouseDown: (e: React.MouseEvent, propertyId: string): void => {
		e.stopPropagation();

		const compositionState = getActionState().compositionState;
		const property = compositionState.properties[propertyId];

		if (property.name !== PropertyGroupName.ArrayModifier) {
			throw new Error("Only ArrayModifier property groups may have an associated graph");
		}

		requestAction({ history: true }, (params) => {
			const { dispatch, submitAction } = params;

			// If graph exists, delete it. If not, create one.
			if (property.graphId) {
				dispatch(compositionActions.setPropertyGraphId(propertyId, ""));
				dispatch(nodeEditorActions.removeGraph(property.graphId));
				submitAction("Remove array modifier graph");
				return;
			}

			const graph = createArrayModifierGraph(propertyId);

			dispatch(compositionActions.setPropertyGraphId(propertyId, graph.id));
			dispatch(nodeEditorActions.setGraph(graph));
			submitAction("Create array modifier graph");
		});
	},

	onLayerGraphMouseDown: (e: React.MouseEvent, layerId: string): void => {
		e.stopPropagation();

		const compositionState = getActionState().compositionState;
		const layer = compositionState.layers[layerId];

		requestAction({ history: true }, (params) => {
			const { dispatch, submitAction } = params;

			// If graph exists, delete it. If not, create one.
			if (layer.graphId) {
				dispatch(compositionActions.setLayerGraphId(layerId, ""));
				dispatch(nodeEditorActions.removeGraph(layer.graphId));
				submitAction("Remove layer graph");
				return;
			}

			const graph = createLayerGraph(layerId);

			dispatch(compositionActions.setLayerGraphId(layerId, graph.id));
			dispatch(nodeEditorActions.setGraph(graph));
			submitAction("Create layer graph");
		});
	},

	onOpenGraphInAreaMouseDown: (e: React.MouseEvent, graphId: string): void => {
		const initialMousePos = Vec2.fromEvent(e);

		requestAction({ history: true }, (params) => {
			const { dispatch, cancelAction, submitAction, addListener } = params;

			let hasMoved = false;
			let mousePos!: Vec2;

			addListener.repeated("mousemove", (e) => {
				mousePos = Vec2.fromEvent(e);

				if (!hasMoved) {
					if (getDistance(initialMousePos, mousePos) > 5) {
						hasMoved = true;
					} else {
						return;
					}
				}

				dispatch(
					areaActions.setFields({
						areaToOpen: {
							position: mousePos,
							area: {
								type: AreaType.NodeEditor,
								state: {
									...areaInitialStates[AreaType.NodeEditor],
									graphId,
								},
							},
						},
					}),
				);
			});

			addListener.once("mouseup", () => {
				if (!hasMoved) {
					cancelAction();
					return;
				}

				// Check whether the mouse is over an area other than the one we started at.

				const areaState = getActionState().area;
				const viewport = getAreaRootViewport();
				const areaToViewport = computeAreaToViewport(
					areaState.layout,
					areaState.rootId,
					viewport,
				);

				let areaId = getAreaToOpenTargetId(mousePos, areaState, areaToViewport);

				if (!areaId) {
					// Mouse is not over any area, cancel

					cancelAction();
					return;
				}

				dispatch(
					areaActions.setAreaType(areaId, AreaType.NodeEditor, {
						...areaInitialStates[AreaType.NodeEditor],
						graphId,
					}),
				);
				dispatch(areaActions.setFields({ areaToOpen: null }));
				submitAction("Open graph in area");
			});
		});
	},

	onPropertyNameMouseDown: (
		e: React.MouseEvent,
		compositionId: string,
		propertyId: string,
	): void => {
		e.stopPropagation();

		const { compositionState, compositionSelectionState, timelines } = getActionState();
		const compositionSelection = getCompSelectionFromState(
			compositionId,
			compositionSelectionState,
		);
		const property = compositionState.properties[propertyId];

		const additiveSelection = isKeyDown("Command") || isKeyDown("Shift");

		requestAction(
			{ history: true, shouldAddToStack: didCompSelectionChange(compositionId) },
			(params) => {
				if (!additiveSelection) {
					// Clear other properties and timeline keyframes
					params.dispatch(compSelectionActions.clearCompositionSelection(compositionId));

					const timelineIds = getTimelineIdsReferencedByComposition(
						compositionId,
						compositionState,
					);
					params.dispatch(timelineIds.map((id) => timelineActions.clearSelection(id)));
				}

				const willBeSelected = !compositionSelection.properties[propertyId];

				if (additiveSelection && !willBeSelected) {
					// Check whether this property is the only selected property
					// of the layer
					const selectedPropertyIds = reduceLayerPropertiesAndGroups<string[]>(
						property.layerId,
						compositionState,
						(acc, property) => {
							acc.push(property.id);
							return acc;
						},
						[],
					).filter((propertyId) => compositionSelection.properties[propertyId]);

					if (selectedPropertyIds.length === 1 && selectedPropertyIds[0] === propertyId) {
						// Only selected property of layer is being deselected.
						//
						// Deselect the layer
						params.dispatch(
							compSelectionActions.removeLayersFromSelection(compositionId, [
								property.layerId,
							]),
						);
					}

					// Remove property and timeline keyframes from selection
					params.dispatch(
						compSelectionActions.removePropertiesFromSelection(compositionId, [
							propertyId,
						]),
					);

					if (property.type === "property" && property.timelineId) {
						params.dispatch(timelineActions.clearSelection(property.timelineId));
					}
				} else {
					// Add property and timeline keyframes to selection
					params.dispatch(
						compSelectionActions.addPropertyToSelection(compositionId, propertyId),
					);
					params.dispatch(
						compSelectionActions.addLayerToSelection(compositionId, property.layerId),
					);

					if (property.type === "property" && property.timelineId) {
						const timeline = timelines[property.timelineId];
						const keyframeIds = timeline.keyframes.map((k) => k.id);
						params.dispatch(
							timelineActions.addKeyframesToSelection(timeline.id, keyframeIds),
						);
					}
				}

				params.submitAction("Select property");
			},
		);
	},

	moveModifierInList: (modifierPropertyId: string, moveBy: -1 | 1) => {
		requestAction({ history: true }, (params) => {
			params.dispatch(compositionActions.moveModifier(modifierPropertyId, moveBy));
			params.submitAction("Move modifier");
		});
	},
};
