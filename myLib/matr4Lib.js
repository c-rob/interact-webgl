// Roberto C. 27/08/2016

"use strict";

/**
*	Matrix 4 constructor:
*	The object is initialized as the identity matrix by default. If an 
*	argument is specified the it's initialized as copy of the argument.
*	It is highly recommended to create objects only in the initalization phases
*	@param {Array|Matrix4} srcMat Optional source of elements to be
*		copied in the matrix. It can be both a Float32Array or a native Array object.
*	@constructor
*	@classdesc
*	Matrix object definition and related functions
*	Entries are represented in a single typed Float32Array in
*	column major order. This version of the Matrix4 object modifies always
*	the internal state of objects. The use of new is minimast so to speed
*	up frequent call. The prototype will contain an auxiliary array where
*	calculation can be performed.
*	-- 'set' methods redefine all the entries of the matrix
*	-- other methos will transform the matrix accordingly
*	All matrices are points transformation matrices. Frames cannot directly be handled.
*/
var Matrix4 = function(srcMat) {
	
	this.entries = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
	
	if (srcMat) {
		if (srcMat instanceof Matrix4) {
			var d = this.entries;
			var s = srcMat.entries;
			for (var i = 0; i < 16; ++i) {
				d[i] = s[i];
			}
		} else if (Object.prototype.toString.call(srcMat) === "[object Array]") {
			var d = this.entries;
			for (var i = 0; i < 16; ++i) {
				d[i] = srcMat[i];
			}
		}
	}
};


/**
*	Auxiliary vector n1 for calculations. Created one for all objects.
*/
Matrix4.prototype.aux1 = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);
/**
*	Auxiliary vector n2 for calculations. Created one for all objects.
*/
Matrix4.prototype.aux2 = new Float32Array([1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]);


/**
*	toString. Useful for debugging purposes.
*	@param {number} decimals A positive number of this optional parameter will show <decimals>
*		digits after the point.
*	@param {boolean} html If the optional parameter is specified then each row of the matrix
*		is interrupted by the html tag; "\r\n" otherwise.
*	@return {string} String representation of the matrix.
*/
Matrix4.prototype.toString = function(decimals, html) {
	var s = "";
	var e = this.entries;
	var endRow = ";\r\n";
	if (html) {
		endRow = ";<br>";
	}
	
	// with decimal rounding
	if (decimals) {
		s += e[0].toFixed(decimals) + ", " + e[4].toFixed(decimals) + ", " + e[8 ].toFixed(decimals) + ", " + e[12].toFixed(decimals) + endRow;
		s += e[1].toFixed(decimals) + ", " + e[5].toFixed(decimals) + ", " + e[9 ].toFixed(decimals) + ", " + e[13].toFixed(decimals) + endRow;
		s += e[2].toFixed(decimals) + ", " + e[6].toFixed(decimals) + ", " + e[10].toFixed(decimals) + ", " + e[14].toFixed(decimals) + endRow;
		s += e[3].toFixed(decimals) + ", " + e[7].toFixed(decimals) + ", " + e[11].toFixed(decimals) + ", " + e[15].toFixed(decimals) + endRow;
	} else {	// without
		s += e[0] + ", " + e[4] + ", " + e[8 ] + ", " + e[12] + endRow;
		s += e[1] + ", " + e[5] + ", " + e[9 ] + ", " + e[13] + endRow;
		s += e[2] + ", " + e[6] + ", " + e[10] + ", " + e[14] + endRow;
		s += e[3] + ", " + e[7] + ", " + e[11] + ", " + e[15] + endRow;
	}
	return s;
};


/**
*	Multiplication between vectors, treated as elements of matrices
*	Utility function useful for non-set methods. Parameters can be
*	aux1 or aux2. The result is stored in this matrix. Parameters have
*	to be different from this.entries
*	@param {Float32Array} m The elements of the left matrix in the multiplication
*	@param {Float32Array} n The elements of the right matrix in the multiplication
*/
Matrix4.prototype.multArrays = function(m, n) {
	
	var r = this.entries;
	
	// check that r is not an operand
	if (r === m || r === n) {
		throw "Wrong use og multArrays function. this.entries is one of the operands.";
	}
	
	// multiply
	r[0 ] = m[0] * n[0] + m[4] * n[1] + m[8] * n[2] + m[12] * n[3];
	r[1 ] = m[1] * n[0] + m[5] * n[1] + m[9] * n[2] + m[13] * n[3];
	r[2 ] = m[2] * n[0] + m[6] * n[1] + m[10] * n[2] + m[14] * n[3];
	r[3 ] = m[3] * n[0] + m[7] * n[1] + m[11] * n[2] + m[15] * n[3];
	r[4 ] = m[0] * n[4] + m[4] * n[5] + m[8] * n[6] + m[12] * n[7];
	r[5 ] = m[1] * n[4] + m[5] * n[5] + m[9] * n[6] + m[13] * n[7];
	r[6 ] = m[2] * n[4] + m[6] * n[5] + m[10] * n[6] + m[14] * n[7];
	r[7 ] = m[3] * n[4] + m[7] * n[5] + m[11] * n[6] + m[15] * n[7];
	r[8 ] = m[0] * n[8] + m[4] * n[9] + m[8] * n[10] + m[12] * n[11];
	r[9 ] = m[1] * n[8] + m[5] * n[9] + m[9] * n[10] + m[13] * n[11];
	r[10] = m[2] * n[8] + m[6] * n[9] + m[10] * n[10] + m[14] * n[11];
	r[11] = m[3] * n[8] + m[7] * n[9] + m[11] * n[10] + m[15] * n[11];
	r[12] = m[0] * n[12] + m[4] * n[13] + m[8] * n[14] + m[12] * n[15];
	r[13] = m[1] * n[12] + m[5] * n[13] + m[9] * n[14] + m[13] * n[15];
	r[14] = m[2] * n[12] + m[6] * n[13] + m[10] * n[14] + m[14] * n[15];
	r[15] = m[3] * n[12] + m[7] * n[13] + m[11] * n[14] + m[15] * n[15];

};


