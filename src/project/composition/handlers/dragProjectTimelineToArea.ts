import { areaActions } from "~/area/state/areaActions";
import { areaInitialStates } from "~/area/state/areaInitialStates";
import { computeAreaToViewport } from "~/area/util/areaToViewport";
import { getAreaToOpenTargetId } from "~/area/util/areaUtils";
import { getAreaRootViewport } from "~/area/util/getAreaViewport";
import { AreaType } from "~/constants";
import { requestAction } from "~/listener/requestAction";
import { getActionState } from "~/state/stateUtils";
import { TimelineAreaState } from "~/timeline/timelineAreaReducer";
import { getDistance } from "~/util/math";

interface Options {
	compositionId: string;
}

export const dragProjectTimelineToArea = (e: React.MouseEvent, options: Options) => {
	const { compositionId } = options;

	const initialMousePos = Vec2.fromEvent(e);

	requestAction({ history: false }, (params) => {
		const { dispatch, cancelAction, submitAction, addListener } = params;

		const initialState: TimelineAreaState = {
			...areaInitialStates[AreaType.Timeline],
			compositionId,
		};

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
							type: AreaType.Timeline,
							state: initialState,
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

			dispatch(areaActions.setAreaType(areaId, AreaType.Timeline, initialState));
			dispatch(areaActions.setFields({ areaToOpen: null }));
			submitAction();
		});
	});
};
