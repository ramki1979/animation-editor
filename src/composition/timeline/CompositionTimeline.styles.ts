import { StyleParams } from "~/util/stylesheets";
import { cssVariables, cssZIndex } from "~/cssVariables";

export default ({ css }: StyleParams) => ({
	header: css`
		height: 32px;
		display: flex;
		justify-content: flex-end;
		align-items: center;
		padding: 0 8px;
	`,

	graphEditorToggle: css`
		color: ${cssVariables.light500};
		background: ${cssVariables.gray400};
		border-radius: 4px;
		font-size: 11px;
		padding: 0 8px;
		height: 24px;
		border: none;
		cursor: pointer;
	`,

	wrapper: css`
		display: flex;
	`,

	layer: css`
		border: 1px solid red;
		border-radius: 4px;
	`,

	left: css`
		background: ${cssVariables.dark600};
		margin-right: 4px;
		display: flex;
		flex-direction: column;
	`,

	layerWrapper: css`
		flex-grow: 1;
	`,

	right: css`
		background: ${cssVariables.gray500};
		overflow: hidden;
	`,

	separator: css`
		position: absolute;
		top: 0;
		bottom: 0;
		background: ${cssVariables.dark600};
		cursor: ew-resize;
	`,

	zoomTarget: css`
		display: none;
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		cursor: zoom-in;
		z-index: ${cssZIndex.timelineEditor.zoomTarget};
	`,

	panTarget: css`
		display: none;
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		cursor: grab;
		z-index: ${cssZIndex.timelineEditor.panTarget};
	`,
});