/**
*	Multiplication of the current matrix whith another on the right. The result
*	is stored in the current object.
*	@param {Matrix4} mat The matrix to multiply (Matrix4)
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.multR = function(mat) {
	
	var m = this.entries;
	var n = mat.entries;
	var a = this.aux1;
	
	// copy m in aux1
	for (var i = 0; i < 16; ++i) {
		a[i] = m[i];
	}
	
	// if multiplying 2 times the same matrix
	if (m === n) {
		n = a;
	}
	
	this.multArrays(a, n);
	
	return this;
};


/**
*	Multiplication of the current matrix whith another on the left. The result
*	is stored in the current object.
*	@param {Matrix4} mat The matrix to multiply (Matrix4)
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.multL = function(mat) {
	
	var m = this.entries;
	var n = mat.entries;
	var a = this.aux1;
	
	// copy m in aux1
	for (var i = 0; i < 16; ++i) {
		a[i] = m[i];
	}
	
	// if multiplying 2 times the same matrix
	if (m === n) {
		n = a;
	}
	
	this.multArrays(n, a);
	
	return this;
};


/**
*	Transpose this matrix
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.transp = function() {
	
	var m = this.entries;
	var aux;
	
	aux = m[4];
	m[4] = m[1];
	m[1] = aux;
	
	aux = m[8];
	m[8] = m[2];
	m[2] = aux;
	
	aux = m[12];
	m[12] = m[3];	
	m[3] = aux;
	
	// row col 2
	aux = m[9];
	m[9] = m[6];
	m[6] = aux;
	
	aux = m[13];
	m[13] = m[7];
	m[7] = aux;
	
	// row col 3
	aux = m[14];
	m[14] = m[11];
	m[11] = aux;
	
	return this;
};


/**
*	Composes the transformation adding a translation. The matrix is
*	multiplied from the left by the translation matrix of [x, y, z]
*	@param {number} x X coordinate of the translation
*	@param {number} y Y coordinate of the translation
*	@param {number} z Z coordinate of the translation
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.translate = function(x, y, z) {
	
	var m = this.entries;
	var m3 = m[3], m7 = m[7], m11 = m[11], m15 = m[15];
	
	// explicit result
	m[0] = m[0] + m3 * x;
	m[1] = m[1] + m3 * y;
	m[2] = m[2] + m3 * z;
	
	m[4] = m[4] + m7 * x;
	m[5] = m[5] + m7 * y;
	m[6] = m[6] + m7 * z;
	
	m[8] = m[8] + m11 * x;	
	m[9] = m[9] + m11 * y;	
	m[10] = m[10] + m11 * z;
	
	m[12] = m[12] + m15 * x;
	m[13] = m[13] + m15 * y;
 	m[14] = m[14] + m15 * z;
	
	return this;
};


/**
*	Scale the column vectors of the current matrix by the 3
*	scale factors. Equivalent to the mult by a setScale matrix
*	@param {number} x X scale
*	@param {number} y Y scale
*	@param {number} z Z scale
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.scale = function(x, y, z) {
	
	var m = this.entries;
	
	m[0 ] = m[0] * x;
	m[1 ] = m[1] * y;
	m[2 ] = m[2] * z;
	m[4 ] = m[4] * x;
	m[5 ] = m[5] * y;
	m[6 ] = m[6] * z;
	m[8 ] = m[8] * x;
	m[9 ] = m[9] * y;
	m[10] = m[10] * z;
	m[12] = m[12] * x;
	m[13] = m[13] * y;
	m[14] = m[14] * z;
	
	return this;
};


/**
*	Rotate this matrix by the angle specified in deg along
*	the vector [x, y, z].
*	@param {number} angle The angle of rotation (deg)
*	@param {number} x The X coordinate of vector of rotation axis
*	@param {number} y The Y coordinate of vector of rotation axis
*	@param {number} z The Z coordinate of vector of rotation axis
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.rotate = function(angle, x, y, z) {
	
	var m = this.entries;
	var a1 = this.aux1;
	var a2 = this.aux2;
	
	// save m into a1
	for (var i = 0; i < 16; ++i) {
		a1[i] = m[i];
	}
	
	// set a2 to be the desired rotation
	this.entries = a2;
	this.setRotation(angle, x, y, z);
	this.entries = m;
	
	// apply the rotation. m = a2 * a1
	this.multArrays(a2, a1);
	
	return this;
};


/**
*	Composes the transformation of reference adding a translation. The matrix is
*	multiplied from the right by the translation matrix of [x, y, z]
*	@param {number} x X coordinate of the translation
*	@param {number} y Y coordinate of the translation
*	@param {number} z Z coordinate of the translation
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.translateRef = function(x, y, z) {
	
	var m = this.entries;
	var m3 = m[3], m7 = m[7], m11 = m[11], m15 = m[15];
	
	// explicit result
	m[12] = m[12] + m[0]* x + m[4] * y + m[8] * z;
	m[13] = m[13] + m[1] * x + m[5] * y + m[9] * z;
	m[14] = m[14] + m[2] * x + m[6] * y + m[10] * z;
	m[15] = m[15] + m[3] * x + m[7] * y + m[11] * z;
	
	return this;
};


/**
*	Scale the current reference frame by the three
*	scale factors. Equivalent to the mult from the right by a setScale matrix
*	@param {number} x X scale
*	@param {number} y Y scale
*	@param {number} z Z scale
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.scaleRef = function(x, y, z) {
	
	var m = this.entries;
	
	m[0 ] = m[0] * x;
	m[1 ] = m[1] * x;
	m[2 ] = m[2] * x;
	m[3 ] = m[3] * x;
	m[4 ] = m[4] * y;
	m[5 ] = m[5] * y;
	m[6 ] = m[6] * y;
	m[7 ] = m[7] * y;
	m[8 ] = m[8] * z;
	m[9 ] = m[9] * z;
	m[10] = m[10] * z;
	m[11] = m[11] * z;
	
	return this;
};


/**
*	Rotate this frame by the angle specified in deg along
*	the vector [x, y, z].
*	@param {number} angle The angle of rotation (deg)
*	@param {number} x The X coordinate of vector of rotation axis
*	@param {number} y The Y coordinate of vector of rotation axis
*	@param {number} z The Z coordinate of vector of rotation axis
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.rotateRef = function(angle, x, y, z) {
	
	var m = this.entries;
	var a1 = this.aux1;
	var a2 = this.aux2;
	
	// save m into a1
	for (var i = 0; i < 16; ++i) {
		a1[i] = m[i];
	}
	
	// set a2 to be the desired rotation
	this.entries = a2;
	this.setRotation(angle, x, y, z);
	this.entries = m;
	
	// apply the rotation. m = a1* a2
	this.multArrays(a1, a2);
	
	return this;
};


/**
*	Invert the current matrix
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.invert = function() {
	
	var m = this.entries;
	var a1 = this.aux1;
	
	// copy the matrix to invert in aux1
	for (var i = 0; i < 16; ++i) {
		a1[i] = m[i];
	}
	
	m[0 ] = (a1[5] * a1[10] * a1[15] - a1[5] * a1[11] * a1[14] - a1[6] * a1[9] * a1[15] + a1[6] * a1[11] * a1[13] + a1[7] * a1[9] * a1[14] - a1[7] * a1[10] * a1[13]);
	m[1 ] = -(a1[1] * a1[10] * a1[15] - a1[1] * a1[11] * a1[14] - a1[2] * a1[9] * a1[15] + a1[2] * a1[11] * a1[13] + a1[3] * a1[9] * a1[14] - a1[3] * a1[10] * a1[13]);
	m[2 ] = (a1[1] * a1[6] * a1[15] - a1[1] * a1[7] * a1[14] - a1[2] * a1[5] * a1[15] + a1[2] * a1[7] * a1[13] + a1[3] * a1[5] * a1[14] - a1[3] * a1[6] * a1[13]);
	m[3 ] = -(a1[1] * a1[6] * a1[11] - a1[1] * a1[7] * a1[10] - a1[2] * a1[5] * a1[11] + a1[2] * a1[7] * a1[9] + a1[3] * a1[5] * a1[10] - a1[3] * a1[6] * a1[9]);
	m[4 ] = -(a1[4] * a1[10] * a1[15] - a1[4] * a1[11] * a1[14] - a1[6] * a1[8] * a1[15] + a1[6] * a1[11] * a1[12] + a1[7] * a1[8] * a1[14] - a1[7] * a1[10] * a1[12]);
	m[5 ] = (a1[0] * a1[10] * a1[15] - a1[0] * a1[11] * a1[14] - a1[2] * a1[8] * a1[15] + a1[2] * a1[11] * a1[12] + a1[3] * a1[8] * a1[14] - a1[3] * a1[10] * a1[12]);
	m[6 ] = -(a1[0] * a1[6] * a1[15] - a1[0] * a1[7] * a1[14] - a1[2] * a1[4] * a1[15] + a1[2] * a1[7] * a1[12] + a1[3] * a1[4] * a1[14] - a1[3] * a1[6] * a1[12]);
	m[7 ] = (a1[0] * a1[6] * a1[11] - a1[0] * a1[7] * a1[10] - a1[2] * a1[4] * a1[11] + a1[2] * a1[7] * a1[8] + a1[3] * a1[4] * a1[10] - a1[3] * a1[6] * a1[8]);
	m[8 ] = (a1[4] * a1[9] * a1[15] - a1[4] * a1[11] * a1[13] - a1[5] * a1[8] * a1[15] + a1[5] * a1[11] * a1[12] + a1[7] * a1[8] * a1[13] - a1[7] * a1[9] * a1[12]);
	m[9 ] = -(a1[0] * a1[9] * a1[15] - a1[0] * a1[11] * a1[13] - a1[1] * a1[8] * a1[15] + a1[1] * a1[11] * a1[12] + a1[3] * a1[8] * a1[13] - a1[3] * a1[9] * a1[12]);
	m[10] = (a1[0] * a1[5] * a1[15] - a1[0] * a1[7] * a1[13] - a1[1] * a1[4] * a1[15] + a1[1] * a1[7] * a1[12] + a1[3] * a1[4] * a1[13] - a1[3] * a1[5] * a1[12]);
	m[11] = -(a1[0] * a1[5] * a1[11] - a1[0] * a1[7] * a1[9] - a1[1] * a1[4] * a1[11] + a1[1] * a1[7] * a1[8] + a1[3] * a1[4] * a1[9] - a1[3] * a1[5] * a1[8]);
	m[12] = -(a1[4] * a1[9] * a1[14] - a1[4] * a1[10] * a1[13] - a1[5] * a1[8] * a1[14] + a1[5] * a1[10] * a1[12] + a1[6] * a1[8] * a1[13] - a1[6] * a1[9] * a1[12]);
	m[13] = (a1[0] * a1[9] * a1[14] - a1[0] * a1[10] * a1[13] - a1[1] * a1[8] * a1[14] + a1[1] * a1[10] * a1[12] + a1[2] * a1[8] * a1[13] - a1[2] * a1[9] * a1[12]);
	m[14] = -(a1[0] * a1[5] * a1[14] - a1[0] * a1[6] * a1[13] - a1[1] * a1[4] * a1[14] + a1[1] * a1[6] * a1[12] + a1[2] * a1[4] * a1[13] - a1[2] * a1[5] * a1[12]);
	m[15] = (a1[0] * a1[5] * a1[10] - a1[0] * a1[6] * a1[9] - a1[1] * a1[4] * a1[10] + a1[1] * a1[6] * a1[8] + a1[2] * a1[4] * a1[9] - a1[2] * a1[5] * a1[8]);
	
	var det = a1[0] * m[0] + a1[1] * m[4] + a1[2] * m[8] + a1[3] * m[12];
	
	if (det === 0) {
		return;
	}
	
	var invDet = 1 / det;
	for (var i = 0; i < 16; ++i) {
		m[i] *= invDet;
	}
	
	return this;
};


/**
*	Adds to this transformation matrix the point transformation that brings the viewing
*	point and direction to the specified one. This matrix is multiplied from the right by
*	the view matrix.
*	The reference frame has the xy-plane horizontaly and z-axis pointing upward
*	@param {number} eyeX The X component of the viewing position
*	@param {number} eyeY The Y component of the viewing position
*	@param {number} eyeZ The Z component of the viewing position
*	@param {number} centreX The X component of the target point
*	@param {number} centreY The Y component of the target point
*	@param {number} centreZ The Z component of the target point
*	@param {number} upX The X component of the up vector
*	@param {number} upY The Y component of the up vector
*	@param {number} upZ The Z component of the up vector
*	@param {boolean} toGlCoord If true then coordinates will be translated to Gl axis convention:
*		Y - up direction, Z - back direction.
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.lookAt = function(eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ, toGlCoord) {
	
	var m = this.entries;
	var a1 = this.aux1;
	var a2 = this.aux2;
	
	// save entries in aux1
	for (var i = 0; i < 16; ++i) {
		a1[i] = m[i];
	}
	
	// set view matrix in aux2
	this.entries = a2;
	this.setLookAt(eyeX, eyeY, eyeZ, centerX, centerY, centerZ, upX, upY, upZ, toGlCoord);
	this.entries = m;
	
	// multiply from the left
	this.multArrays(a2, a1);
	
	return this;
};


/**
*	Applies the orthogonal projection matrix from the coordinates of the planes of
*	the viewing volume. The volume is a parallelepiped. This matrix is a transformation
*	matrix that map the specified box into the WebGL range  x:[-1,1], y:[-1,1], z:[-1,1]
*	Far and near planes are specified by distances of the plane to the viewer along the viewing direction 
*	(opposite of the coordinates).
*	@param {number} left X coordinate of the left plane
*	@param {number} right X coordinate of the right plane
*	@param {number} bottom Y coordinate of the bottom plane
*	@param {number} top Y coordinate of the top plane
*	@param {number} near The distance of the near plane. Negative values are behind the viewer
*	@param {number} far The distance of the far plane. Negative values are behind the viewer
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.orthProj = function(left, right, bottom, top, near, far) {
	
	var m = this.entries;
	var a1 = this.aux1;
	var a2 = this.aux2;
	
	// save entries in aux1
	for (var i = 0; i < 16; ++i) {
		a1[i] = m[i];
	}
	
	// set projection in aux2
	this.entries = a2;
	this.setOrthProj(left, right, bottom, top, near, far);
	this.entries = m;
	
	// multiply from the left
	this.multArrays(a2, a1);
	
	return this;
};


/**
*	Applies the perspective distortion to the point transformation specified in
*	this matrix. It multiplies setPerspective matrix from the left
*	@param {number} fovy The angle between the upper and lower sides of the frustum.
*	@param {number} aspect The aspect ratio of the frustum (width/height)
*	@param {number} near The distance to the near clipping plane (>0)
*	@param {number} far The distance to the far clipping plane (>0)
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.perspective = function(fovy, aspect, near, far) {
	
	var m = this.entries;
	var a1 = this.aux1;
	var a2 = this.aux2;
	
	// save entries in aux1
	for (var i = 0; i < 16; ++i) {
		a1[i] = m[i];
	}
	
	// set projection in aux2
	this.entries = a2;
	this.setPerspective(fovy, aspect, near, far);
	this.entries = m;
	
	// multiply from the left
	this.multArrays(a2, a1);
	
	return this;
};



// set* methods: these function reinitializes the matrix.
// 		Old values are lost. These methos do not use aux1 or aux2

/**
*	Set method copies the elements of the matrix passed as argument into this
*	@param {Matrix4} mat Matrix to copy
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.set = function(mat) {
	
	var m = this.entries;
	var n = mat.entries;
	
	for (var i = 0; i < 16; ++i) {
		m[i] = n[i];
	}
	
	return this;
};


/**
*	This method initializes the matrix as the identity matrix
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.setI = function() {
	
	var m = this.entries;
	
	m[0]=1;		m[4]=0;		m[8]=0;		m[12]=0;
	m[1]=0;		m[5]=1;		m[9]=0;		m[13]=0;
	m[2]=0;		m[6]=0;		m[10]=1;	m[14]=0;
	m[3]=0;		m[7]=0;		m[11]=0;	m[15]=1;
	
	return this;
};


/**
*	This method initializes the matrix as a pure translation matrix
*	@param {number} x X coordinate of the translation
*	@param {number} y Y coordinate of the translation
*	@param {number} z Z coordinate of the translation
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.setTransl = function(x, y, z) {
	
	var m = this.entries;
	
	m[0]=1;		m[4]=0;		m[8]=0;		m[12]=x;
	m[1]=0;		m[5]=1;		m[9]=0;		m[13]=y;
	m[2]=0;		m[6]=0;		m[10]=1;	m[14]=z;
	m[3]=0;		m[7]=0;		m[11]=0;	m[15]=1;
	
	return this;
};


/**
*	This method initializes the matrix as a diagonal matrix with 
*	[x, y, z, 1] on the diagonal.
*	@param {number} x X scale
*	@param {number} y Y scale
*	@param {number} z Z scale
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.setScale = function(x, y, z) {
	
	var m = this.entries;
	
	m[0]=x;		m[4]=0;		m[8]=0;		m[12]=0;
	m[1]=0;		m[5]=y;		m[9]=0;		m[13]=0;
	m[2]=0;		m[6]=0;		m[10]=z;	m[14]=0;
	m[3]=0;		m[7]=0;		m[11]=0;	m[15]=1;
	
	return this;
};


/**
 * Set the matrix for rotation.
 * The vector of rotation axis may not be normalized.
 * Function taken from the book library.
 * @param {number} angle The angle of rotation (degrees)
 * @param {number} x The X coordinate of vector of rotation axis.
 * @param {number} y The Y coordinate of vector of rotation axis.
 * @param {number} z The Z coordinate of vector of rotation axis.
 * @param {boolean} rad If true, angle will be assumed in radians.
 *	@return {Matrix4} This matrix
 */
