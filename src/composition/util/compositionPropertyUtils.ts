import { CompositionProperty, CompositionPropertyGroup } from "~/composition/compositionTypes";
import { ValueType, PropertyName, PropertyGroupName } from "~/types";
import { TimelineColors } from "~/constants";
import { CompositionState } from "~/composition/state/compositionReducer";

const propertyGroupNameToLabel: { [key in keyof typeof PropertyGroupName]: string } = {
	Dimensions: "Dimensions",
	Transform: "Transform",
};

const propertyNameToLabel: { [key in keyof typeof PropertyName]: string } = {
	Scale: "Scale",
	Rotation: "Rotation",
	PositionX: "X Position",
	PositionY: "Y Position",
	Opacity: "Opacity",

	Height: "Height",
	Width: "Width",
};

export const getLayerPropertyLabel = (name: PropertyName): string => {
	const key = PropertyName[name] as keyof typeof PropertyName;
	return propertyNameToLabel[key];
};

export const getLayerPropertyGroupLabel = (name: PropertyGroupName): string => {
	const key = PropertyGroupName[name] as keyof typeof PropertyGroupName;
	return propertyGroupNameToLabel[key];
};

interface Options {
	createId: () => string;
	compositionId: string;
	layerId: string;
}

const createDefaultTransformProperties = (opts: Options): CompositionProperty[] => {
	const { compositionId, createId, layerId } = opts;

	return [
		{
			type: "property",
			id: createId(),
			layerId,
			compositionId,
			name: PropertyName.PositionX,
			timelineId: "",
			valueType: ValueType.Number,
			value: 0,
			color: TimelineColors.XPosition,
		},
		{
			type: "property",
			id: createId(),
			layerId,
			compositionId,
			name: PropertyName.PositionY,
			timelineId: "",
			valueType: ValueType.Number,
			value: 0,
			color: TimelineColors.YPosition,
		},
		{
			type: "property",
			id: createId(),
			layerId,
			compositionId,
			name: PropertyName.Scale,
			timelineId: "",
			valueType: ValueType.Number,
			value: 1,
			color: TimelineColors.YPosition,
		},
		{
			type: "property",
			id: createId(),
			layerId,
			compositionId,
			name: PropertyName.Rotation,
			timelineId: "",
			valueType: ValueType.Number,
			value: 0,
			color: TimelineColors.YPosition,
		},
		{
			type: "property",
			id: createId(),
			layerId,
			compositionId,
			name: PropertyName.Opacity,
			timelineId: "",
			valueType: ValueType.Number,
			value: 1,
			color: TimelineColors.YPosition,
			max: 1,
			min: 0,
		},
	];
};

const createDefaultDimensionProperties = (opts: Options): CompositionProperty[] => {
	const { compositionId, createId, layerId } = opts;

	return [
		{
			type: "property",
			id: createId(),
			layerId,
			compositionId,
			name: PropertyName.Width,
			timelineId: "",
			valueType: ValueType.Number,
			color: TimelineColors.Width,
			value: 100,
			min: 0,
		},
		{
			type: "property",
			id: createId(),
			layerId,
			compositionId,
			name: PropertyName.Height,
			timelineId: "",
			valueType: ValueType.Number,
			color: TimelineColors.Height,
			value: 100,
			min: 0,
		},
	];
};

export const getDefaultLayerProperties = (
	opts: Options,
): {
	topLevelProperties: Array<CompositionProperty | CompositionPropertyGroup>;
	nestedProperties: Array<CompositionProperty | CompositionPropertyGroup>;
} => {
	const transformProperties = createDefaultTransformProperties(opts);
	const transformGroup: CompositionPropertyGroup = {
		type: "group",
		name: PropertyGroupName.Transform,
		id: opts.createId(),
		properties: transformProperties.map((p) => p.id),
	};

	const dimensionProperties = createDefaultDimensionProperties(opts);
	const dimensionsGroup: CompositionPropertyGroup = {
		type: "group",
		name: PropertyGroupName.Dimensions,
		id: opts.createId(),
		properties: dimensionProperties.map((p) => p.id),
	};

	return {
		nestedProperties: [...transformProperties, ...dimensionProperties],
		topLevelProperties: [dimensionsGroup, transformGroup],
	};
};

export const getLayerTransformProperties = (
	layerId: string,
	compositionState: CompositionState,
): CompositionProperty[] => {
	const layer = compositionState.layers[layerId];

	const propertyGroups = layer.properties.map((id) => compositionState.properties[id]);
	const transformGroup = propertyGroups.find((group): group is CompositionPropertyGroup => {
		return group.type === "group" && group.name === PropertyGroupName.Transform;
	});

	if (!transformGroup) {
		throw new Error("Layer does not contain Transform property group");
	}

	const transformProperties = transformGroup.properties.map((id) => {
		return compositionState.properties[id] as CompositionProperty;
	});

	return transformProperties;
};

export function getLayerCompositionProperties(
	layerId: string,
	compositionState: CompositionState,
): CompositionProperty[] {
	const properties: CompositionProperty[] = [];

	function crawl(propertyId: string) {
		const property = compositionState.properties[propertyId];

		if (property.type === "group") {
			property.properties.forEach(crawl);
			return;
		}

		properties.push(property);
	}
	compositionState.layers[layerId].properties.forEach(crawl);

	return properties;
}