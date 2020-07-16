import { VectorEditor } from "~/vectorEditor/VectorEditor";
import { AreaType } from "~/constants";
import { NodeEditor } from "~/nodeEditor/NodeEditor";
import { nodeEditorAreaReducer } from "~/nodeEditor/nodeEditorAreaReducer";
import HistoryEditor from "~/historyEditor/HistoryEditor";
import { compTimeAreaReducer } from "~/composition/timeline/compTimeAreaReducer";
import { CompositionTimeline } from "~/composition/timeline/CompositionTimeline";
import { CompositionWorkspace } from "~/composition/workspace/CompositionWorkspace";
import { compositionWorkspaceAreaReducer } from "~/composition/workspace/compositionWorkspaceAreaReducer";
import { AreaState, AreaComponentProps } from "~/types/areaTypes";
import { Project } from "~/project/Project";

export const areaComponentRegistry: {
	[T in AreaType]: React.ComponentType<AreaComponentProps<AreaState<T>>>;
} = {
	[AreaType.VectorEditor]: VectorEditor,
	[AreaType.CompositionTimeline]: CompositionTimeline,
	[AreaType.CompositionWorkspace]: CompositionWorkspace,
	[AreaType.NodeEditor]: NodeEditor,
	[AreaType.History]: HistoryEditor,
	[AreaType.Project]: Project,
};

export const areaStateReducerRegistry: {
	[T in AreaType]: (state: AreaState<T>, action: any) => AreaState<T>;
} = {
	[AreaType.VectorEditor]: () => ({} as any),
	[AreaType.CompositionTimeline]: compTimeAreaReducer,
	[AreaType.CompositionWorkspace]: compositionWorkspaceAreaReducer,
	[AreaType.NodeEditor]: nodeEditorAreaReducer,
	[AreaType.History]: () => ({}),
	[AreaType.Project]: () => ({}),
};