Matrix4.prototype.setRotation = function(angle, x, y, z, rad) {
  var e, s, c, len, rlen, nc, xy, yz, zx, xs, ys, zs;

  if (!rad) {
	angle = Math.PI * angle / 180;
  }
  e = this.entries;

  s = Math.sin(angle);
  c = Math.cos(angle);

  if (0 !== x && 0 === y && 0 === z) {
    // Rotation around X axis
    if (x < 0) {
      s = -s;
    }
    e[0] = 1;  e[4] = 0;  e[ 8] = 0;  e[12] = 0;
    e[1] = 0;  e[5] = c;  e[ 9] =-s;  e[13] = 0;
    e[2] = 0;  e[6] = s;  e[10] = c;  e[14] = 0;
    e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
  } else if (0 === x && 0 !== y && 0 === z) {
    // Rotation around Y axis
    if (y < 0) {
      s = -s;
    }
    e[0] = c;  e[4] = 0;  e[ 8] = s;  e[12] = 0;
    e[1] = 0;  e[5] = 1;  e[ 9] = 0;  e[13] = 0;
    e[2] =-s;  e[6] = 0;  e[10] = c;  e[14] = 0;
    e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
  } else if (0 === x && 0 === y && 0 !== z) {
    // Rotation around Z axis
    if (z < 0) {
      s = -s;
    }
    e[0] = c;  e[4] =-s;  e[ 8] = 0;  e[12] = 0;
    e[1] = s;  e[5] = c;  e[ 9] = 0;  e[13] = 0;
    e[2] = 0;  e[6] = 0;  e[10] = 1;  e[14] = 0;
    e[3] = 0;  e[7] = 0;  e[11] = 0;  e[15] = 1;
  } else {
    // Rotation around another axis
    len = Math.sqrt(x*x + y*y + z*z);
    if (len !== 1) {
      rlen = 1 / len;
      x *= rlen;
      y *= rlen;
      z *= rlen;
    }
    nc = 1 - c;
    xy = x * y;
    yz = y * z;
    zx = z * x;
    xs = x * s;
    ys = y * s;
    zs = z * s;

    e[ 0] = x*x*nc +  c;
    e[ 1] = xy *nc + zs;
    e[ 2] = zx *nc - ys;
    e[ 3] = 0;

    e[ 4] = xy *nc - zs;
    e[ 5] = y*y*nc +  c;
    e[ 6] = yz *nc + xs;
    e[ 7] = 0;

    e[ 8] = zx *nc + ys;
    e[ 9] = yz *nc - xs;
    e[10] = z*z*nc +  c;
    e[11] = 0;

    e[12] = 0;
    e[13] = 0;
    e[14] = 0;
    e[15] = 1;
  }

  return this;
};


