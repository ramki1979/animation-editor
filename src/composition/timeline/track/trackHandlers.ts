import {
	transformGlobalToTrackPosition,
	getTimelineSelection,
	transformGlobalToTimelineX,
} from "~/timeline/timelineUtils";
import { getDistance as _getDistance, getDistance, rectOfTwoVecs, isVecInRect } from "~/util/math";
import {
	getCompTimeTrackYPositions,
	getTimelineIdsReferencedByComposition,
	getTimelineIdsReferencedByLayer,
	reduceCompProperties,
} from "~/composition/timeline/compTimeUtils";
import { getActionState, getAreaActionState } from "~/state/stateUtils";
import { COMP_TIME_LAYER_HEIGHT, AreaType } from "~/constants";
import { requestAction, RequestActionParams } from "~/listener/requestAction";
import { isKeyDown } from "~/listener/keyboard";
import { areaActions } from "~/area/state/areaActions";
import { compTimeAreaActions } from "~/composition/timeline/compTimeAreaReducer";
import { timelineActions } from "~/timeline/timelineActions";
import { addListener } from "~/listener/addListener";
import { compositionActions } from "~/composition/state/compositionReducer";

const actions = {
	keyframeMouseDown: (
		params: RequestActionParams,
		initialX: number,
		timelineId: string,
		index: number,
		options: {
			compositionId: string;
			compositionTimelineAreaId: string;
			panY: number;
			length: number;
			viewBounds: [number, number];
			viewport: Rect;
		},
	) => {
		const { compositions: compositionState, timelines: timelineState } = getActionState();
		const composition = compositionState.compositions[options.compositionId];

		const timelineIds = getTimelineIdsReferencedByComposition(
			options.compositionId,
			compositionState,
		);

		const { viewport, viewBounds } = options;
		const timeline = timelineState[timelineId];

		const selection = getTimelineSelection(timelineId);
		const keyframe = timeline.keyframes[index];

		const shiftKeyDownAtMouseDown = isKeyDown("Shift");

		if (shiftKeyDownAtMouseDown) {
			params.dispatch(timelineActions.toggleKeyframeSelection(timeline.id, keyframe.id));
		} else if (!selection.keyframes[keyframe.id]) {
			// If the current node is not selected, we clear the selections of all timelines
			// we are operating on.
			timelineIds.forEach((id) => params.dispatch(timelineActions.clearSelection(id)));
			params.dispatch(timelineActions.toggleKeyframeSelection(timeline.id, keyframe.id));
		}

		let hasMoved = false;
		let mousePos: Vec2;
		let lastUsedMousePos: Vec2;
		let lastShift = isKeyDown("Shift");
		let hasSubmitted = false;

		addListener.repeated("mousemove", (e) => {
			if (!hasMoved) {
				hasMoved = true;
			}

			mousePos = Vec2.fromEvent(e);
		});

		const tick = () => {
			if (hasSubmitted) {
				return;
			}

			requestAnimationFrame(tick);

			if (!hasMoved) {
				return;
			}

			let shouldAlwaysUpdate = false;

			if (lastShift !== isKeyDown("Shift")) {
				lastShift = !lastShift;
				shouldAlwaysUpdate = true;
			}

			if (shouldAlwaysUpdate || lastUsedMousePos !== mousePos) {
				lastUsedMousePos = mousePos;
				let moveX = transformGlobalToTimelineX(
					mousePos.x,
					viewBounds,
					viewport.left,
					viewport.width,
					composition.length,
				);

				moveX = moveX - initialX;

				timelineIds.forEach((id) =>
					params.dispatch(
						timelineActions.setIndexAndValueShift(id, Math.round(moveX), 0),
					),
				);
			}
		};
		requestAnimationFrame(tick);

		addListener.once("mouseup", () => {
			hasSubmitted = true;

			if (!hasMoved) {
				params.submitAction("Select keyframe");
				return;
			}

			timelineIds.forEach((id) => {
				params.dispatch(timelineActions.setYBounds(id, null));
				params.dispatch(timelineActions.setYPan(id, 0));
				params.dispatch(
					timelineActions.submitIndexAndValueShift(id, getTimelineSelection(id)),
				);
			});
			params.submitAction("Move selected keyframes");
		});
	},

	layerMouseDown: (
		params: RequestActionParams,
		layerId: string,
		initialX: number,
		options: {
			compositionId: string;
			compositionTimelineAreaId: string;
			panY: number;
			length: number;
			viewBounds: [number, number];
			viewport: Rect;
		},
	) => {
		const { compositions: compositionState } = getActionState();
		const composition = compositionState.compositions[options.compositionId];

		const timelineIds = getTimelineIdsReferencedByComposition(
			options.compositionId,
			compositionState,
		);

		const { compositionSelection } = getActionState();

		const { viewport, viewBounds } = options;
		// const timeline = timelineState[timelineId];

		// const selection = getTimelineSelection(timelineId);
		// const keyframe = timeline.keyframes[index];

		const shiftKeyDownAtMouseDown = isKeyDown("Shift");

		if (shiftKeyDownAtMouseDown) {
			params.dispatch(compositionActions.toggleLayerSelection(composition.id, layerId));

			// If the layer is being deselected, we clear the selection of all timelines
			// referenced by that layer.
			if (compositionSelection.layers[layerId]) {
				const layerTimelineIds = getTimelineIdsReferencedByLayer(layerId, compositionState);
				layerTimelineIds.forEach((id) =>
					params.dispatch(timelineActions.clearSelection(id)),
				);
			}
		} else if (!compositionSelection.layers[layerId]) {
			// If the current layer is not selected, we clear the selections of all timelines
			// in the composition
			timelineIds.forEach((id) => params.dispatch(timelineActions.clearSelection(id)));
			params.dispatch(compositionActions.toggleLayerSelection(composition.id, layerId));
			params.dispatch(
				compositionActions.removeLayersFromSelection(
					composition.id,
					composition.layers.filter((id) => id !== layerId),
				),
			);
		}

		let hasMoved = false;
		let mousePos: Vec2;
		let lastUsedMousePos: Vec2;
		let lastShift = isKeyDown("Shift");
		let hasSubmitted = false;

		addListener.repeated("mousemove", (e) => {
			if (!hasMoved) {
				hasMoved = true;
			}

			mousePos = Vec2.fromEvent(e);
		});

		const tick = () => {
			if (hasSubmitted) {
				return;
			}

			requestAnimationFrame(tick);

			if (!hasMoved) {
				return;
			}

			let shouldAlwaysUpdate = false;

			if (lastShift !== isKeyDown("Shift")) {
				lastShift = !lastShift;
				shouldAlwaysUpdate = true;
			}

			if (shouldAlwaysUpdate || lastUsedMousePos !== mousePos) {
				lastUsedMousePos = mousePos;
				let moveX = transformGlobalToTimelineX(
					mousePos.x,
					viewBounds,
					viewport.left,
					viewport.width,
					composition.length,
				);

				moveX = moveX - initialX;

				params.dispatch(
					areaActions.dispatchToAreaState(
						options.compositionTimelineAreaId,
						compTimeAreaActions.setFields({ layerIndexShift: Math.round(moveX) }),
					),
				);
			}
		};
		requestAnimationFrame(tick);

		addListener.once("mouseup", () => {
			hasSubmitted = true;

			if (!hasMoved) {
				params.submitAction("Modify selection");
				return;
			}

			const { layerIndexShift } = getAreaActionState<AreaType.CompositionTimeline>(
				options.compositionTimelineAreaId,
			);
			params.dispatch(
				areaActions.dispatchToAreaState(
					options.compositionTimelineAreaId,
					compTimeAreaActions.setFields({ layerIndexShift: 0 }),
				),
			);

			const compositionSelection = getActionState().compositionSelection;
			params.dispatch(
				compositionActions.applyLayerIndexShift(
					composition.id,
					layerIndexShift,
					compositionSelection,
				),
			);

			params.submitAction("Move layer(s)");
		});
	},
};

