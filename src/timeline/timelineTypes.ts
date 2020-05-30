export interface Timeline {
	id: string;
	keyframes: TimelineKeyframe[];
	_yBounds: [number, number] | null;
	_yPan: number;
	_indexShift: number | null;
	_valueShift: number | null;
	_dragSelectRect: Rect | null;
}

export interface TimelineKeyframeControlPoint {
	tx: number; // 0 - 1
	value: number; // Value relative to keyframe value
	relativeToDistance: number; // The distance at which the value is defined
}

export interface TimelineKeyframe {
	id: string;
	index: number;
	value: number;
	reflectControlPoints: boolean;
	controlPointLeft: TimelineKeyframeControlPoint | null;
	controlPointRight: TimelineKeyframeControlPoint | null;
}