/**
*	Set the current matrix as the inverse of the matrix passed as argument
*	@param {Matrix4} mat The matrix to invert
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.setInverseOf = function(mat) {
	
	var m = this.entries;
	var n = mat.entries;
	
	if (m === n) {
		throw "Cannot invert this matrix: use invert() instead";
	}
	
	m[0 ] = (n[5] * n[10] * n[15] - n[5] * n[11] * n[14] - n[6] * n[9] * n[15] + n[6] * n[11] * n[13] + n[7] * n[9] * n[14] - n[7] * n[10] * n[13]);
	m[1 ] = -(n[1] * n[10] * n[15] - n[1] * n[11] * n[14] - n[2] * n[9] * n[15] + n[2] * n[11] * n[13] + n[3] * n[9] * n[14] - n[3] * n[10] * n[13]);
	m[2 ] = (n[1] * n[6] * n[15] - n[1] * n[7] * n[14] - n[2] * n[5] * n[15] + n[2] * n[7] * n[13] + n[3] * n[5] * n[14] - n[3] * n[6] * n[13]);
	m[3 ] = -(n[1] * n[6] * n[11] - n[1] * n[7] * n[10] - n[2] * n[5] * n[11] + n[2] * n[7] * n[9] + n[3] * n[5] * n[10] - n[3] * n[6] * n[9]);
	m[4 ] = -(n[4] * n[10] * n[15] - n[4] * n[11] * n[14] - n[6] * n[8] * n[15] + n[6] * n[11] * n[12] + n[7] * n[8] * n[14] - n[7] * n[10] * n[12]);
	m[5 ] = (n[0] * n[10] * n[15] - n[0] * n[11] * n[14] - n[2] * n[8] * n[15] + n[2] * n[11] * n[12] + n[3] * n[8] * n[14] - n[3] * n[10] * n[12]);
	m[6 ] = -(n[0] * n[6] * n[15] - n[0] * n[7] * n[14] - n[2] * n[4] * n[15] + n[2] * n[7] * n[12] + n[3] * n[4] * n[14] - n[3] * n[6] * n[12]);
	m[7 ] = (n[0] * n[6] * n[11] - n[0] * n[7] * n[10] - n[2] * n[4] * n[11] + n[2] * n[7] * n[8] + n[3] * n[4] * n[10] - n[3] * n[6] * n[8]);
	m[8 ] = (n[4] * n[9] * n[15] - n[4] * n[11] * n[13] - n[5] * n[8] * n[15] + n[5] * n[11] * n[12] + n[7] * n[8] * n[13] - n[7] * n[9] * n[12]);
	m[9 ] = -(n[0] * n[9] * n[15] - n[0] * n[11] * n[13] - n[1] * n[8] * n[15] + n[1] * n[11] * n[12] + n[3] * n[8] * n[13] - n[3] * n[9] * n[12]);
	m[10] = (n[0] * n[5] * n[15] - n[0] * n[7] * n[13] - n[1] * n[4] * n[15] + n[1] * n[7] * n[12] + n[3] * n[4] * n[13] - n[3] * n[5] * n[12]);
	m[11] = -(n[0] * n[5] * n[11] - n[0] * n[7] * n[9] - n[1] * n[4] * n[11] + n[1] * n[7] * n[8] + n[3] * n[4] * n[9] - n[3] * n[5] * n[8]);
	m[12] = -(n[4] * n[9] * n[14] - n[4] * n[10] * n[13] - n[5] * n[8] * n[14] + n[5] * n[10] * n[12] + n[6] * n[8] * n[13] - n[6] * n[9] * n[12]);
	m[13] = (n[0] * n[9] * n[14] - n[0] * n[10] * n[13] - n[1] * n[8] * n[14] + n[1] * n[10] * n[12] + n[2] * n[8] * n[13] - n[2] * n[9] * n[12]);
	m[14] = -(n[0] * n[5] * n[14] - n[0] * n[6] * n[13] - n[1] * n[4] * n[14] + n[1] * n[6] * n[12] + n[2] * n[4] * n[13] - n[2] * n[5] * n[12]);
	m[15] = (n[0] * n[5] * n[10] - n[0] * n[6] * n[9] - n[1] * n[4] * n[10] + n[1] * n[6] * n[8] + n[2] * n[4] * n[9] - n[2] * n[5] * n[8]);
	
	var det = n[0] * m[0] + n[1] * m[4] + n[2] * m[8] + n[3] * m[12];
	
	if (det === 0) {
		throw "Matrix is singular.";
	}
	
	var invDet = 1 / det;
	for (var i = 0; i < 16; ++i) {
		m[i] *= invDet;
	}
	
	return this;
};


/**
*	Set as a viewing matrix.
*	The reference frame has the xy-plane horizontaly and z-axis pointing upward
*	NOTE: this is not a frame transformation matrix, this is a point transformation matrix.
*	@param {number} eyeX The X component of the viewing position
*	@param {number} eyeY The Y component of the viewing position
*	@param {number} eyeZ The Z component of the viewing position
*	@param {number} centreX The X component of the target point
*	@param {number} centreY The Y component of the target point
*	@param {number} centreZ The Z component of the target point
*	@param {number} upX The X component of the up vector
*	@param {number} upY The Y component of the up vector
*	@param {number} upZ The Z component of the up vector
*	@param {boolean} toGlCoord If true then coordinates will be translated to Gl axis convention:
*		Y - up direction, Z - back direction.
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.setLookAt = function(eyeX, eyeY, eyeZ, centreX, centreY, centreZ, upX, upY, upZ, toGlCoord) {
	
	var m = this.entries;
	
	// map coordinates to WebGL axis convention if necessary
	if (toGlCoord) {
		var aux = eyeY;
		eyeY = eyeZ;
		eyeZ = -aux;
		aux = centreY;
		centreY = centreZ;
		centreZ = -aux;
		aux = upY;
		upY = upZ;
		upZ = -aux;
	}
	
	// z: opposite of the viewing direction
	var zx = eyeX - centreX;
	var zy = eyeY - centreY;
	var zz = eyeZ - centreZ;
	
	// normalization of z
	var rescale = 1 / Math.sqrt(zx*zx + zy*zy + zz*zz);
	zx *= rescale;
	zy *= rescale;
	zz *= rescale;
	
	// x = cross(up, z)
	var xx = upY * zz - upZ * zy;
	var xy = upZ * zx - upX * zz;
	var xz = upX * zy - upY * zx;
	
	// normalization of x
	var rescale = 1 / Math.sqrt(xx*xx + xy*xy + xz*xz);
	xx *= rescale;
	xy *= rescale;
	xz *= rescale;
	
	// y = cross(z, x)
	var yx = xz * zy - xy * zz;
	var yy = xx * zz - xz * zx;
	var yz = xy * zx - xx * zy;
	
	// normalization of y
	var rescale = 1 / Math.sqrt(yx*yx + yy*yy + yz*yz);
	yx *= rescale;
	yy *= rescale;
	yz *= rescale;
	
	
	// composing the inverse transformation: rotate reference
	m[0] = xx;	m[4] = xy;	m[8] = xz; 
	m[1] = yx;	m[5] = yy;	m[9] = yz; 
	m[2] = zx;	m[6] = zy;	m[10] = zz;
	m[3] = 0;	m[7] = 0;	m[11] = 0; 
	
	// composing the inverse transformation: translate reference
	m[12] = - (m[0] * eyeX + m[4] * eyeY + m[8]  * eyeZ);
	m[13] = - (m[1] * eyeX + m[5] * eyeY + m[9]  * eyeZ);
	m[14] = - (m[2] * eyeX + m[6] * eyeY + m[10] * eyeZ);
	m[15] = 1;
	
	return this;
};


/**
*	Build the orthogonal view projection matrix from the coordinates of the planes of
*	the viewing volume. The volume is a parallelepiped. This matrix is a transformation
*	matrix that map the specified box into the WebGL range  x:[-1,1], y:[-1,1], z:[-1,1]
*	Far and near planes are specified by distances of the plane to the viewer along the viewing direction 
*	(opposite of the coordinates).
*	@param {number} left X coordinate of the left plane
*	@param {number} right X coordinate of the right plane
*	@param {number} bottom Y coordinate of the bottom plane
*	@param {number} top Y coordinate of the top plane
*	@param {number} near The distance of the near plane. Negative values are behind the viewer
*	@param {number} far The distance of the far plane. Negative values are behind the viewer
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.setOrthProj = function(left, right, bottom, top, near, far) {
	
	var m = this.entries;
	
	if (left === right || bottom === top || near === far) {
		throw "Empty viewing volume";
	}
	
	// translate the camera to the centre of the viewing volume then
	// scale the space. The z axix is inverted because near far are chosen
	// as distances. Explicit matrix result:
	
	m[0 ] = 2 / (right - left);
	m[1 ] = 0;
	m[2 ] = 0;
	m[3 ] = 0;
	
	m[4 ] = 0;
	m[5 ] = 2 / (top - bottom);
	m[6 ] = 0;
	m[7 ] = 0;
	
	m[8 ] = 0;
	m[9 ] = 0;
	m[10] = -2 / (far - near);
	m[11] = 0;
	
	m[12] = (left + right) / (left - right);
	m[13] = (bottom + top) / (bottom - top);
	m[14] = -(far + near) / (far - near);
	m[15] = 1;
	
	return this;
};


/**
*	Creates the perspective projection matrix that maps points inside the specified
*	frustum into the WebGL viewing volume
*	@param {number} fovy The angle between the upper and lower sides of the frustum.
*	@param {number} aspect The aspect ratio of the frustum (width/height)
*	@param {number} near The distance to the near clipping plane (>0)
*	@param {number} far The distance to the far clipping plane (>0)
*	@return {Matrix4} This matrix
*/
Matrix4.prototype.setPerspective = function(fovy, aspect, near, far) {
	
	var m = this.entries;
	
	// error checks on arguments
	if (near === far || aspect === 0) {
		throw "null frustum";
	}
	if (near <= 0) {
		throw "near <= 0";
	}
	if (far <= 0) {
		throw "far <= 0";
	}
	
	fovy = fovy * Math.PI / 360;
	var s = Math.sin(fovy);
	if (s === 0) {
		throw "null frustum";
	}
	
	
	var rd = 1 / (far - near);
	var cot = Math.cos(fovy) / s;
	
	m[0]  = cot / aspect;
	m[1]  = 0;
	m[2]  = 0;
	m[3]  = 0;
	
	m[4]  = 0;
	m[5]  = cot;
	m[6]  = 0;
	m[7]  = 0;
	
	m[8]  = 0;
	m[9]  = 0;
	m[10] = -(far + near) * rd;
	m[11] = -1;
	
	m[12] = 0;
	m[13] = 0;
	m[14] = -2 * near * far * rd;
	m[15] = 0;
	
	return this;
};

