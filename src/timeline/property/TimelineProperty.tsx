import React from "react";
import { GraphIcon } from "~/components/icons/GraphIcon";
import { OpenInAreaIcon } from "~/components/icons/OpenInAreaIcon";
import { StopwatchIcon } from "~/components/icons/StopwatchIcon";
import { compositionActions } from "~/composition/compositionReducer";
import { CompositionProperty, CompositionPropertyGroup } from "~/composition/compositionTypes";
import {
	getLayerPropertyGroupLabel,
	getLayerPropertyLabel,
} from "~/composition/util/compositionPropertyUtils";
import { getCompSelectionFromState } from "~/composition/util/compSelectionUtils";
import { requestAction } from "~/listener/requestAction";
import { connectActionState } from "~/state/stateUtils";
import styles from "~/timeline/property/TimelineProperty.styles";
import { timelineHandlers } from "~/timeline/timelineHandlers";
import { TimelineValue } from "~/timeline/value/TimelineValue";
import { PropertyGroupName, ValueType } from "~/types";
import { separateLeftRightMouse } from "~/util/mouse";
import { compileStylesheetLabelled } from "~/util/stylesheets";

const ArrowUpIcon = () => (
	<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M16 3.01514L25.7425 12.7576L24.2576 14.2425L16 5.98499L7.74249 14.2425L6.25757 12.7576L16 3.01514Z"
		/>
		<path fillRule="evenodd" clipRule="evenodd" d="M15 28V4.5H17V28H15Z" />
	</svg>
);

const s = compileStylesheetLabelled(styles);

interface OwnProps {
	compositionId: string;
	id: string;
	depth: number;
	canBeReordered: boolean;
}
interface StateProps {
	property: CompositionProperty | CompositionPropertyGroup;
	isSelected: boolean;
}
type Props = OwnProps & StateProps;

const TimelineLayerPropertyComponent: React.FC<Props> = (props) => {
	const { property } = props;

	const marginLeft = 24 + props.depth * 20;
	const nameWidth = 180 - props.depth * 20;

	if (property.type === "group") {
		const { properties } = property;

		const canHaveGraph = property.name === PropertyGroupName.ArrayModifier;
		const graphId = property.graphId;

		const { canBeReordered } = props;

		const toggleGroupOpen = () => {
			requestAction({ history: true }, (params) => {
				params.dispatch(
					compositionActions.setPropertyGroupCollapsed(property.id, !property.collapsed),
				);
				params.submitAction("Toggle property group collapsed");
			});
		};

		return (
			<>
				<div className={s("container")}>
					<div className={s("contentContainer")} style={{ marginLeft }}>
						<div
							className={s("collapsedArrow", { open: !property.collapsed })}
							onMouseDown={(e) => e.stopPropagation()}
							onClick={toggleGroupOpen}
						/>
						<div
							className={s("name", { active: props.isSelected })}
							style={{ width: nameWidth }}
							onMouseDown={separateLeftRightMouse({
								left: (e) =>
									timelineHandlers.onPropertyNameMouseDown(
										e,
										props.compositionId,
										property.id,
									),
							})}
						>
							{getLayerPropertyGroupLabel(property.name)}
						</div>
						{canHaveGraph && (
							<div className={s("graphWrapper")}>
								<button
									title={
										property.graphId
											? "Delete Layer Graph"
											: "Create Layer Graph"
									}
									className={s("graph", { active: !!graphId })}
									onMouseDown={separateLeftRightMouse({
										left: (e) => e.stopPropagation(),
									})}
									onClick={(e) =>
										timelineHandlers.onPropertyGraphMouseDown(e, property.id)
									}
								>
									<GraphIcon />
								</button>
								{!!graphId && (
									<div
										title="Open Graph in area"
										className={s("openGraphInArea", { active: true })}
										onMouseDown={separateLeftRightMouse({
											left: (e) =>
												timelineHandlers.onOpenGraphInAreaMouseDown(
													e,
													graphId,
												),
										})}
									>
										<OpenInAreaIcon />
									</div>
								)}
							</div>
						)}
						{canBeReordered && (
							<>
								<button
									title="Move up in list"
									className={s("moveUpDownButton")}
									onMouseDown={separateLeftRightMouse({
										left: (e) => e.stopPropagation(),
									})}
									onClick={() =>
										timelineHandlers.moveModifierInList(property.id, -1)
									}
								>
									<ArrowUpIcon />
								</button>
								<button
									title="Move down in list"
									className={s("moveUpDownButton", { down: true })}
									onMouseDown={separateLeftRightMouse({
										left: (e) => e.stopPropagation(),
									})}
									onClick={() =>
										timelineHandlers.moveModifierInList(property.id, 1)
									}
								>
									<ArrowUpIcon />
								</button>
							</>
						)}
					</div>
				</div>
				{!property.collapsed &&
					properties.map((id) => (
						<TimelineLayerProperty
							compositionId={props.compositionId}
							id={id}
							key={id}
							depth={props.depth + 1}
							canBeReordered={property.name === PropertyGroupName.Modifiers}
						/>
					))}
			</>
		);
	}

	return (
		<div className={s("container")}>
			<div className={s("contentContainer")} style={{ marginLeft }}>
				<div
					className={s("timelineIcon", { active: !!property.timelineId })}
					onMouseDown={separateLeftRightMouse({
						left: (e) =>
							timelineHandlers.onPropertyKeyframeIconMouseDown(
								e,
								props.compositionId,
								property.id,
								property.timelineId,
							),
					})}
					style={
						property.valueType === ValueType.Color
							? { pointerEvents: "none", opacity: "0" }
							: {}
					}
				>
					<StopwatchIcon />
				</div>
				<div
					className={s("name", { active: props.isSelected })}
					style={{ width: nameWidth }}
					onMouseDown={separateLeftRightMouse({
						left: (e) =>
							timelineHandlers.onPropertyNameMouseDown(
								e,
								props.compositionId,
								property.id,
							),
					})}
				>
					{getLayerPropertyLabel(property.name)}
				</div>
				<TimelineValue propertyId={property.id} />
			</div>
		</div>
	);
};

const mapStateToProps: MapActionState<StateProps, OwnProps> = (
	{ compositionState, compositionSelectionState },
	{ id, compositionId },
) => {
	const property = compositionState.properties[id] as CompositionProperty;
	const compositionSelection = getCompSelectionFromState(
		compositionId,
		compositionSelectionState,
	);
	const isSelected = !!compositionSelection.properties[id];

	return {
		isSelected,
		property,
	};
};

export const TimelineLayerProperty = connectActionState(mapStateToProps)(
	TimelineLayerPropertyComponent,
);
