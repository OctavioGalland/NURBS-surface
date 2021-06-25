'use strict'

$(document).ready(() => {
	const canvas = document.getElementById('canvas');
	const gl = canvas.getContext('webgl');

	// Make gl context globally available
	window.gl = gl;

	const renderer = new Renderer();

	let dragging = false;

	// Listeners de eventos en el canvas
	canvas.addEventListener('mousedown', e => {
		dragging = true;
	});
	canvas.addEventListener('mouseup', e => {
		dragging = false;
	});

	canvas.addEventListener('mousemove', e => {
		if (dragging) {
			const x = e.movementX / 2;
	  	const y = e.movementY / 2;
	  	renderer.rotate(x, y);
		}
	});

	let useSliders = true;

	// Listeners del panel de control
	canvas.addEventListener('wheel', e => {
	  renderer.zoom(Math.sign(e.deltaY) / 15);
		e.preventDefault();
	});

	$('#inputSteps').change(() => {
		renderer.steps = parseInt($('#inputSteps').val());
		renderer.updateControlPonts(renderer.controlPoints);
		renderer.render();
	});

	$('#inputBSn').change(() => {
		renderer.bSplineN = parseInt($('#inputBSn').val());
		renderer.updateControlPonts(renderer.controlPoints);
		renderer.render();
	});

	$('#inputBSm').change(() => {
		renderer.bSplineM = parseInt($('#inputBSm').val());
		renderer.updateControlPonts(renderer.controlPoints);
		renderer.render();
	});

	$('#inputShowCP').click(() => {
		renderer.showControlPoints = $('#inputShowCP').prop('checked');
		renderer.render();
	});

	$('#inputShowLP').click(() => {
		renderer.showLightPosition = $('#inputShowLP').prop('checked');
		renderer.render();
	});

	$('#inputUseSliders').click(() => {
		useSliders = $('#inputUseSliders').prop('checked');
		renderControlPointsPanel(renderer.controlPoints);
		renderLightPos();
	});

	$('#inputWireframe').click(() => {
		renderer.wireframeMode = $('#inputWireframe').prop('checked');
		renderer.updateControlPonts(renderer.controlPoints);
		renderer.render();
	});

	window.readControlPoints = () => {
		let controlPoints = renderer.controlPoints;
		let inputs = $('#controlPointsPanel input');
		inputs.each((i, input) => {
			let values = input.id.split('-').splice(1).map(i => parseInt(i));
			if (values[2] < 3) {
				controlPoints[values[0]][values[1]].pos[values[2]] = parseFloat(input.value);
			}
			else {
				controlPoints[values[0]][values[1]].weight = parseFloat(input.value);
			}
		});
		renderer.updateControlPonts(controlPoints);
		renderer.render();
	}

	function renderControlPointsPanel(controlPoints) {
		let newContent = "";
		controlPoints.forEach((cpRow, i) => {
			cpRow.forEach((cp, j) => {
				if (useSliders) {
					newContent += `(${i}, ${j}) - Position: (<input id="cp-${i}-${j}-0" onchange="readControlPoints()" type="range" min="-5" max="5" step="0.1" value="${cp.pos[0]}"></input>,
						<input id="cp-${i}-${j}-1" onchange="readControlPoints()" type="range" min="-5" max="5" step="0.1" value="${cp.pos[1]}"></input>,
						<input id="cp-${i}-${j}-2" onchange="readControlPoints()" type="range"  min="-5" max="5" step="0.1" value="${cp.pos[2]}"></input>),
						Weight:<input id="cp-${i}-${j}-3" onchange="readControlPoints()" type="range"  min="-5" max="5" step="0.1" value="${cp.weight}"></input> <br />`;
				} else {
					newContent += `(${i}, ${j}) - Position: (<input id="cp-${i}-${j}-0" onchange="readControlPoints()" type="number"step="0.1" value="${cp.pos[0]}"></input>,
						<input id="cp-${i}-${j}-1" onchange="readControlPoints()" type="number" step="0.1" value="${cp.pos[1]}"></input>,
						<input id="cp-${i}-${j}-2" onchange="readControlPoints()" type="number" step="0.1" value="${cp.pos[2]}"></input>),
						Weight:<input id="cp-${i}-${j}-3" onchange="readControlPoints()" type="number" step="0.1" value="${cp.weight}"></input> <br />`;
				}
			});
		});
		$('#controlPointsPanel').html(newContent);
	}

	window.updateLightPos = function() {
		renderer.updateLightPos([$('#light-x').val(), $('#light-y').val(), $('#light-z').val()]);
	}

	function renderLightPos() {
		let content = '';
		if (useSliders) {
			content = `(
				<input onchange="updateLightPos()" id="light-x" type="range" min="-5" max="5" step="0.1" value="${renderer.lightPos[0]}">,
				<input onchange="updateLightPos()" id="light-y" type="range" min="-5" max="5" step="0.1" value="${renderer.lightPos[1]}">,
				<input onchange="updateLightPos()" id="light-z" type="range" min="-5" max="5" step="0.1" value="${renderer.lightPos[2]}">)`;
		} else {
			content = `(
				<input onchange="updateLightPos()" id="light-x" type="number" step="0.1" value="${renderer.lightPos[0]}">,
				<input onchange="updateLightPos()" id="light-y" type="number" step="0.1" value="${renderer.lightPos[1]}">,
				<input onchange="updateLightPos()" id="light-z" type="number" step="0.1" value="${renderer.lightPos[2]}">)`;
		}
		$('#inputLightPos').html(content);
	}

	function generateControlPoints () {
		let controlPoints = [];
		let n = $('#inputCPx')['0'].value;
		let m = $('#inputCPy')['0'].value
		for (let i = 0; i < n; i++) {
			let row = [];
			for (let j = 0; j < m; j++) {
				row.push({pos: [-1 + (i / (n - 1)) * 2, 0, -1 + (j / (m - 1)) * 2], weight: 1});
			}
			controlPoints.push(row);
		}
		renderer.updateControlPonts(controlPoints);
		renderer.render();
		renderControlPointsPanel(controlPoints);
	}

	$('#inputCPx').change(generateControlPoints);
	$('#inputCPy').change(generateControlPoints);
	generateControlPoints();
	renderLightPos();
})
