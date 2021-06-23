class Renderer {
  angleX = 0;
  angleY = 0;
  zoomLevel = 1;

	bSplineN = 2;
	bSplineM = 2;
	steps = 100;
	controlPoints = [];

	showControlPoints = true;

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
			normal = normalize(norm);
      gl_Position = projection * view * vec4(worldPos, 1);
    }
  `;

  fragmentShaderSrc = `
    precision lowp float;

    uniform vec3 color;
    uniform vec3 lightPos;
    uniform vec3 viewPos;

    varying vec3 normal;
    varying vec3 worldPos;

    void main() {
			vec3 lightDir = normalize(lightPos - worldPos);
			vec3 viewDir = normalize(viewPos - worldPos);
			vec3 reflectDir = reflect(-lightDir, normal);
			float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.);
			vec3 specular = vec3(1, 1, 1) * spec;

			float angle = max(dot(normal, lightDir), 0.0);
			vec3 diffuse = color * angle;

			vec3 ambient = color * 0.2;
      gl_FragColor = vec4(specular + diffuse + ambient, 1);
    }
  `;

  locations = {
    attrib: {pos: -1, norm: -1},
    uniform: {projection: -1, view: -1, model: -1, color: -1, lightPos: -1, viewPos: -1}
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
    gl.uniformMatrix4fv(this.locations.uniform.view, false, this.viewMatrix);

    this.locations.uniform.projection = gl.getUniformLocation(this.program, 'projection');
    const projectionMatrix = createPerspectiveMatrix(90, 4/3, 0.001, 10000);
    gl.uniformMatrix4fv(this.locations.uniform.projection, false, projectionMatrix);

    this.locations.uniform.color = gl.getUniformLocation(this.program, 'color');
    gl.uniform3fv(this.locations.uniform.color, [0, 0, 1]);

    this.locations.uniform.viewPos = gl.getUniformLocation(this.program, 'viewPos');
		this.viewPos = [0, 0, 3];
    gl.uniform3fv(this.locations.uniform.viewPos, this.viewPos);

    this.locations.uniform.lightPos = gl.getUniformLocation(this.program, 'lightPos');
    gl.uniform3fv(this.locations.uniform.lightPos, [1, 10, -1]);

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

		// Mantenemos una copia de la inversa para poder calcular la posicion de la camara (es mas barato esto q inveritrla)
		this.viewMatrixInv = createScalingMatrix(1 / this.zoomLevel, 1 / this.zoomLevel, 1 / this.zoomLevel);
		this.viewMatrixInv = multMatrix(this.viewMatrixInv, createRotationMatrix(-this.angleX, 0, 1, 0));
		this.viewMatrixInv = multMatrix(this.viewMatrixInv, createRotationMatrix(-this.angleY, 1, 0, 0));
		this.viewMatrixInv = multMatrix(this.viewMatrixInv, createTranslationMatrix(0, 0, 3));

		this.viewPos = multMatrixVec(this.viewMatrixInv, [0, 0, 0, 1]);
    gl.useProgram(this.program);
    gl.uniformMatrix4fv(this.locations.uniform.view, false, this.viewMatrix);
    gl.uniform3fv(this.locations.uniform.viewPos, this.viewPos.splice(0, 3));
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
    const redColor = [1, 0, 0], blueColor = [0, 0, 1];
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

		if (this.showControlPoints) {
			gl.enable(gl.CULL_FACE);
    	gl.useProgram(this.program);
    	gl.bindBuffer(gl.ARRAY_BUFFER, this.cubeMeshBuffer);
    	gl.vertexAttribPointer(this.locations.attrib.pos, 3, gl.FLOAT, false, 24, 0);
    	gl.vertexAttribPointer(this.locations.attrib.norm, 3, gl.FLOAT, false, 24, 12);
    	gl.enableVertexAttribArray(this.locations.attrib.pos);
    	gl.enableVertexAttribArray(this.locations.attrib.norm);
    	gl.uniform3fv(this.locations.uniform.color, redColor);
			for (let i = 0; i < this.controlPoints.length; i++) {
				for (let j = 0; j < this.controlPoints[i].length; j++) {
					let modelMat = createTranslationMatrix(this.controlPoints[i][j].pos[0], this.controlPoints[i][j].pos[1], this.controlPoints[i][j].pos[2]);
					modelMat = multMatrix(modelMat, createScalingMatrix(.05,.05,.05));
					gl.uniformMatrix4fv(this.locations.uniform.model, false, modelMat);
					gl.drawArrays(gl.TRIANGLES, 0, 36);
				}
			}
		}

		if (this.controlPoints.length > 0) {
			gl.disable(gl.CULL_FACE);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.surfaceMeshBuffer);
    	gl.vertexAttribPointer(this.locations.attrib.pos, 3, gl.FLOAT, false, 24, 0);
    	gl.vertexAttribPointer(this.locations.attrib.norm, 3, gl.FLOAT, false, 24, 12);
    	gl.enableVertexAttribArray(this.locations.attrib.pos);
    	gl.enableVertexAttribArray(this.locations.attrib.norm);
    	gl.uniform3fv(this.locations.uniform.color, blueColor);
			gl.uniformMatrix4fv(this.locations.uniform.model, false, createIdentityMatrix());
			gl.drawArrays(gl.TRIANGLES, 0, (this.steps - 1) * (this.steps - 1) * 2 * 3);
		}
  }

	NURBS_N(i, n, t) {
		// Version n = 3 hardcodeada
		//if (i <= t && t < i + 1) {
		//	let u = t - i;
		//	return Math.pow(u, 2) / 2;
		//} else if (i + 1 <= t && t < i + 2) {
		//	let u = t - (i + 1);
		//	return -Math.pow(u, 2)  + u + 1/2;
		//} else if (i + 2 <= t && t < i + 3) {
		//	let u = t -  (i + 2);
		//	return Math.pow(1 - u, 2) / 2;
		//} else {
		//	return 0;
		//}

		//// Version n = 2 hardcodeada
		//if (i <= t && t <= i + 1) {
		//	return t - i;
		//} else if (i + 1 <= t && t <= i + 2) {
		//	return 2 - t + i;
		//} else {
		//	return 0;
		//}

		// Version recursiva generica
		if (n === 0) {
			return (i <= t && t < i + 1) ? 1 : 0;
		} else {
			return this.NURBS_N(i, n - 1, t) * (t - i) / n + this.NURBS_N(i + 1, n - 1, t) * (i + n + 1 - t) / n;
		}
	}

	updateControlPonts (points) {
		this.controlPoints = points;
		let sample = [];
		// Samplear (steps * steps) puntos en la superficie
		let print = true;
		for (let i = 0; i < this.steps; i++) {
			for (let j = 0; j < this.steps; j++) {
				// obtener los parametros del punto (i, j), oscilan entre 1 y cantidad de puntos
				let u = (1 + (this.bSplineN - 2)) + ((i / (this.steps - 1)) * (points.length - (1 + this.bSplineN - 2)));
				let v = (1 + (this.bSplineM - 2)) + ((j / (this.steps - 1)) * (points[0].length - (1 + this.bSplineM - 2)));

				// Divisor para normalizar el peso
				let normFactor = 0;
				let nurbsCoef = new Array(points.length);
				let sum = 0;
				for (let k = 0; k < points.length; k++) {
					nurbsCoef[k] = new Array(points[0].length);
					for (let l = 0; l < points[0].length; l++) {
						const nu = this.NURBS_N(k, this.bSplineN - 1, u), nv = this.NURBS_N(l, this.bSplineM - 1, v);
						nurbsCoef[k][l] = nu * nv;
						sum += nu * nv;
						normFactor += nurbsCoef[k][l] * points[k][l].weight;
					}
				}
				if (Math.abs(sum - 1) > 0.0001) {
					console.warn(`${sum} should be 1 at (u, v) = (${u},${v})`);
				}
				// Calcular la posicion del punto (u,v) en base a los puntos de control
				let pos = [0, 0, 0];
				for (let k = 0; k < points.length; k++) {
					for (let l = 0; l < points[0].length; l++) {
						let cp = points[k][l];

						let Ruv = nurbsCoef[k][l] * cp.weight / normFactor;

						pos[0] += cp.pos[0] * Ruv;
						pos[1] += cp.pos[1] * Ruv;
						pos[2] += cp.pos[2] * Ruv;
					}
				}
				sample.push(pos);
			}
			print = false;
		}

		let triangles = [];
		// triangular la superficie en base a los puntos obtenidos
		for (let i = 0; i < this.steps - 1; i++) {
			for (let j = 0; j < this.steps - 1; j++) {
				// Tomar de a 4 vertices y dividir en triangulos
				let p_ij = sample[i * this.steps + j];
				let p_i1j = sample[(i + 1) * this.steps + j];
				let p_ij1 = sample[i * this.steps + (j + 1)];
				let p_i1j1 = sample[(i + 1) * this.steps + (j + 1)];

				// Triangle: (i,j), (i+1,j), (i,j+1)
				let normal = normalize(vectorCrossProduct(vectorSubtraction(p_i1j, p_ij), vectorSubtraction(p_ij, p_ij1)));
				triangles.push(p_ij);
				triangles.push(normal);
				triangles.push(p_i1j);
				triangles.push(normal);
				triangles.push(p_ij1);
				triangles.push(normal);

				// Triangle: (i+1,j), (i,j+1), (i+1,j+1)
				normal = normalize(vectorCrossProduct(vectorSubtraction(p_i1j1, p_i1j), vectorSubtraction(p_i1j, p_ij1)));
				triangles.push(p_i1j);
				triangles.push(normal);
				triangles.push(p_ij1);
				triangles.push(normal);
				triangles.push(p_i1j1);
				triangles.push(normal);
			}
		}
		triangles = triangles.flat();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.surfaceMeshBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(triangles), gl.STREAM_DRAW);
	}
}

