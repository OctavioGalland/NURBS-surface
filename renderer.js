class Renderer {
  angleX = 0;
  angleY = 0;
  zoomLevel = 1;

  bSplineN = 2;
  bSplineM = 2;
  steps = 10;
  controlPoints = [];

  showControlPoints = true;
  showLightPosition = true;
  wireframeMode = false;
  averageNormals = false;

  selectedControlPoint = {
    x: 0,
    y: 0
  };

  vertexShaderSrc = `
    uniform mat4 projection;
    uniform mat4 view;
    uniform mat4 model;

    attribute vec3 pos;
    attribute vec3 norm;

    varying vec3 normal;
    varying vec3 worldPos;

    void main() {
      worldPos = (model * vec4(pos, 1)).xyz;
      normal = normalize(model * vec4(norm, 0)).xyz;
      gl_Position = projection * view * vec4(worldPos, 1);
    }
  `;

  fragmentShaderSrc = `
    precision mediump float;

    uniform int usePlainColor;
    uniform vec3 color;
    uniform vec3 lightPos;
    uniform vec3 viewPos;

    varying vec3 normal;
    varying vec3 worldPos;

    void main() {
      if (usePlainColor == 1) {
        gl_FragColor = vec4(color, 1);
      } else {
        vec3 nNormal = normalize(normal);

        // Apply Blinn-Phong assuming a white light
        vec3 lightDir = normalize(lightPos - worldPos);
        vec3 viewDir = normalize(viewPos - worldPos);
        vec3 H = normalize(lightDir + viewDir);
        float spec = pow(max(dot(nNormal, H), 0.0), 64.);
        vec3 specular = vec3(1, 1, 1) * spec;

        float angle = max(dot(nNormal, lightDir), 0.0);
        vec3 diffuse = color * angle;

        vec3 ambient = color * 0.2;
        gl_FragColor = vec4(specular + diffuse + ambient, 1);
      }
    }
  `;

  locations = {
    attrib: {pos: -1, norm: -1},
    uniform: {projection: -1, view: -1, model: -1, color: -1, lightPos: -1, viewPos: -1, usePlainColor: -1}
  };

  constructor () {
    this.cubeMeshBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeMeshBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeMesh), gl.STATIC_DRAW);

    this.program = this.createProgram(this.vertexShaderSrc, this.fragmentShaderSrc);
    gl.useProgram(this.program);
    this.locations.attrib.pos = gl.getAttribLocation(this.program, 'pos');
    gl.vertexAttribPointer(this.locations.attrib.pos, 3, gl.FLOAT, false, 24, 0);

    this.locations.attrib.norm = gl.getAttribLocation(this.program, 'norm');
    gl.vertexAttribPointer(this.locations.attrib.norm, 3, gl.FLOAT, false, 24, 12);

    this.locations.uniform.model = gl.getUniformLocation(this.program, 'model');

    this.locations.uniform.view = gl.getUniformLocation(this.program, 'view');
    this.viewMatrix = createTranslationMatrix(0, 0, -3);
    this.viewMatrixInv = createTranslationMatrix(0, 0, 3);
    gl.uniformMatrix4fv(this.locations.uniform.view, false, this.viewMatrix);

    this.locations.uniform.projection = gl.getUniformLocation(this.program, 'projection');
    this.projectionMatrix = createPerspectiveMatrix(90, 4/3, 0.001, 10000);
    this.projectionMatrixInv = invertMatrix(this.projectionMatrix);
    gl.uniformMatrix4fv(this.locations.uniform.projection, false, this.projectionMatrix);

    this.locations.uniform.color = gl.getUniformLocation(this.program, 'color');
    gl.uniform3fv(this.locations.uniform.color, [0, 0, 1]);

    this.locations.uniform.viewPos = gl.getUniformLocation(this.program, 'viewPos');
    this.viewPos = [0, 0, 3];
    gl.uniform3fv(this.locations.uniform.viewPos, this.viewPos);

    this.locations.uniform.lightPos = gl.getUniformLocation(this.program, 'lightPos');
    this.lightPos = [1, 1, -1];
    gl.uniform3fv(this.locations.uniform.lightPos, this.lightPos);

    this.locations.uniform.usePlainColor = gl.getUniformLocation(this.program, 'usePlainColor');

    gl.enable(gl.DEPTH_TEST);

    this.surfaceMeshBuffer = gl.createBuffer();
  }

  createProgram (vshad, fshad) {
    const vertexShader = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vertexShader, vshad);
    gl.compileShader(vertexShader);
    if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(vertexShader);
      console.error(`Could not compile vertex shader: ${info}\n`);
      return -1;
    }

    const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fragmentShader, fshad);
    gl.compileShader(fragmentShader);
    if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(fragmentShader);
      console.error(`Could not compile fragment shader: ${info}\n`);
      return -1;
    }

    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program);
      console.error(`Could not link program: ${info}\n`);
      return -1;
    }

    return program;
  }

  reCreateViewMatrix () {
    this.viewMatrix = multMatrix(createTranslationMatrix(0, 0, -3), createRotationMatrix(this.angleY, 1, 0, 0));
    this.viewMatrix = multMatrix(this.viewMatrix, createRotationMatrix(this.angleX, 0, 1, 0));
    this.viewMatrix = multMatrix(this.viewMatrix, createScalingMatrix(this.zoomLevel, this.zoomLevel, this.zoomLevel));

    // Calculate the inverse of the view matrix as we go, this is cheaper than inverting it afterwards
    this.viewMatrixInv = createScalingMatrix(1 / this.zoomLevel, 1 / this.zoomLevel, 1 / this.zoomLevel);
    this.viewMatrixInv = multMatrix(this.viewMatrixInv, createRotationMatrix(-this.angleX, 0, 1, 0));
    this.viewMatrixInv = multMatrix(this.viewMatrixInv, createRotationMatrix(-this.angleY, 1, 0, 0));
    this.viewMatrixInv = multMatrix(this.viewMatrixInv, createTranslationMatrix(0, 0, 3));

    this.viewPos = multMatrixVec(this.viewMatrixInv, [0, 0, 0, 1]).splice(0, 3);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.locations.uniform.view, false, this.viewMatrix);
    gl.uniform3fv(this.locations.uniform.viewPos, this.viewPos);
  }

  rotate (dx, dy) {
    this.angleX += dx;
    this.angleY += dy;
    this.angleX = this.angleX % 360;
    this.angleY = Math.max(-90, Math.min(90, this.angleY));

    this.reCreateViewMatrix();
    this.render();
  }

  zoom (s) {
    this.zoomLevel += s;
    this.reCreateViewMatrix();
    this.render();
  }

  render () {
    const redColor = [1, 0, 0], blueColor = [0, 0, 1], greenColor = [0, 1, 0], whiteColor = [1, 1, 1];
    gl.clearColor(0.9, 0.85, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    gl.useProgram(this.program);
    gl.enable(gl.CULL_FACE);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeMeshBuffer);
    gl.vertexAttribPointer(this.locations.attrib.pos, 3, gl.FLOAT, false, 24, 0);
    gl.vertexAttribPointer(this.locations.attrib.norm, 3, gl.FLOAT, false, 24, 12);
    gl.enableVertexAttribArray(this.locations.attrib.pos);
    gl.enableVertexAttribArray(this.locations.attrib.norm);

    if (this.showLightPosition) {
      gl.uniform3fv(this.locations.uniform.color, whiteColor);
      gl.uniform1i(this.locations.uniform.usePlainColor, 1);
      let modelMat = createTranslationMatrix(this.lightPos[0], this.lightPos[1], this.lightPos[2]);
      modelMat = multMatrix(modelMat, createScalingMatrix(.05,.05,.05));
      gl.uniformMatrix4fv(this.locations.uniform.model, false, modelMat);
      gl.drawArrays(gl.TRIANGLES, 0, 36);
    }

    gl.uniform1i(this.locations.uniform.usePlainColor, 0);
    if (this.showControlPoints) {
      gl.uniform3fv(this.locations.uniform.color, redColor);
      for (let i = 0; i < this.controlPoints.length; i++) {
        for (let j = 0; j < this.controlPoints[i].length; j++) {
          if (i == this.selectedControlPoint.x && j == this.selectedControlPoint.y) {
            continue;
          }
          let modelMat = createTranslationMatrix(this.controlPoints[i][j].pos[0], this.controlPoints[i][j].pos[1], this.controlPoints[i][j].pos[2]);
          modelMat = multMatrix(modelMat, createScalingMatrix(.05,.05,.05));
          gl.uniformMatrix4fv(this.locations.uniform.model, false, modelMat);
          gl.drawArrays(gl.TRIANGLES, 0, 36);
        }
      }

      //selected control point
      gl.uniform3fv(this.locations.uniform.color, greenColor);
      let modelMat = createTranslationMatrix(this.controlPoints[this.selectedControlPoint.x][this.selectedControlPoint.y].pos[0],
                                             this.controlPoints[this.selectedControlPoint.x][this.selectedControlPoint.y].pos[1],
                                             this.controlPoints[this.selectedControlPoint.x][this.selectedControlPoint.y].pos[2]);
      modelMat = multMatrix(modelMat, createScalingMatrix(.05,.05,.05));
      gl.uniformMatrix4fv(this.locations.uniform.model, false, modelMat);
      gl.drawArrays(gl.TRIANGLES, 0, 36);
    }

    if (this.controlPoints.length > 0) {
      if (this.wireframeMode) {
        gl.uniform1i(this.locations.uniform.usePlainColor, 1);
      }
      gl.disable(gl.CULL_FACE);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.surfaceMeshBuffer);
      gl.vertexAttribPointer(this.locations.attrib.pos, 3, gl.FLOAT, false, 24, 0);
      gl.vertexAttribPointer(this.locations.attrib.norm, 3, gl.FLOAT, false, 24, 12);
      gl.enableVertexAttribArray(this.locations.attrib.pos);
      gl.enableVertexAttribArray(this.locations.attrib.norm);
      gl.uniform3fv(this.locations.uniform.color, blueColor);
      gl.uniformMatrix4fv(this.locations.uniform.model, false, createIdentityMatrix());
      if (this.wireframeMode) {
        gl.drawArrays(gl.LINES, 0, (this.steps - 1) * (this.steps - 1) * 2 * 3 * 2);
      } else {
        gl.drawArrays(gl.TRIANGLES, 0, (this.steps - 1) * (this.steps - 1) * 2 * 3);
      }
    }
  }

  bspline_basis(i, n, t) {
    // Version n = 3 used for debugging
    //if (i <= t && t < i + 1) {
    //  let u = t - i;
    //  return Math.pow(u, 2) / 2;
    //} else if (i + 1 <= t && t < i + 2) {
    //  let u = t - (i + 1);
    //  return -Math.pow(u, 2)  + u + 1/2;
    //} else if (i + 2 <= t && t < i + 3) {
    //  let u = t -  (i + 2);
    //  return Math.pow(1 - u, 2) / 2;
    //} else {
    //  return 0;
    //}

    //// Version n = 2 used for debugging
    //if (i <= t && t <= i + 1) {
    //  return t - i;
    //} else if (i + 1 <= t && t <= i + 2) {
    //  return 2 - t + i;
    //} else {
    //  return 0;
    //}

    // Recursive version
    if (n === 0) {
      return (i <= t && t < i + 1) ? 1 : 0;
    } else {
      return this.bspline_basis(i, n - 1, t) * (t - i) / n + this.bspline_basis(i + 1, n - 1, t) * (i + n + 1 - t) / n;
    }
  }

  updateLightPos (pos) {
    this.lightPos = pos;
    gl.uniform3fv(this.locations.uniform.lightPos, this.lightPos);
    this.render();
  }

  updateSelectedControlPoint(selectedPoint) {
    this.selectedControlPoint = selectedPoint;
  }

  updateControlPonts (points) {
    this.controlPoints = points;
    let sample = new Array(this.steps * this.steps);
    let index = 0;
    // Sample (steps * steps) points on the surface
    for (let i = 0; i < this.steps; i++) {
      for (let j = 0; j < this.steps; j++) {
        // get the parameters for point (i, j)
        let u = (1 + (this.bSplineN - 2)) + ((i / (this.steps - 1)) * (points.length - (1 + this.bSplineN - 2)));
        let v = (1 + (this.bSplineM - 2)) + ((j / (this.steps - 1)) * (points[0].length - (1 + this.bSplineM - 2)));

        // Coefficient used for normalizing the weights
        let normFactor = 0;
        let nurbsCoef = new Array(points.length);
        let sum = 0;
        for (let k = 0; k < points.length; k++) {
          nurbsCoef[k] = new Array(points[0].length);
          for (let l = 0; l < points[0].length; l++) {
            const nu = this.bspline_basis(k, this.bSplineN - 1, u), nv = this.bspline_basis(l, this.bSplineM - 1, v);
            nurbsCoef[k][l] = nu * nv;
            sum += nu * nv;
            normFactor += nurbsCoef[k][l] * points[k][l].weight;
          }
        }
        if (Math.abs(sum - 1) > 0.0001) {
          console.warn(`${sum} should be 1 at (u, v) = (${u},${v})`);
        }
        // Calculate the position for point (u, v) based on the control points
        let pos = [0, 0, 0];
        for (let k = 0; k < points.length; k++) {
          for (let l = 0; l < points[0].length; l++) {
            const cp = points[k][l];

            const Ruv = nurbsCoef[k][l] * cp.weight / normFactor;

            pos[0] += cp.pos[0] * Ruv;
            pos[1] += cp.pos[1] * Ruv;
            pos[2] += cp.pos[2] * Ruv;
          }
        }
        sample[index++]  = pos;
      }
    }

    let triangles = new Array((this.steps - 1) * (this.steps - 1) * 2 * 6);
    if (this.wireframeMode) triangles = new Array((this.steps - 1) * (this.steps - 1) * 2 * 6 * 2);
    index = 0;
    // Triangulate the surface
    for (let i = 0; i < this.steps - 1; i++) {
      for (let j = 0; j < this.steps - 1; j++) {
        // Take 4 vertices and group them by triangles
        const p_ij = sample[i * this.steps + j];
        const p_i1j = sample[(i + 1) * this.steps + j];
        const p_ij1 = sample[i * this.steps + (j + 1)];
        const p_i1j1 = sample[(i + 1) * this.steps + (j + 1)];

        // Triangle: (i,j), (i+1,j), (i,j+1)
        let normal = normalize(vectorCrossProduct(vectorSubtraction(p_i1j, p_ij), vectorSubtraction(p_ij, p_ij1)));
        if (this.wireframeMode) {
          triangles[index++] = p_ij;
          triangles[index++] = normal;
          triangles[index++] = p_i1j;
          triangles[index++] = normal;
          triangles[index++] = p_i1j;
          triangles[index++] = normal;
          triangles[index++] = p_ij1;
          triangles[index++] = normal;
          triangles[index++] = p_ij1;
          triangles[index++] = normal;
          triangles[index++] = p_ij;
          triangles[index++] = normal;
        } else {
          triangles[index++] = p_ij;
          triangles[index++] = normal;
          triangles[index++] = p_i1j;
          triangles[index++] = normal;
          triangles[index++] = p_ij1;
          triangles[index++] = normal;
        }

        // Triangle: (i+1,j), (i,j+1), (i+1,j+1)
        normal = normalize(vectorCrossProduct(vectorSubtraction(p_i1j1, p_i1j), vectorSubtraction(p_i1j, p_ij1)));
        if (this.wireframeMode) {
          triangles[index++] = p_i1j;
          triangles[index++] = normal;
          triangles[index++] = p_ij1;
          triangles[index++] = normal;
          triangles[index++] = p_ij1;
          triangles[index++] = normal;
          triangles[index++] = p_i1j1;
          triangles[index++] = normal;
          triangles[index++] = p_i1j1;
          triangles[index++] = normal;
          triangles[index++] = p_i1j;
          triangles[index++] = normal;
        } else {
          triangles[index++] = p_i1j;
          triangles[index++] = normal;
          triangles[index++] = p_ij1;
          triangles[index++] = normal;
          triangles[index++] = p_i1j1;
          triangles[index++] = normal;
        }
      }
    }

    if (!this.wireframeMode && this.averageNormals) {
      // Average normals for each vertex in order to get a smoother look
      let averagedTriangles = new Array(triangles.length)
      const trianglesPerRow = (this.steps - 1) * 2;
      const elementsPerTriangle = 6;
      const elementsPerRow = trianglesPerRow * elementsPerTriangle;
      for (let i = 0; i < triangles.length; i += 2) {
        const vertex = triangles[i];
        let normal = [0, 0, 0];
        let normalsCount = 0;
        let visitedVertices = {};
        // Look for matching vertices 1 square around this vertex
        const squareIndex = Math.floor(i / 12) * (2 * elementsPerTriangle);
        for (let j = -1; j < 2; j++) {
          for (let k = -1; k < 2; k++) {
            for (let l = 0; l < 6; l++) {
              const offset = j * elementsPerRow + k * (2 * elementsPerTriangle) + l * 2;
              const vertexIndex = squareIndex + offset;
              const vertexId = vertexIndex.toString();
              if (vertexIndex >= 0 && vertexIndex < triangles.length && !visitedVertices[vertexId]) {
                visitedVertices[vertexId] = true;
                const difference = vectorSubtraction(vertex, triangles[vertexIndex]);
                if (difference[0] * difference[0] + difference[1] * difference[1] + difference[2] * difference[2] < 0.0000001) {
                  normal = vectorAddition(normal, triangles[vertexIndex + 1]);
                  normalsCount++;
                }
              }
            }
          }
        }
        normal = vectorScale(normal, 1 / normalsCount);
        averagedTriangles[i] = vertex;
        averagedTriangles[i + 1] = normalize(normal);
      }
      triangles = averagedTriangles;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, this.surfaceMeshBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangles.flat()), gl.STREAM_DRAW);
  }
}

