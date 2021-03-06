import React, { useEffect } from "react";
import { hot } from "react-hot-loader/root";
import { AreaRoot } from "~/area/components/AreaRoot";
import { ContextMenu } from "~/contextMenu/ContextMenu";
import { CustomContextMenu } from "~/contextMenu/CustomContextMenu";
import { addListener, removeListener } from "~/listener/addListener";
import { isKeyCodeOf } from "~/listener/keyboard";
import { DragCompositionPreview } from "~/project/DragCompositionPreview";
import { Toolbar } from "~/toolbar/Toolbar";

export const AppComponent: React.FC = () => {
	useEffect(() => {
		const token = addListener.repeated("keydown", { modifierKeys: ["Command"] }, (e) => {
			if (isKeyCodeOf("S", e.keyCode)) {
				e.preventDefault();
				(window as any).saveActionState();
				console.log("Saved!");
			}
		});
		return () => {
			removeListener(token);
		};
	}, []);

	return (
		<>
			<ContextMenu />
			<CustomContextMenu />
			<Toolbar />
			<AreaRoot />
			<DragCompositionPreview />
		</>
	);
};

export const App = hot(AppComponent);
