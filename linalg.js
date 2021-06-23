function createIdentityMatrix() {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
}

function createPerspectiveMatrix(fovy, aspect, znear, zfar) {
  const f = 1 / Math.tan((fovy * Math.PI / 180) / 2);
  return [f/aspect, 0, 0, 0,
          0, f, 0, 0,
          0, 0, (zfar + znear) / (znear - zfar), -1,
          0, 0, (2 * znear * zfar) / (znear - zfar), 0];
}

function createTranslationMatrix(x, y, z) {
  return [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
}

function createScalingMatrix(sx, sy, sz) {
  return [sx, 0, 0, 0, 0, sy, 0, 0, 0, 0, sz, 0, 0, 0, 0, 1]
}

function createRotationMatrix(angle, x, y, z) {
  const len = Math.sqrt(x * x + y * y + z * z);
  const nx = x / len, ny = y / len, nz = z / len;
  const rad = angle * Math.PI / 180;
  const c = Math.cos(rad), s = Math.sin(rad);
  return [x * x * (1 - c) + c, x * y * (1 - c) + z * s, x * z * (1 - c) - y * s, 0,
          x * y * (1 - c) - z * s, y * y * (1 - c) + c, y * z * (1 - c) + x * s, 0,
          x * z * (1 - c) + y * s, y * z * (1 - c) - x * s, z * z * (1 - c) + c, 0,
          0, 0, 0, 1];
}

function multMatrix(mat1, mat2) {
  let res = new Array(16);
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      let val = 0;
      for (let k = 0; k < 4; k++) {
        val += mat1[k * 4 + i] * mat2[j * 4 + k];
      }
      res[j * 4 + i] = val;
    }
  }
  return res;
}

function multMatrixVec(M, v) {
	let res = [0, 0, 0, 0];
	for (let i = 0; i < 4; i++) {
		for (let k = 0; k < 4; k++) {
			res[i] += M[k * 4 + i] * v[k];
		}
	}
	return res;
}

function vectorCrossProduct(v1, v2) {
	return [v1[1] * v2[2] - v1[2] * v2[1], v1[2] * v2[0] - v1[0] * v2[2], v1[0] * v2[1] - v1[1] * v2[0]];
}

function vectorSubtraction(v1, v2) {
	return [v1[0] - v2[0], v1[1] - v2[1], v1[2] - v2[2]];
}

function length(v) {
	return Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
}
function normalize(v) {
	const len = length(v);
	return [v[0] / len, v[1] / len, v[2] / len];
}