// --------- End of Matrix4 ----------- //



/**
*	Vector4 object constructor:
*	The vector is initialized as [0, 0, 0, 1]. If a srcVec is specified then
*	the new will be a new copy.
*	New vector should never be created in fast cycles.
*	@param {Array|Vector4|Vector3} srcVec The elements to be copied (optional)
*	@constructor
*	@classdesc
*	This class is useful for homogeneous representation of points or directions in 3D space.
*	A fourth element = 1 will represent a point and = 0 will be a direction.
*/
var Vector4 = function(srcVec) {
	
	this.entries = new Float32Array([0, 0, 0, 1]);
	
	if (srcVec) {
		if (srcVec instanceof Vector4) {
			var e = this.entries;
			var s = srcVec.entries;
			e[0] = s[0];
			e[1] = s[1];
			e[2] = s[2];
			e[3] = s[3];
			
		} else if (srcVec instanceof Vector3) {
			var e = this.entries;
			var s = srcVec.entries;
			e[0] = s[0];
			e[1] = s[1];
			e[2] = s[2];
			e[3] = 0;
			
		} else if (Object.prototype.toString.call(srcVec) === "[object Array]") {
			var e = this.entries;
			e[0] = srcVec[0];
			e[1] = srcVec[1];
			e[2] = srcVec[2];
			e[3] = srcVec[3];
		}
	}
};