export const trackHandlers = {
	onMouseDown: (
		e: React.MouseEvent,
		options: {
			compositionId: string;
			compositionTimelineAreaId: string;
			panY: number;
			length: number;
			viewBounds: [number, number];
			viewport: Rect;
		},
	): void => {
		const initialPos = Vec2.fromEvent(e);

		const mousePos = transformGlobalToTrackPosition(initialPos, options);
		let getXDistance: (a: Vec2, b: Vec2) => number;
		{
			const p0 = transformGlobalToTrackPosition(Vec2.new(0, 0), options);
			const p1 = transformGlobalToTrackPosition(Vec2.new(1, 1), options);

			const xt = p1.x - p0.x;
			const yt = p1.y - p0.y;

			getXDistance = (a, b) => {
				const aScaled = a.scaleX(yt / xt).scale(1 / yt);
				const bScaled = b.scaleX(yt / xt).scale(1 / yt);
				return Math.abs(aScaled.x - bScaled.x);
			};
		}

		const { compositions: compositionState, timelines: timelineState } = getActionState();
		const composition = compositionState.compositions[options.compositionId];

		const yPosMap = getCompTimeTrackYPositions(composition.id, compositionState, options.panY);

		const timelineIdToLayerId = reduceCompProperties<{ [timelineId: string]: string }>(
			composition.id,
			compositionState,
			(obj, property) => {
				if (property.type === "property" && property.timelineId) {
					obj[property.timelineId] = property.layerId;
				}

				return obj;
			},
			{},
		);

		hitTest: {
			const propertyIds = Object.keys(yPosMap.property);
			for (let i = 0; i < propertyIds.length; i += 1) {
				const propertyId = propertyIds[i];
				const y = yPosMap.property[propertyId];

				if (mousePos.y > y && mousePos.y < y + COMP_TIME_LAYER_HEIGHT) {
					// Mouse landed on this property track.
					//
					// Check whether a keyframe was hit.
					const property = compositionState.properties[propertyId];

					if (property.type === "property" && property.timelineId) {
						const timeline = timelineState[property.timelineId];
						const layerId = timelineIdToLayerId[timeline.id];
						const layer = compositionState.layers[layerId];

						for (let j = 0; j < timeline.keyframes.length; j += 1) {
							const k = timeline.keyframes[j];
							const kPos = Vec2.new(k.index + layer.index, k.value);

							if (getXDistance(kPos, mousePos) < 5) {
								requestAction({ history: true }, (params) => {
									actions.keyframeMouseDown(
										params,
										mousePos.x,
										timeline.id,
										j,
										options,
									);
								});
								return;
							}
						}
					}

					// No change of hitting layers/keyframes outside of this track
					break hitTest;
				}
			}

			const layerIds = Object.keys(yPosMap.layer);
			for (let i = 0; i < layerIds.length; i += 1) {
				const layerId = layerIds[i];
				const y = yPosMap.layer[layerId];

				if (mousePos.y > y && mousePos.y < y + COMP_TIME_LAYER_HEIGHT) {
					const layer = compositionState.layers[layerId];

					if (mousePos.x > layer.index && mousePos.x < layer.index + layer.length) {
						requestAction({ history: true }, (params) => {
							actions.layerMouseDown(params, layerId, mousePos.x, options);
						});
						return;
					}

					// No change of hitting layers/keyframes outside of this track
					break hitTest;
				}
			}
		}

		const timelines = getTimelineIdsReferencedByComposition(
			composition.id,
			compositionState,
		).map((timelineId) => timelineState[timelineId]);

		/**
		 * Did not select any entity on timeline.
		 *
		 * If user drags mouse, create a selection rect.
		 *
		 * If mouseup is fired without moving, clear selection.
		 */
		requestAction({ history: true }, ({ dispatch, submitAction, addListener }) => {
			let hasMoved = false;
			const wasShiftDown = isKeyDown("Shift");

			addListener.repeated("mousemove", (e) => {
				const mousePos = Vec2.fromEvent(e);

				if (!hasMoved) {
					if (getDistance(initialPos, mousePos) < 5) {
						return;
					}

					hasMoved = true;
				}

				const trackDragSelectRect = rectOfTwoVecs(
					transformGlobalToTrackPosition(initialPos, options),
					transformGlobalToTrackPosition(mousePos, options),
				);

				dispatch(
					areaActions.dispatchToAreaState(
						options.compositionTimelineAreaId,
						compTimeAreaActions.setFields({ trackDragSelectRect }),
					),
				);
			});

			addListener.once("mouseup", () => {
				if (!hasMoved) {
					timelines.forEach(({ id }) => dispatch(timelineActions.clearSelection(id)));
					submitAction("Clear timeline selection");
					return;
				}

				if (!wasShiftDown) {
					timelines.forEach(({ id }) => dispatch(timelineActions.clearSelection(id)));
				}

				const { trackDragSelectRect } = getAreaActionState<AreaType.CompositionTimeline>(
					options.compositionTimelineAreaId,
				);

				timelines.forEach((timeline) => {
					const layerId = timelineIdToLayerId[timeline.id];
					const layer = compositionState.layers[layerId];

					const keyframes = timeline.keyframes
						.filter((k) => {
							const x = k.index + layer.index;
							const y = yPosMap.timeline[timeline.id] + COMP_TIME_LAYER_HEIGHT / 2;

							return isVecInRect(Vec2.new(x, y), trackDragSelectRect!);
						})
						.map((k) => k.id);
					dispatch(timelineActions.addKeyframesToSelection(timeline.id, keyframes));
				});
				dispatch(
					areaActions.dispatchToAreaState(
						options.compositionTimelineAreaId,
						compTimeAreaActions.setFields({ trackDragSelectRect: null }),
					),
				);
				submitAction("Select keyframes");
			});
		});
	},
};
