/// <reference path="../node_modules/@types/p5/global.d.ts"/>

import { getMarkers, isReady, setupDetector, setupVideoStream, syncMarkers } from "./AR-helper";
import { calibrationBox, initAutoCalibrate, isCalibrationMarker } from "./calibration";
import { drawCalibrationBox, drawDebugMarker, drawDebugText, drawVideoFeed } from "./debug-draw";
import { initEnemySpawner, updateEnemies } from "./enemyClass";
import { drawEmptyGrid } from "./grid-builder";
import { initSettingsMenu, settings } from "./settings";
import { getWalls, syncWalls } from "./walls";
import { debugDrawFromStartToEnd, syncPathfinderWithWall } from "./pathfindering";
import { getTurrets, syncTurrets } from "./turrets";

let capture: ReturnType<typeof createCapture>;


export let canvasWidth = window.innerWidth;
export let canvasHeight = window.innerHeight;

(window as any).setup = () => {
	initSettingsMenu();
	createCanvas(canvasWidth, canvasHeight);
	capture = createCapture(VIDEO);
	capture.hide();

	setupVideoStream();
	setupDetector();
	frameRate(settings.targetFrameRate);
	initAutoCalibrate();
	initEnemySpawner();
};

(window as any).draw = () => {
	background(255);
	if (!isReady()) return;


	drawPlayarea();
	if (frameCount % settings.sampleMarkersDelay == 0) new Promise(() => {
		syncMarkers();
		syncWalls();
		syncTurrets();
		syncPathfinderWithWall()
	});

	// If debug, draw transparent video feed on top of canvas
	if (settings.debug) drawCalibrationBox();
	if (settings.showVideoFeed) drawVideoFeed(capture);

	const walls = getWalls();

	for (const mark of walls) {
		// If this is a calibration id, drawing it
		if (isCalibrationMarker(mark.id)) {
			if (settings.debug) drawDebugMarker(mark);
			continue;
		};

		const [p1, p2, p3, p4] = mark.corners;
		push();
		noStroke();
		fill(255, 100, 100);

		beginShape();
		vertex(p1.x, p1.y);
		vertex(p2.x, p2.y);
		vertex(p3.x, p3.y);
		vertex(p4.x, p4.y);
		endShape();
		pop();
	}

	const turrets = getTurrets();

	for (const turret of turrets) {
		push();
		noStroke();
		fill(255, 100, 100);
		const { x, y } = turret.center;
		const angle = turret.angle;

		circle(x, y, turret.diameter);

		const rotX = cos(angle) * turret.diameter * 0.75;
		const rotY = sin(angle) * turret.diameter * 0.75;

		strokeWeight(10);
		stroke(255, 50, 50);
		line(
			x,
			y,
			x + rotX,
			y + rotY
		);
		pop();
	}

	if (settings.debug) {
		drawDebugText();
		drawEmptyGrid();
		debugDrawFromStartToEnd();
		getMarkers().forEach((marker) => drawDebugMarker(marker))
	}
	updateEnemies();
};

function drawPlayarea() {
	push();

	noStroke();
	fill(100, 255, 100);

	rect(
		0,
		0,
		calibrationBox.width * calibrationBox.scaleX,
		calibrationBox.height * calibrationBox.scaleY
	);

	pop();
}