/**
*	toString. Useful for debugging
*	@param {number} decimals Optional parameter of the number
*		of decimal digits to show
*	@return {string} The string row representation of the vector
*/
Vector4.prototype.toString = function(decimals) {
	
	var e = this.entries;
	
	if (decimals) {
		return ("[ " + e[0].toFixed(decimals) + ", " + e[1].toFixed(decimals) + ", " + e[2].toFixed(decimals) + ", " + e[3].toFixed(decimals) + " ]");
	} else {
		return ("[ " + e[0] + ", " + e[1] + ", " + e[2] + ", " + e[3] + " ]");
	}
};


/**
*	Reset the vector to [0, 0, 0, 1]
*	@return {Vector4} This vector
*/
Vector4.prototype.set0 = function() {
	
	var e = this.entries;
	
	e[0] = 0;
	e[1] = 0;
	e[2] = 0;
	e[3] = 1;
	
	return this;
};


/**
*	Set the current vector with the numbers passed as argument
*	@param {number} x X
*	@param {number} y Y
*	@param {number} z Z
*	@param {number} w W
*	@return {Vector4} This vector
*/
Vector4.prototype.set = function(x, y, z, w) {
	
	var e = this.entries;
	
	e[0] = x;
	e[1] = y;
	e[2] = z;
	e[3] = w;
	
	return this;
};


