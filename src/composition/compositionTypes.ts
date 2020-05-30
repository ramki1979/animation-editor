import { ValueType } from "~/types";

export interface Composition {
	id: string;
	layers: string[];
	width: number;
	height: number;
	length: number;
	frameIndex: number; // Current time
}

export interface CompositionLayer {
	id: string;
	compositionId: string;
	graphId: string;
	type: "rect";
	name: string;
	index: number; // Index of first frame
	length: number; // Number of frames
	properties: string[];
}

export interface CompositionLayerProperty {
	id: string;
	layerId: string;
	compositionId: string;
	label: string;
	name: string;
	type: ValueType;
	value: number;
	timelineId: string;
	color?: string;
	min?: number;
	max?: number;
}