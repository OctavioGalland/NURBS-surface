'use strict'

$(document).ready(() => {
  const canvas = document.getElementById('canvas');
  const gl = canvas.getContext('webgl');

  // Make gl context globally available
  window.gl = gl;

  const renderer = new Renderer();

  let dragging = false;

  let selectedControlPoint = {
    x: 0,
    y: 0
  };

  let availableControlPoints = {
    x: 3,
    y: 3
  };

  // Canvas event listeners
  let dragStartTime = 0;
  canvas.addEventListener('mousedown', e => {
    dragging = true;
    dragStartTime = new Date().getTime();
  });
  canvas.addEventListener('mouseup', e => {
    dragging = false;
    // TODO: this logic should be placed somewhere else
    const dragEndTime = new Date().getTime();
    if (dragEndTime - dragStartTime < 250) {
      // Unproject mouse coordinates into world space and cast a ray in that direction
      const mouseX = e.x - e.target.offsetLeft;
      const mouseY = e.y - e.target.offsetTop;
      const coordX = (mouseX - (800 / 2)) / (800 / 2);
      const coordY = -(mouseY - (600 / 2)) / (600 / 2);
      const viewCoords = multMatrixVec(renderer.projectionMatrixInv, [coordX, coordY, -1, 1]);
      const worldCoords = multMatrixVec(renderer.viewMatrixInv, [viewCoords[0], viewCoords[1], -1, 0]);
      const rayDir = normalize([worldCoords[0], worldCoords[1], worldCoords[2]]);
      // Check for intersections between the casted ray and each control point
      let nearestIntersection = {dist: -1, i: -1, j: -1};
      for (let i = 0; i < renderer.controlPoints.length; i++) {
        for (let j = 0; j < renderer.controlPoints[i].length; j++) {
          // https://antongerdelan.net/opengl/raycasting.html
          // Treat each control point as a sphere and check if it intersects the ray casted from the camera position
          const cpPos = renderer.controlPoints[i][j].pos;
          const co = vectorSubtraction(renderer.viewPos, cpPos);
          const b = vectorDotProduct(rayDir, co);
          const c = vectorDotProduct(co, co) - 0.0036; // give each sphere a radius of 0.06
          if (b * b - c >= 0) {
            // Intersection! check for a closer one or update the selected control point
            const distanceFromCamera = length(co);
            if (nearestIntersection.dist < 0 || distanceFromCamera < nearestIntersection.dist) {
              nearestIntersection.dist = distanceFromCamera;
              nearestIntersection.i = i;
              nearestIntersection.j = j;
            }
          }
        }
      }
      if (nearestIntersection.dist > 0) {
        selectedControlPoint.x = nearestIntersection.i;
        selectedControlPoint.y = nearestIntersection.j;
        renderControlPointsPanel();
        renderer.updateSelectedControlPoint(selectedControlPoint);
        renderer.render();
      }
    }
  });

  canvas.addEventListener('mousemove', e => {
    if (dragging) {
      const x = e.movementX / 2;
      const y = e.movementY / 2;
      renderer.rotate(x, y);
    }
  });

  let useSliders = true;

  // Control panel event listeners
  canvas.addEventListener('wheel', e => {
    renderer.zoom(-Math.sign(e.deltaY) / 15);
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

  $('#inputAverageNormals').click(() => {
    renderer.averageNormals = $('#inputAverageNormals').prop('checked');
    renderer.updateControlPonts(renderer.controlPoints);
    renderer.render();
  });

  $('#left-button').click(() => {
    if (selectedControlPoint.x == 0) {
      selectedControlPoint.x = availableControlPoints.x - 1;
      if (selectedControlPoint.y == 0) {
        selectedControlPoint.y = availableControlPoints.y - 1;
      } else {
        selectedControlPoint.y -= 1;
      }
    } else {
      selectedControlPoint.x -= 1;
    }
    renderControlPointsPanel()
    renderer.updateSelectedControlPoint(selectedControlPoint);
    renderer.render();
  });

  $('#right-button').click(() => {
    if (selectedControlPoint.x == availableControlPoints.x - 1) {
      selectedControlPoint.x = 0;
      if (selectedControlPoint.y == availableControlPoints.y - 1) {
        selectedControlPoint.y = 0;
      } else {
        selectedControlPoint.y += 1;
      }
    } else {
      selectedControlPoint.x += 1;
    }
    renderControlPointsPanel()
    renderer.updateSelectedControlPoint(selectedControlPoint);
    renderer.render();
  });

  window.readControlPoints = () => {
    let controlPoints = renderer.controlPoints;
    let inputs = $('#controlPointsPanel input');
    inputs.each((i, input) => {
      let values = input.id.split('-').splice(1).map(i => parseInt(i));
      if (values[0] < 3) {
        controlPoints[selectedControlPoint.x][selectedControlPoint.y].pos[values[0]] = parseFloat(input.value);
      }
      else {
        controlPoints[selectedControlPoint.x][selectedControlPoint.y].weight = parseFloat(input.value);
      }
    });
    renderer.updateControlPonts(controlPoints);
    renderer.render();
  }

  function renderControlPointsPanel() {
    let controlPoint = renderer.controlPoints[selectedControlPoint.x][selectedControlPoint.y];
    let newContent = "";
    if (useSliders) {
      newContent += `Position: (<input id="cp-0" oninput="readControlPoints()" type="range" min="-5" max="5" step="0.1" value="${controlPoint.pos[0]}"></input>,
        <input id="cp-1" oninput="readControlPoints()" type="range" min="-5" max="5" step="0.1" value="${controlPoint.pos[1]}"></input>,
        <input id="cp-2" oninput="readControlPoints()" type="range"  min="-5" max="5" step="0.1" value="${controlPoint.pos[2]}"></input>),
        Weight:<input id="cp-3" oninput="readControlPoints()" type="range"  min="-5" max="5" step="0.1" value="${controlPoint.weight}"></input> <br />`;
    } else {
      newContent += `Position: (<input id="cp-0" onchange="readControlPoints()" type="number"step="0.1" value="${controlPoint.pos[0]}"></input>,
        <input id="cp-1" onchange="readControlPoints()" type="number" step="0.1" value="${controlPoint.pos[1]}"></input>,
        <input id="cp-2" onchange="readControlPoints()" type="number" step="0.1" value="${controlPoint.pos[2]}"></input>),
        Weight:<input id="cp-3" onchange="readControlPoints()" type="number" step="0.1" value="${controlPoint.weight}"></input> <br />`;
    }
    $('#controlPointsPanel').html(newContent);
    $('#selectedPoint').text('(' + selectedControlPoint.x + ', ' + selectedControlPoint.y + ')');
  }

  window.updateLightPos = function() {
    renderer.updateLightPos([$('#light-x').val(), $('#light-y').val(), $('#light-z').val()]);
  }

  function renderLightPos() {
    let content = '';
    if (useSliders) {
      content = `(
        <input oninput="updateLightPos()" id="light-x" type="range" min="-5" max="5" step="0.1" value="${renderer.lightPos[0]}">,
        <input oninput="updateLightPos()" id="light-y" type="range" min="-5" max="5" step="0.1" value="${renderer.lightPos[1]}">,
        <input oninput="updateLightPos()" id="light-z" type="range" min="-5" max="5" step="0.1" value="${renderer.lightPos[2]}">)`;
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
    let m = $('#inputCPy')['0'].value;
    availableControlPoints.x = n;
    availableControlPoints.y = m;
    selectedControlPoint.x = 0;
    selectedControlPoint.y = 0;
    for (let i = 0; i < n; i++) {
      let row = [];
      for (let j = 0; j < m; j++) {
        row.push({pos: [-1 + (i / (n - 1)) * 2, 0, -1 + (j / (m - 1)) * 2], weight: 1});
      }
      controlPoints.push(row);
    }
    renderer.updateControlPonts(controlPoints);
    renderer.render();
    renderControlPointsPanel();
  }

  $('#inputCPx').change(generateControlPoints);
  $('#inputCPy').change(generateControlPoints);
  generateControlPoints();
  renderLightPos();
})