/**
*	Set the current vector as a copy of the argument
*	@param {Vector4} srcVec The source 4 vector
*	@return {Vector4} This vector
*/
Vector4.prototype.set4 = function(srcVec) {
	
	var e = this.entries;
	var s = srcVec.entries;
	
	e[0] = s[0];
	e[1] = s[1];
	e[2] = s[2];
	e[3] = s[3];
	
	return this;
};


/**
*	Set the current vector as a copy of the argument.
*	The w parameter should be 1 for vectors and 0 for directions.
*	@param {Vector3} srcVec The source 4 vector
*	@return {Vector4} This vector
*/
Vector4.prototype.set3 = function(srcVec, w) {
	
	if (arguments.length < 2) {
		throw "Fourth component not specified";
	}
	
	var e = this.entries;
	var s = srcVec.entries;
	
	e[0] = s[0];
	e[1] = s[1];
	e[2] = s[2];
	e[3] = w;
	
	return this;
};


/**
*	If the represented point in this vector is not at infinity, it scales this
*	vector so to have inhomogeneous coordinates [x, y, z, 1].
*	@return {Vector4} This vector
*/
Vector4.prototype.toInhom = function() {
	
	var e = this.entries;
	
	if (e[3] !== 0) {
		e[0] /= e[3];
		e[1] /= e[3];
		e[2] /= e[3];
		e[3] = 1;
	}
	
	return this;
};


/**
*	Multiply the matrix m to this vector from the left and
*	store the result in this vector
*	@param {Matrix4} mat The matrix to multiply
*	@return {Vector4} This vector
*/
Vector4.prototype.multL = function(mat) {
	
	var e = this.entries;
	var m = mat.entries;
	
	var e0 = e[0], e1 = e[1], e2 = e[2], e3 = e[3];
	
	e[0] = m[0] * e0 + m[4] * e1 + m[8] * e2 + m[12] * e3;
	e[1] = m[1] * e0 + m[5] * e1 + m[9] * e2 + m[13] * e3;
	e[2] = m[2] * e0 + m[6] * e1 + m[10] * e2 + m[14] * e3;
	e[3] = m[3] * e0 + m[7] * e1 + m[11] * e2 + m[15] * e3;
	
	return this;
};


/**
*	Scalar product between vectors. No side effect in this object
*	@param {Vector4} v2 The second vector of the operation
*	@return {number} The scalar result
*/
Vector4.prototype.scalar = function(v2) {
	
	var e1 = this.entries;
	var e2 = v2.entries;
	
	return ( e1[0] * e2[0] + e1[1] * e2[1] + e1[2] * e2[2] + e1[3] * e2[3] );
};


/**
*	Normalizes this vector
*	@return {Vector4} This vector
*/
Vector4.prototype.normalize = function() {
	
	var e = this.entries;
	
	var n = e[0]*e[0] + e[1]*e[1] + e[2]*e[2] + e[3]*e[3];
	
	if (n !== 0) {
		n = 1 / Math.sqrt(n);
		e[0] *= n;
		e[1] *= n;
		e[2] *= n;
		e[3] *= n;
	}
	
	return this;
};


/**
*	Norm
*	@return {number} The norm
*/
Vector4.prototype.norm = function() {
	return Math.sqrt(this.scalar(this));
};


/**
*	Scale the vector or the point by the constant. Attention: w value is kept the same
*	@param {number} d The scalar
*	@return {Vector4} This vector
*/
Vector4.prototype.scale = function(d) {
	
	var e = this.entries;
	
	e[0] = e[0] * d;
	e[1] = e[1] * d;
	e[2] = e[2] * d;
	e[3] = e[3] * d;
	
	return this;
};


/**
*	Set this vector as v1 + v2
*	@param {Vector4} v1 The first to be summed
*	@param {Vector4} v2 The second to be summed
*	@return {Vector4} This vector
*/
Vector4.prototype.setSum = function(v1, v2) {
	
	var e1 = v1.entries;
	var e2 = v2.entries;
	var r = this.entries;
	
	r[0] = e1[0] + e2[0];
	r[1] = e1[1] + e2[1];
	r[2] = e1[2] + e2[2];
	
	if (e1[3] === e2[3]) r[3] = e1[3];
	else r[3] = 1;
	
	return this;
};


/**
*	Set this vector as v1 - v2
*	@param {Vector4} v1 The first to be summed
*	@param {Vector4} v2 The second to be subtracted
*	@return {Vector4} This vector
*/
Vector4.prototype.setSub = function(v1, v2) {
	
	var e1 = v1.entries;
	var e2 = v2.entries;
	var r = this.entries;
	
	r[0] = e1[0] - e2[0];
	r[1] = e1[1] - e2[1];
	r[2] = e1[2] - e2[2];
	r[3] = e1[3] - e2[3];
	
	return this;
};


/**
*	Distance of the two points passed as argument.
*	No side-effect to this object
*	@param {Vector4} v2 The second point
*	@return {number} The distance
*/
Vector4.prototype.distance = function(v2) {
	
	var e1 = this.entries;
	var e2 = v2.entries;
	
	var d0 = e1[0] - e2[0];
	var d1 = e1[1] - e2[1];
	var d2 = e1[2] - e2[2];
	var d3 = e1[3] - e2[3];
	
	if (d3 !== 0) {
		throw "The two vector are not inhomogeneous representation for points";
	}
	
	return (Math.sqrt(d0*d0 + d1*d1 + d2*d2 + d3*d3));
};


