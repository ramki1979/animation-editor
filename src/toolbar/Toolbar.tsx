import React, { useRef, useEffect } from "react";
import { compileStylesheetLabelled } from "~/util/stylesheets";
import styles from "~/toolbar/Toolbar.styles";
import { ToolState } from "~/toolbar/toolReducer";
import { toolGroups, keyToToolMap, toolToLabel, toolToKey } from "~/constants";

const s = compileStylesheetLabelled(styles);

import { Tool } from "~/constants";

import { SelectionIcon } from "~/components/icons/SelectionIcon";
import { PenIcon } from "~/components/icons/PenIcon";
import { ConvertAnchorIcon } from "~/components/icons/ConvertAnchorIcon";
import { RectangleIcon } from "~/components/icons/RectangleIcon";
import { EllipseIcon } from "~/components/icons/EllipseIcon";
import { PolygonIcon } from "~/components/icons/PolygonIcon";
import { IntersectionIcon } from "~/components/icons/IntersectionIcon";
import { FillIcon } from "~/components/icons/FillIcon";
import { connectActionState } from "~/state/stateUtils";
import { requestAction } from "~/listener/requestAction";
import { toolActions } from "~/toolbar/toolActions";
import { addListener, removeListener } from "~/listener/addListener";
import { getKeyFromKeyCode, isAnyModifierKeyDown } from "~/listener/keyboard";

export const toolToIconMap = {
	[Tool.selection]: SelectionIcon,
	[Tool.pen]: PenIcon,
	[Tool.editVertex]: ConvertAnchorIcon,
	[Tool.rectangle]: RectangleIcon,
	[Tool.ellipse]: EllipseIcon,
	[Tool.polygon]: PolygonIcon,
	[Tool.fill]: FillIcon,
	[Tool.intersection]: IntersectionIcon,
};

interface StateProps {
	toolState: ToolState;
}
type Props = StateProps;

const ToolbarComponent: React.FC<Props> = props => {
	// Tool keyboard shortcut listener
	useEffect(() => {
		const token = addListener.repeated("keydown", e => {
			const key = getKeyFromKeyCode(e.keyCode);
			if (key && typeof keyToToolMap[key] !== "undefined") {
				if (isAnyModifierKeyDown()) {
					return;
				}

				requestAction({}, ({ dispatch, submitAction }) => {
					dispatch(toolActions.setTool(keyToToolMap[key]!));
					submitAction("Set tool");
				});
			}
		});
		return () => removeListener(token);
	}, []);

	const onGroupItemClick = useRef<((tool: Tool) => void) | null>(null);
	const group = useRef<HTMLDivElement>(null);

	const onItemClick = (tool: Tool) => {
		requestAnimationFrame(() => {
			requestAction({}, ({ dispatch, submitAction }) => {
				dispatch(toolActions.setTool(tool));
				submitAction("Set tool");
			});
		});
	};

	const onGroupClick = (index: number) => {
		requestAction(
			{},
			({ addListener, cancelAction, dispatch, submitAction, execOnComplete }) => {
				dispatch(toolActions.setOpenGroupIndex(index));

				onGroupItemClick.current = (tool: Tool) => {
					dispatch(toolActions.setTool(tool));
					submitAction("Set tool");
				};

				setTimeout(() => {
					addListener.repeated("mousedown", e => {
						if (
							group.current !== e.target &&
							!group.current?.contains(e.target as HTMLDivElement)
						) {
							cancelAction();
						}
					});
				});

				execOnComplete(() => {
					onGroupItemClick.current = null;
				});
			},
		);
	};

	return (
		<div className={s("container")}>
			<div className={s("list")}>
				{toolGroups.map((tools, i) => {
					const active = props.toolState.selected === props.toolState.selectedInGroup[i];
					return (
						<div key={i} className={s("group", { active })}>
							<button
								className={s("group__visibleTool")}
								onMouseDown={() => onItemClick(props.toolState.selectedInGroup[i])}
							>
								{toolToIconMap[props.toolState.selectedInGroup[i]]()}
							</button>
							<button
								className={s("group__openDropdown", { active })}
								onMouseDown={() => onGroupClick(i)}
							/>

							{props.toolState.openGroupIndex === i ? (
								<div
									ref={group}
									className={s("dropdown")}
									data-tool-dropdown-index={i}
								>
									{tools.map(({ tool }) => (
										<button
											key={tool}
											className={s("item")}
											onClick={() => {
												if (
													typeof onGroupItemClick.current === "function"
												) {
													onGroupItemClick.current(tool);
												}
											}}
										>
											<div className={s("icon")}>{toolToIconMap[tool]()}</div>
											<span className={s("label")}>
												<div>{toolToLabel[tool]}</div>
												{toolToKey[tool] && (
													<div className={s("label__key")}>
														{toolToKey[tool]}
													</div>
												)}
											</span>
										</button>
									))}
								</div>
							) : null}
						</div>
					);
				})}
			</div>
		</div>
	);
};

export const Toolbar = connectActionState<StateProps>(({ tool }) => ({ toolState: tool }))(
	ToolbarComponent,
);
