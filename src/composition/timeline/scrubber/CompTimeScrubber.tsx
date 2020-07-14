import React, { useRef, useEffect } from "react";
import { compileStylesheetLabelled } from "~/util/stylesheets";
import CompTimeScrubberStyles from "~/composition/timeline/scrubber/CompTimeScrubber.styles";
import { COMP_TIME_SCRUBBER_HEIGHT } from "~/constants";
import { separateLeftRightMouse } from "~/util/mouse";
import { compTimeHandlers } from "~/composition/timeline/compTimeHandlers";
import { connectActionState } from "~/state/stateUtils";
import { createToTimelineViewportX } from "~/timeline/renderTimeline";
import { renderCompTimeScrubber } from "~/composition/timeline/scrubber/renderCompTimeScrubber";

const s = compileStylesheetLabelled(CompTimeScrubberStyles);

interface OwnProps {
	compositionId: string;
	viewBounds: [number, number];
	viewportRight: Rect;
}
interface StateProps {
	length: number;
	frameIndex: number;
}
type Props = OwnProps & StateProps;

const CompTimeScrubberComponent: React.FC<Props> = (props) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);

	const toTimelineX = createToTimelineViewportX({
		length: props.length,
		viewBounds: props.viewBounds,
		width: props.viewportRight.width,
	});

	useEffect(() => {
		const ctx = canvasRef.current?.getContext("2d");

		if (!ctx) {
			return;
		}

		renderCompTimeScrubber(ctx, {
			length: props.length,
			viewBounds: props.viewBounds,
			width: props.viewportRight.width,
		});
	}, [props.length, props.viewBounds, props.viewportRight.width]);

	return (
		<div className={s("wrapper")}>
			<canvas
				className={s("canvas")}
				width={props.viewportRight.width}
				height={COMP_TIME_SCRUBBER_HEIGHT}
				ref={canvasRef}
			/>
			<div
				className={s("interactionArea")}
				onMouseDown={separateLeftRightMouse({
					left: (e) => {
						compTimeHandlers.onScrubMouseDown(e, {
							compositionId: props.compositionId,
							viewBounds: props.viewBounds,
							viewport: props.viewportRight,
						});
					},
				})}
			/>
			<div className={s("head")} style={{ left: toTimelineX(props.frameIndex) }}>
				<div className={s("scrubLine")} style={{ height: props.viewportRight.height }} />
			</div>
		</div>
	);
};

const mapStateToProps: MapActionState<StateProps, OwnProps> = ({ compositions }, ownProps) => {
	const composition = compositions.compositions[ownProps.compositionId];
	return {
		frameIndex: composition.frameIndex,
		length: composition.length,
	};
};

export const CompTimeScrubber = connectActionState(mapStateToProps)(CompTimeScrubberComponent);