/**
*	Trasform this vector according to gl convention of reference frame.
*	z -> y, y -> -z
*	@return {Vector4} This vector
*/
Vector4.prototype.toGlCoord = function() {
	
	var a = this.entries[1];
	this.entries[1] = this.entries[2];
	this.entries[2] = -a;
	
	return this;
};


// --------- End of Vector4 ----------- //



/**
*	Vector3 object constructor:
*	The vector is initialized as [0, 0, 0]. If a srcVec is specified then
*	the new will be a new copy.
*	New vector should never be created in fast cycles.
*	@param {Array|Vector3|Vector4} srcVec The elements to be copied (optional)
*	@constructor
*	@classdesc
*	This class is useful for representing vectors in inhomogeneous representation.
*/
var Vector3 = function(srcVec) {
	
	this.entries = new Float32Array([0, 0, 0]);
	
	if (srcVec) {
		if (srcVec instanceof Vector3) {
			var e = this.entries;
			var s = srcVec.entries;
			e[0] = s[0];
			e[1] = s[1];
			e[2] = s[2];
			
		} else if (srcVec instanceof Vector4) {
			var e = this.entries;
			var s = srcVec.entries;
			if (s[3] !== 0 && s[3] !==1) {
				console.log(srcVec);
				throw "srcVec is not a inhomogeneous point nor a direction";
			}
			e[0] = s[0];
			e[1] = s[1];
			e[2] = s[2];
			
		} else if (Object.prototype.toString.call(srcVec) === "[object Array]") {
			var e = this.entries;
			e[0] = srcVec[0];
			e[1] = srcVec[1];
			e[2] = srcVec[2];
		}
	}
};


/**
*	toString. Useful for debugging
*	@param {number} decimals Optional parameter of the number
*		of decimal digits to show
*	@return {string} The string row representation of the vector
*/
Vector3.prototype.toString = function(decimals) {
	
	var e = this.entries;
	
	if (decimals) {
		return ("[ " + e[0].toFixed(decimals) + ", " + e[1].toFixed(decimals) + ", " + e[2].toFixed(decimals) + " ]");
	} else {
		return ("[ " + e[0] + ", " + e[1] + ", " + e[2] + " ]");
	}
};


/**
*	Reset the vector to [0, 0, 0]
*	@return {Vector3} This vector
*/
Vector3.prototype.set0 = function() {
	
	var e = this.entries;
	
	e[0] = 0;
	e[1] = 0;
	e[2] = 0;
	
	return this;
};


/**
*	Set the current vector with the numbers passed as argument
*	@param {number} x X
*	@param {number} y Y
*	@param {number} z Z
*	@return {Vector3} This vector
*/
Vector3.prototype.set = function(x, y, z) {
	
	var e = this.entries;
	
	e[0] = x;
	e[1] = y;
	e[2] = z;
	
	return this;
};


/**
*	Set the current vector as a copy of the argument
*	@param {Vector3} srcVec The vector to copy
*	@return {Vector3} This vector
*/
Vector3.prototype.set3 = function(srcVec) {
	
	var e = this.entries;
	var s = srcVec.entries;
	
	e[0] = s[0];
	e[1] = s[1];
	e[2] = s[2];
	
	return this;
};


/**
*	Set the current vector as a copy of the argument if srcVec represent
*	a inhomogeneous representation of a point or a direction
*	@param {Vector4} srcVec The vector to copy
*	@return {Vector3} This vector
*/
Vector3.prototype.set4 = function(srcVec) {
	
	var e = this.entries;
	var s = srcVec.entries;
	
	if (s[3] !== 0 && s[3] !==1) {
		console.log(srcVec);
		throw "srcVec is not a inhomogeneous point nor a direction";
	}
	
	e[0] = s[0];
	e[1] = s[1];
	e[2] = s[2];

	return this;
};


/**
*	Scalar product between vectors. No side effect in this object
*	@param {Vector3} v2 The second vector of the operation
*	@return {number} The scalar result
*/
Vector3.prototype.scalar = function(v2) {
	
	var e1 = this.entries;
	var e2 = v2.entries;
	
	return ( e1[0] * e2[0] + e1[1] * e2[1] + e1[2] * e2[2] );
};


/**
*	Normalizes this vector
*	@return {Vector3} This vector
*/
Vector3.prototype.normalize = function() {
	
	var e = this.entries;
	
	var n = e[0]*e[0] + e[1]*e[1] + e[2]*e[2];
	
	if (n !== 0) {
		n = 1 / Math.sqrt(n);
		e[0] *= n;
		e[1] *= n;
		e[2] *= n;
	}
	
	return this;
};


/**
*	Norm
*	@return {number} The norm
*/
Vector3.prototype.norm = function() {
	return Math.sqrt(this.scalar(this));
};


/**
*	Multiplication by a scalar
*	@param {number} d The scalar
*	@return {Vector3} This vector
*/
Vector3.prototype.scale = function(d) {
	
	var e = this.entries;
	
	e[0] = e[0] * d;
	e[1] = e[1] * d;
	e[2] = e[2] * d;
	
	return this;
};


/**
*	Set this vector as v1 + v2
*	@param {Vector3} v1 The first to be summed
*	@param {Vector3} v2 The second to be summed
*	@return {Vector3} This vector
*/
Vector3.prototype.setSum = function(v1, v2) {
	
	var e1 = v1.entries;
	var e2 = v2.entries;
	var r = this.entries;
	
	r[0] = e1[0] + e2[0];
	r[1] = e1[1] + e2[1];
	r[2] = e1[2] + e2[2];
	
	return this;
};


/**
*	Set this vector as v1 - v2
*	@param {Vector3} v1 The first to be summed
*	@param {Vector3} v2 The second to be subtracted
*	@return {Vector3} This vector
*/
Vector3.prototype.setSub = function(v1, v2) {
	
	var e1 = v1.entries;
	var e2 = v2.entries;
	var r = this.entries;
	
	r[0] = e1[0] - e2[0];
	r[1] = e1[1] - e2[1];
	r[2] = e1[2] - e2[2];
	
	return this;
};


/**
*	Trasform this vector according to gl convention of reference frame.
*	z -> y, y -> -z
*	@return {Vector3} This vector
*/
Vector3.prototype.toGlCoord = function() {
	
	var a = this.entries[1];
	this.entries[1] = this.entries[2];
	this.entries[2] = -a;
	
	return this;
};


// --------- End of Vector3 ----------- //


