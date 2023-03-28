import { getMarkers } from "./AR-helper";
import { GatlingTower } from "./gatlingTower";
import { settings } from "./settings";
import { SprayTower } from "./sprayTower";
import { TurretParent } from "./turretParentClass";

const ratios = new Map<number, TurretRatioConfig>();
const markerCache = new Map<number, Marker>();
const activeTurrets = new Map<number, TurretParent>();

ratios.set(40, { id: 40, codeWidth: 2.5, diameter: 4, rotationOffset: Math.PI / 2, type: 'gatling' });
ratios.set(41, { id: 41, codeWidth: 2.5, diameter: 4, rotationOffset: Math.PI / 2, type: 'gatling' });
ratios.set(50, { id: 50, codeWidth: 2.5, diameter: 4, rotationOffset: Math.PI / 2, type: 'spray' });
ratios.set(51, { id: 51, codeWidth: 2.5, diameter: 4, rotationOffset: Math.PI / 2, type: 'spray' });

let turrets: Record<number, TurretPlacement> = [];

export const getTurrets = () =>
	Object.values(turrets);

export function syncTurrets() {
	const markers = getMarkers();
	const currentFrame = frameCount;

	const foundTurrets = markers
		.filter(mark => ratios.get(mark.id))
		.map(mark => checkCache(mark))
		.map(mark => {
			const ratio = ratios.get(mark.id)!;

			const markUnit = (
				dist(mark.corners[0].x, mark.corners[0].y, mark.corners[1].x, mark.corners[1].y) +
				dist(mark.corners[1].x, mark.corners[1].y, mark.corners[2].x, mark.corners[2].y) +
				dist(mark.corners[2].x, mark.corners[2].y, mark.corners[3].x, mark.corners[3].y) +
				dist(mark.corners[3].x, mark.corners[3].y, mark.corners[0].x, mark.corners[0].y)
			) / 4;
			const diameter = (ratio.diameter / ratio.codeWidth) * markUnit;

			return {
				...mark,
				angle: mark.angle - ratio.rotationOffset,
				diameter,
				type: 'turret' as const,
				turretType: ratio.type
			};
		})
		.reduce((acc, cur) => ({ ...acc, [cur.id]: { ...cur, timestamp: currentFrame } }), {} as Record<number, TurretPlacement>);

	turrets = Object.values({ ...turrets, ...foundTurrets })
		.filter(turret => currentFrame - turret.timestamp < settings.preserveWallsFrames)
		.reduce((acc, turret) => ({ ...acc, [turret.id]: turret }), {} as Record<number, TurretPlacement>);
}

function checkCache(marker: Marker): Marker {
	if (markerCache.has(marker.id)) {
		const cacheHit = markerCache.get(marker.id)!;
		const cacheCenter = cacheHit.center;
		const center = marker.center;

		if (
			dist(cacheCenter.x, cacheCenter.y, center.x, center.y) > settings.cacheHitThreshold ||
			Math.abs(cacheHit.angle - marker.angle) > settings.cacheHitThreshold
		) {
			// Cache hit is invalid
			markerCache.set(marker.id, marker);
			return marker;
		} else {
			// Cache is good
			return cacheHit;
		}
	}


	markerCache.set(marker.id, marker);
	return marker;
}

export function syncTurretObj() {
	const markerTurrets = getTurrets();

	markerTurrets.forEach((x) => {
		if (!activeTurrets.has(x.id)) {
			switch (x.turretType) {
				case "gatling": {
					activeTurrets.set(x.id, new GatlingTower(x.diameter, x.center.y, x.center.y, 25, 25, 0));
					break;
				}
				case "spray": {
					activeTurrets.set(x.id, new SprayTower(x.diameter, x.center.y, x.center.y, 25, 0, 25));
					break;

				}
			}
		} else if (activeTurrets.has(x.id)) {
			let tur = activeTurrets.get(x.id)!;
			tur.updateFromPlacement(x);
		}
	});
}
export function updateTurretObj() {
	activeTurrets.forEach((x) => {
		x.update(x.angle);
	});
}