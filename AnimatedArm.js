// Roberto C.

"use strict";

// DOM page element and context
var canv3D;
var canv2D;
var gl;
var c2d;

function main() {
	
	canv3D = document.getElementById("canv3D");
	canv2D = document.getElementById("canv2D");
	if (!canv3D || !canv2D) {
		throw "Failed to get needed HTML elements.";
	}
	
	// page setup
	canv3D.width = window.innerWidth;
	canv3D.height = window.innerHeight;
	canv2D.width =  window.innerWidth;
	canv2D.height = window.innerHeight;
	
	// create 2D context
	c2d = canv2D.getContext("2d");
	
	// create gl context
	gl = WebGLUtils.setupWebGL(canv3D, {antialias:true});
	if (!gl) {
		throw "Failed to get the rendering context for WebGL";
	}
	
	// needed extension for large models
	var ext = gl.getExtension("OES_element_index_uint");
	if (!ext) {
		console.error("Extension 'OES_element_index_uint' not supported");
	}
	
	if (!gl.getContextAttributes().antialias) {
		console.error("No antialiasing");
	}
	
	// black screen
	gl.clearColor(0.0, 0.0, 0.0, 1.0);
	gl.clear(gl.COLOR_BUFFER_BIT);
	
	gui.load();
	drawing.load();
}


var drawing = function() {

	// shapes
	var shapesData = {};
	var pathsData = {};		// paths the arm will follow; centres in the origin
	var linkColor = new Vector3([1, 3/5, 1/5]);
	var jointColor = new Vector3([0.5, 0.5, 0.5]);
	
	// fixed transformation matrices
	var linkModel = new Matrix4();
	var jointModel = new Matrix4();
	var baseModel = new Matrix4();
	var tipModel = new Matrix4();
	var plane1Model = new Matrix4();
	var plane2Model = new Matrix4();
	var plane3Model = new Matrix4();
	var plane4Model = new Matrix4();
	
	// arm parameters
	var linkLen = 1.3;
	var qTraj;			// joint space trajectory over time for each path
	
	// DH homogeneous matrices
	var Tw0 = new Matrix4();
	var Tm = new Matrix4();
	var dh;
	
	// view parameters
	// var viewLookAt = new Vector4([0, 0, 4, 1]);
	var viewLookAt = new Vector4([-4, 0, 4, 1]);
	var viewDist = 10;
	var viewAngleZ = -60;
	var viewAngleY = 45;

	var camera = {
		aspectRatio: 1,
		fovy: 70,
		near: 1,
		far: 50
	};
	
	// light
	var lightPointPos = new Vector3([-2, -1, 9]);
	
	// animation variables
	var animationOn = false;
	var startAnimTime = Date.now();
	var startAnimPos = 0;
	var lastAnimPos = 0;
	var animVelocity = 0;
	var animationFunction = animationPath;	// valid values: animationPath, animationFreePath
	var animationRequest;
	var qTransStart = [0,0,0,0,0,0];
	var qTransEnd = [0,0,0,0,0,0];
	const TRASITION_TIME = 1500;
	
	// auxiliary variables
	var surfColor = new Vector3();
	var viewPos = new Vector4();
	var viewMat = new Matrix4();
	var modelMat = new Matrix4();
	var updatedView = false;
	
	var clickPos = new Vector4();
	var plane4Point = new Vector4();
	var cameraRay = new Vector4();
	var plane4Norm = new Vector4();
	var clickToSpace = new Matrix4();
	
	var auxM = new Matrix4();
	var auxV = new Vector4();
	
	var q = [0,0,0,0,0,0];				// generalized coordinates
	var currentTraj;
	
	// interaction variables: view zoom, rotation
	var firstX, firstY;
	var firstAngleZ, firstAngleY;
	var firstDist, firstFingersDist;
	var dAngleY, dAngleZ;
	var canvDiag;
	
	var pointerPos = new Vector4();

	// buffers
	var cylBuffs = {};
	var planeBuffs = {};
	var pyramidBuffs = {};
	var cubeBuffs = {};
	var pathsBuffs = {};
	
	// u_Mode constants
	var SURF_MODE = 1;
	var LINE_MODE = 2;
	
	// uniform locations
	var u_ViewMat = null;
	var u_ModelMat = null;
	var u_ModelNMat = null;
	var u_SurfColor = null;
	var u_LightPointPos = null;
	var u_ViewPos = null;
	var u_Mode = null;
	
	// vertex shader
	var vertShSrc = (
		"#define SURF_MODE 1 \n" +
		"#define LINE_MODE 2 \n" +
		" \n" +
		"attribute vec4 a_Position; \n" +
		"attribute vec4 a_Normal; \n" +
		" \n" +
		"uniform mat4 u_ViewMat; \n" +
		"uniform mat4 u_ModelMat; \n" +
		"uniform mat4 u_ModelNMat; \n" +
		"uniform lowp int u_Mode; \n" +
		" \n" +
		"varying vec3 v_Position; \n" +
		"varying vec3 v_Normal; \n" +
		" \n" +
		"void main() { \n" +
		"	if (u_Mode == SURF_MODE) { \n" +
		"		 \n" +
		"		vec4 position = u_ModelMat * a_Position; \n" +
		"		gl_Position = u_ViewMat * position; \n" +
		"		 \n" +
		"		vec4 normal = u_ModelNMat * a_Normal; \n" +
		"		v_Position = position.xyz; \n" +
		"		v_Normal = normal.xyz; \n" +
		"		 \n" +
		"	} else if (u_Mode == LINE_MODE) { \n" +
		"		 \n" +
		"		gl_Position = u_ViewMat * u_ModelMat * a_Position; \n" +
		"		 \n" +
		"	} \n" +
		"}"
	);
	
	// fragment shader
	var fragShSrc = (
		"#define SURF_MODE 1 \n" +
		"#define LINE_MODE 2 \n" +
		" \n" +
		"#ifdef GL_ES \n" +
		"precision mediump float; \n" +
		"#endif \n" +
		" \n" +
		"uniform vec3 u_LightPointPos; \n" +
		"uniform vec4 u_ViewPos; \n" +
		"uniform vec3 u_SurfColor; \n" +
		"uniform lowp int u_Mode; \n" +
		" \n" +
		"varying vec3 v_Position; \n" +
		"varying vec3 v_Normal; \n" +
		" \n" +
		"void main() { \n" +
		"	if (u_Mode == SURF_MODE) { \n" +
		"		 \n" +
		"		vec3 normal = normalize(v_Normal); \n" +
		"		vec3 pointLightVec = u_LightPointPos - v_Position; \n" +
		"		float distFactor = 1.0 / length(pointLightVec); \n" +
		"		pointLightVec = pointLightVec * distFactor; \n" +
		"		 \n" +
		"		// diffuse \n" +
		"		float diffuseCoeff = max( dot(pointLightVec, normal), 0.0); \n" +
		"		diffuseCoeff = diffuseCoeff * distFactor * 6.0; \n" +
		"		 \n" +
		"		// specular \n" +
		"		float specularCoeff = 0.0; \n" +
		"		if (diffuseCoeff > 0.0) { \n" +
		"			vec3 pointCamVec = normalize(u_ViewPos.xyz - v_Position); \n" +
		"			vec3 halfVec = normalize(pointLightVec + pointCamVec); \n" +
		"			specularCoeff = max( dot(halfVec, normal), 0.0); \n" +
		"			specularCoeff = pow(specularCoeff, 70.0); \n" +
		"		} \n" +
		" \n" +
		"		gl_FragColor = vec4((diffuseCoeff + 0.05) * u_SurfColor + specularCoeff * vec3(0.4), 1.0); \n" +
		"		 \n" +
		"	} else if (u_Mode == LINE_MODE) { \n" +
		"		 \n" +
		"		gl_FragColor = vec4(u_SurfColor, 1.0); \n" +
		"		 \n" +
		"	} \n" +
		"}"
	);
	
	
	function load() {
		
		// set parts dimensions
		linkModel.setTransl(0, 0, 1).scale(0.1, 0.1, 0.5*linkLen);
		jointModel.scale(0.2, 0.2, 0.15);
		baseModel.setTransl(0, 0, 1).scale(0.5, 0.5, 0.1);
		tipModel.setScale(0.1, 0.1, linkLen).translate(0, 0, -linkLen);
		plane1Model.setScale(2, 2, 1).rotate(90, 1, 0, 0).translate(0, 4, 4);
		plane2Model.setScale(2, 2, 1).rotate(-90, 0, 1, 0).translate(4, 0, 4);
		plane3Model.setScale(2, 2, 1).rotate(-90, 1, 0, 0).translate(0, -4, 4);
		plane4Model.setScale(2, 2, 1).rotate(90, 0, 1, 0).translate(-4, 0, 4);
		
		plane4Point.set0().multL(plane4Model);
		plane4Norm.set(1,0,0,0);
		
		// robot dh parameters
		dh = new RobTools.DH();
		dh.set(1, 		0,	Math.PI/2, 			0,	null);
		dh.set(2, linkLen,		 	0, 			0, 	null);
		dh.set(3, 		0, 	Math.PI/2, 			0, 	null);
		dh.set(4, 		0, -Math.PI/2, 	2*linkLen, 	null);
		dh.set(5, 		0, 	Math.PI/2, 			0, 	null);
		dh.set(6, 		0, 			0,	2*linkLen, 	null);
		
		// load fixed transformation matrices
		Tw0.setTransl(0, 0, 2*linkLen);
		
		
		// import shape objects
		var importJSONShapes = function(json) {
			var shapes = JSON.parse(json);
			
			for (var i in shapes) {
				shapesData[i] = {};
				shapesData[i].vertices = new Float32Array(shapes[i].vertices);
				shapesData[i].normals = new Float32Array(shapes[i].normals);
				shapesData[i].vertCount = shapes[i].vertCount;
				
				if (shapes[i].indices) shapesData[i].indices = new Uint16Array(shapes[i].indices);
			}
			
			// continue
			newXMLHttpRequest("data/paths.json", importJSONPath);
		}
		
		// import paths to draw
		var importJSONPath = function(json) {
			var paths = JSON.parse(json);
			
			for (var i in paths) {
				pathsData[i] = {};
				pathsData[i].modelMat = new Matrix4(paths[i].modelMat);
				pathsData[i].vertices = new Float32Array(paths[i].vertices);
				pathsData[i].vertCount = paths[i].vertCount;
			}
			
			// continue
			newXMLHttpRequest("data/qTraj.json", importJSONTraj);
		};
		
		// import trajectories to follow
		var importJSONTraj = function(json) {
			
			qTraj = JSON.parse(json);
			
			// set current
			setQ(q, qTraj.t1[0]);
			currentTraj = qTraj.t1;
   
			// continue
			load2();
		};
		
		// start function chain
		newXMLHttpRequest("data/shapes.json", importJSONShapes);
	}
	
	function load2() {
		
		// setup gl
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.lineWidth(1);
		gl.frontFace(gl.CCW);
		gl.cullFace(gl.BACK);
		gl.enable(gl.CULL_FACE);
		gl.enable(gl.DEPTH_TEST);
		
		// program: create and use
		WebGLInit.initShaders(gl, vertShSrc, fragShSrc);
		
		// program: uniform locations
		u_ViewMat = gl.getUniformLocation(gl.program, "u_ViewMat");
		u_ModelMat = gl.getUniformLocation(gl.program, "u_ModelMat");
		u_ModelNMat = gl.getUniformLocation(gl.program, "u_ModelNMat");
		u_SurfColor = gl.getUniformLocation(gl.program, "u_SurfColor");
		u_LightPointPos = gl.getUniformLocation(gl.program, "u_LightPointPos");
		u_ViewPos = gl.getUniformLocation(gl.program, "u_ViewPos");
		u_Mode = gl.getUniformLocation(gl.program, "u_Mode");
		if (!u_ViewMat || !u_ModelMat || !u_ModelNMat || !u_LightPointPos || !u_ViewPos || !u_SurfColor || !u_Mode) {
			throw "Failed to get storage location of uniform variables";	
		}
		// program: load fixed uniforms
		gl.uniform3fv(u_LightPointPos, lightPointPos.entries);

		// program: create buffers
		planeBuffs.a_Position = prepareBuffer(gl.ARRAY_BUFFER, "a_Position", shapesData.plane.vertices, 3, gl.FLOAT);
		planeBuffs.a_Normal = prepareBuffer(gl.ARRAY_BUFFER, "a_Normal", shapesData.plane.normals, 3, gl.FLOAT);
		cylBuffs.a_Position = prepareBuffer(gl.ARRAY_BUFFER, "a_Position", shapesData.cylinder.vertices, 3, gl.FLOAT);
		cylBuffs.a_Normal = prepareBuffer(gl.ARRAY_BUFFER, "a_Normal", shapesData.cylinder.normals, 3, gl.FLOAT);
		pyramidBuffs.a_Position = prepareBuffer(gl.ARRAY_BUFFER, "a_Position", shapesData.pyramid.vertices, 3, gl.FLOAT);
		pyramidBuffs.a_Normal = prepareBuffer(gl.ARRAY_BUFFER, "a_Normal", shapesData.pyramid.normals, 3, gl.FLOAT);
		cubeBuffs.a_Position = prepareBuffer(gl.ARRAY_BUFFER, "a_Position", shapesData.cube.vertices, 3, gl.FLOAT);
		cubeBuffs.a_Normal = prepareBuffer(gl.ARRAY_BUFFER, "a_Normal", shapesData.cube.normals, 3, gl.FLOAT);
		for (var i in pathsData) {
			pathsBuffs[i] = {};
			pathsBuffs[i].a_Position = prepareBuffer(gl.ARRAY_BUFFER, "a_Position", pathsData[i].vertices, 3, gl.FLOAT);
		}
		var indices = prepareBuffer(gl.ELEMENT_ARRAY_BUFFER, 0, shapesData.cylinder.indices, null, null, false);

		
		// first draw
		onresize();
		
		// interaction events
		canv2D.addEventListener("mousedown", onmousedown);
		window.addEventListener("mouseup", onmouseup);
		canv2D.addEventListener("touchstart", ontouchstart);
		window.addEventListener("touchend", ontouchend);
		canv2D.addEventListener('DOMMouseScroll', onwheel, false);	// for Firefox
		canv2D.addEventListener('mousewheel', onwheel, false);		// for everyone else

		var resizeTimerID;
		var delayedResize = function() {
			clearTimeout(resizeTimerID);
			resizeTimerID = setTimeout(onresize, 500);
		};
		window.addEventListener("resize", delayedResize);
		
		
		// deb
		var m = new Matrix4().setRotation(-90, 1,0,0).rotate(90, 0,0,1).translate(-4,0,4);
		setQInverseKin(m);
		draw();
		return;
		// deb
		
		
		// animation speed and first path selection
		setVelocity(1);
		gui.pressButton(60);	// path1
	}

	function prepareBuffer(target, attribName, data, elemsPerVert, type, free) {
		
		// create buffer
		var buffer = gl.createBuffer();
		if (!buffer) {
			throw "Failed to create a buffer";
		}
		
		// put data
		gl.bindBuffer(target, buffer);
		gl.bufferData(target, data, gl.STATIC_DRAW);
		
		// attribute location
		var aPos = gl.getAttribLocation(gl.program, attribName);
		if (aPos < 0 && attribName !== 0) {
			throw ("Failed to get storage location of attribute variable: " + attribName);
		}
		
		// save needed information on use
		buffer.elemsPerVert = elemsPerVert;
		buffer.type = type;
		buffer.attribPos = aPos;
		
		if (free) {
			gl.bindBuffer(target, null);
		}
		
		return buffer;
	}
	
	function useBuffer(buffer) {
		var attrib = buffer.attribPos;
		
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.vertexAttribPointer(attrib, buffer.elemsPerVert, buffer.type, false, 0, 0);
		gl.enableVertexAttribArray(attrib);
	}
	
	function updateView() {
		
		// view base position
		viewPos.set(viewDist, 0, 0, 1);
		
		// rotate and translate viewPos 
		auxM.setRotation(-viewAngleY, 0,1,0).rotate(viewAngleZ, 0,0,1);
		viewPos.multL(auxM);
		viewPos.setSum(viewPos, viewLookAt);
		
		// camera param
		camera.aspectRatio = canv3D.width/canv3D.height;
		
		// set view matrix
		var p = viewPos.entries;
		var a = viewLookAt.entries;
		viewMat.setLookAt( p[0], p[1], p[2], a[0], a[1], a[2], 0, 0, 1);
		viewMat.perspective(camera.fovy, camera.aspectRatio, camera.near, camera.far);
		
		// set the screen to space matrix
		p = auxV.entries;
		auxV.setSub(viewLookAt, viewPos).normalize();	// auxV now is the line of sight
		auxV.setSum(auxV, viewPos);						// auxV now is the origin of the near plane
		clickToSpace.setLookAt(p[0], p[1], p[2], a[0], a[1], a[2], 0, 0, 1).invert();
		
		updatedView = true;
	}
	
	function draw() {
		
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		
		// update global variables
		if (!updatedView) updateView();
		gl.uniformMatrix4fv(u_ViewMat, false, viewMat.entries);
		gl.uniform4fv(u_ViewPos, viewPos.entries);
		gl.uniform1i(u_Mode, SURF_MODE);
		
		// draw main structure
		drawBody();
		
		// draw the base plane
		surfColor.set(0.1, 0.1, 0.1);
		modelMat.setScale(4, 4, 1);
		drawPlane(modelMat, surfColor);
		
		// draw the four vertical planes
		surfColor.set(1.0, 1.0, 1.0);
		drawPlane(plane1Model, surfColor);
		drawPlane(plane2Model, surfColor);
		drawPlane(plane3Model, surfColor);
		drawPlane(plane4Model, surfColor);
		
		// draw paths
		gl.uniform1i(u_Mode, LINE_MODE);
		surfColor.set(0.0, 0.0, 0.9);
		if (viewPos.entries[1] < 4) drawPath(pathsBuffs.p1, pathsData.p1);
		if (viewPos.entries[0] < 4) drawPath(pathsBuffs.p2, pathsData.p2);
		if (viewPos.entries[1] > -4) drawPath(pathsBuffs.p3, pathsData.p3);
		
		// draw light
		surfColor.set(1.0, 1.0, 1.0);
		modelMat.setScale(0.1, 0.1, 0.02).translate(lightPointPos.entries[0], lightPointPos.entries[1], lightPointPos.entries[2]);
		drawCylinder(modelMat, surfColor);
	}
	
	function drawBody() {
		
		// draw base
		modelMat.set(baseModel);
		drawCylinder(modelMat, linkColor);
		
		// draw link 0
		drawCube(linkModel, linkColor);
		
		// draw joint 1
		Tm.set(Tw0);
		modelMat.set(jointModel).translate(0, 0, -linkLen).multL(Tm);
		drawCylinder(modelMat, jointColor);
		
		// draw link 1
		Tm.multR(dh.jointTm(1, q[0]));
		modelMat.set(linkModel).rotate(90, 1, 0, 0).multL(Tm);
		drawCube(modelMat, linkColor);
		
		// draw joint 2
		modelMat.set(jointModel).multL(Tm);
		drawCylinder(modelMat, jointColor);
		
		// draw link 2
		Tm.multR(dh.jointTm(2, q[1]));
		modelMat.set(linkModel).rotate(-90, 0, 1, 0).multL(Tm);
		drawCube(modelMat, linkColor);
		
		// draw joint 3
		modelMat.set(jointModel).multL(Tm);
		drawCylinder(modelMat, jointColor);
		
		// draw link 3
		Tm.multR(dh.jointTm(3, q[2]));
		modelMat.set(linkModel).multL(Tm);
		drawCube(modelMat, linkColor);
		
		// draw joint 4
		modelMat.set(jointModel).translate(0, 0, linkLen).multL(Tm);
		drawCylinder(modelMat, jointColor);
		
		// draw link 4
		Tm.multR(dh.jointTm(4, q[3]));
		modelMat.set(linkModel).rotate(-90, 1, 0, 0).multL(Tm);
		drawCube(modelMat, linkColor);
		
		// draw joint 5
		modelMat.set(jointModel).multL(Tm);
		drawCylinder(modelMat, jointColor);
		
		// draw link 5
		Tm.multR(dh.jointTm(5, q[4]));
		modelMat.set(linkModel).multL(Tm);
		drawCube(modelMat, linkColor);
		
		// draw joint 6
		modelMat.set(jointModel).translate(0, 0, linkLen).multL(Tm);
		drawCylinder(modelMat, jointColor);
		
		// draw end effector
		useBuffer(pyramidBuffs.a_Position);
		useBuffer(pyramidBuffs.a_Normal);
		
		Tm.multR(dh.jointTm(6, q[5]));
		
		auxM.set(tipModel).multL(Tm);
		gl.uniformMatrix4fv(u_ModelMat, false, auxM.entries);
		auxM.invert().transp();
		gl.uniformMatrix4fv(u_ModelNMat, false, auxM.entries);
		gl.uniform3fv(u_SurfColor, linkColor.entries);
		
		gl.drawArrays(gl.TRIANGLES, 0, shapesData.pyramid.vertCount);
		
	}
	
	function drawPath(pathB, pathD) {
		
		// update changing uniforms
		gl.uniformMatrix4fv(u_ModelMat, false, pathD.modelMat.entries);	// model
		gl.uniform3fv(u_SurfColor, surfColor.entries);					// color
		
		// reload buffers
		useBuffer(pathB.a_Position);
		gl.disableVertexAttribArray(planeBuffs.a_Normal.attribPos);
		
		// draw call
		gl.drawArrays(gl.LINE_LOOP, 0, pathD.vertCount);
	}
	
	function drawPlane(modMat, color) {
		
		useBuffer(planeBuffs.a_Position);
		useBuffer(planeBuffs.a_Normal);
		
		auxM.setInverseOf(modMat).transp();
		
		gl.uniformMatrix4fv(u_ModelMat, false, modMat.entries);
		gl.uniformMatrix4fv(u_ModelNMat, false, auxM.entries);
		gl.uniform3fv(u_SurfColor, color.entries);
		
		gl.drawArrays(gl.TRIANGLES, 0, shapesData.plane.vertCount);
	}
	
	function drawCylinder(modMat, color) {
		
		useBuffer(cylBuffs.a_Position);
		useBuffer(cylBuffs.a_Normal);
		
		auxM.setInverseOf(modMat).transp();
		
		gl.uniformMatrix4fv(u_ModelMat, false, modMat.entries);
		gl.uniformMatrix4fv(u_ModelNMat, false, auxM.entries);
		gl.uniform3fv(u_SurfColor, color.entries);
		
		gl.drawElements(gl.TRIANGLES, shapesData.cylinder.vertCount, gl.UNSIGNED_SHORT, 0);
	}
	
	function drawCube(modMat, color) {
		
		useBuffer(cubeBuffs.a_Position);
		useBuffer(cubeBuffs.a_Normal);
		
		auxM.setInverseOf(modMat).transp();
		
		gl.uniformMatrix4fv(u_ModelMat, false, modMat.entries);
		gl.uniformMatrix4fv(u_ModelNMat, false, auxM.entries);
		gl.uniform3fv(u_SurfColor, color.entries);
		
		gl.drawArrays(gl.TRIANGLES, 0, shapesData.cube.vertCount);
	}
	
	function switchAnimation(setOnOff) {
		
		// set animation flag
		if (arguments.length == 1) {
			if (setOnOff) {
				animationOn = true;
				startAnimTime = Date.now();
				animationFunction();
			} else {
				animationOn = false;
				startAnimPos = lastAnimPos;
			}
			return;
		}
		
		// toggle animation
		animationOn = !animationOn;
		if (animationOn) {
			startAnimTime = Date.now();
			animationFunction();
		} else {
			startAnimPos = lastAnimPos;
		}
	}
	
	function animationPath() {
		
		if (!animationOn) return;
		
		// instant selection
		var time = Date.now() - startAnimTime;
		var pos = (Math.round(time * animVelocity) + startAnimPos) % 1000;
		lastAnimPos = (pos < 0) ? (1000 + pos) : pos;
		
		setQ(q, currentTraj[lastAnimPos]);
		draw();
		
		animationRequest = requestAnimationFrame(animationPath);
	}
	
	function animationFreePath() {
		
		draw();
		
		animationRequest = requestAnimationFrame(animationFreePath);
	}
	
	function animationPathChange() {
		
		var time = (Date.now() - startAnimTime) / TRASITION_TIME;
		if (time > 1) {					// transition end: reset on the new path
			startAnimTime = Date.now();
			startAnimPos = 0;
			lastAnimPos = 0;
			if (animationOn || currentTraj === qTraj.free) {
				animationFunction();
			} else {
				setQ(q, currentTraj[0]);
				draw();
			}
			gui.setFreeze(false);
			
		} else {						// transition progress
			for (var i = 0; i < 6; ++i) {	// joints linear transition
				q[i] = time * qTransEnd[i] + (1 - time) * qTransStart[i];
			}
			for (var i = 0; i < 3; ++i) {	// view linear transition
				// viewLookAt and angles change
			}
			draw();
			requestAnimationFrame(animationPathChange);
		}
	}
	
	function setQ(qDest, qSource) {
		for (var i = 0; i < 6; ++i) {
			qDest[i] = qSource[i];
		}
	}
	
	function followPath(tr) {
		
		// block updating parts so to preserve coherence
		gui.setFreeze(true);
		cancelAnimationFrame(animationRequest);
		
		// save start and end configurations
		setQ(qTransStart, currentTraj[lastAnimPos]);
		currentTraj = qTraj[tr];
		setQ(qTransEnd, currentTraj[0]);
		
		// save start and end view configuration
		
		
		
		// minimize revolutions
		var pi = Math.PI;
		for (var i = 0; i < 6; ++i) {
			if (qTransEnd[i] - qTransStart[i] > Math.PI) qTransEnd[i] -= 2*pi;
			if (qTransEnd[i] - qTransStart[i] < -Math.PI) qTransStart[i] -= 2*pi;
		}
		
		// special case of free drawing
		if (tr === "freeRest") {
			currentTraj = qTraj.free;
			animationFunction = animationFreePath;
			setTimeout(function() {
				canv2D.addEventListener("mousemove", endEffectorPosUpdate);
			}, TRASITION_TIME);
		} else {
			animationFunction = animationPath;
			canv2D.removeEventListener("mousemove", endEffectorPosUpdate);
		}
		
		startAnimTime = Date.now();
		animationPathChange();
	}
	
	function setVelocity(v) {
		startAnimPos = lastAnimPos;
		startAnimTime = Date.now();
		animVelocity = 0.15 * v;
	}
	
	function setQInverseKin(endEffMat) {
		
		var eeM = endEffMat.entries;
		var dhM = dh.entries;
		var a2 = linkLen;
		var a3 = 2*linkLen;
		var l = linkLen;
		
		// spherical wrist position: Pe - d_6 * Z_6
		var pWx = eeM[12] - 2*linkLen * eeM[8];
		var pWy = eeM[13] - 2*linkLen * eeM[9];
		var pWz = eeM[14] - 2*linkLen * eeM[10] - 2*linkLen;	// because of Tw0
		
		// var c3 = (pWx*pWx + pWy*pWy + pWz*pWz - a2*a2 - a3*a3) / (2*a2*a3);
		// if (c3 > 1 || c3 < -1) return;			// out of workspace
		// var s3 = Math.sqrt(1 - c3*c3);
		// var q3 = Math.atan2(s3, c3);
		
		// var c2 = Math.sqrt(pWx*pWx + pWy*pWy) * (a2+a3*c3) + (pWz*a3*s3);	// scale ignored
		// var s2 = (pWz*(a2+a3*c3)) - Math.sqrt(pWx*pWx+pWy*pWy) * (a3*s3);	// scale ignored
		// var q2 = Math.atan2(s2, c2);
		
		// var q1 = Math.atan2(pWy, pWx);
		
		var s3 = (pWx*pWx + pWy*pWy + pWz*pWz - 5*l*l) / (4*l*l);
		if (c3 > 1 || c3 < -1) return;			// out of workspace
		var c3 = Math.sqrt(1 - s3*s3);
		var q3 = Math.atan2(s3, c3);
		
		var ps = Math.sqrt(pWx*pWx+pWy*pWy);
		var s2 = (pWz - 2*c3*Math.sqrt(pWx*pWx+pWy*pWy) + 2*pWz*s3)/(l*(- 4*c3*c3 + 4*s3*s3 + 4*s3 + 1));
		var c2 = (Math.sqrt(pWx*pWx+pWy*pWy) - 2*c3*pWz + 2*Math.sqrt(pWx*pWx+pWy*pWy)*s3)/(l*(- 4*c3*c3 + 4*s3*s3 + 4*s3 + 1));
		var q2 = Math.atan2(s2, c2)+Math.PI/2;
		
		var q1 = Math.atan2(pWy, pWx);
		
		q[0] = q1;
		q[1] = q2;
		q[2] = q3;
	}
	
	/* interaction functions */
	
	function endEffectorPosUpdate(ev) {
		
		// pointer coordinates on the canvas
		clickPos.set( (ev.clientX - canv3D.width/2) / (canv3D.width/2),
			(canv3D.height/2 - ev.clientY) / (canv3D.height/2),
			0, 1 
		);
		
		// scale click according to the view angle
		clickPos.entries[0] *= camera.near * (Math.tan(Math.PI * camera.fovy / 360) * camera.aspectRatio);
		clickPos.entries[1] *= camera.near * Math.tan(Math.PI * camera.fovy / 360);
		
		// click mapped in the 3d near plane of the camera
		clickPos.multL(clickToSpace);
		
		// plane intersection
		cameraRay.setSub(clickPos, viewPos).normalize();
			// distance on the ray along the projected ray
			// d = ((p0 - l0).n)/l.n
		auxV.setSub(plane4Point, viewPos);	// auxV = p0-l0
		var d = auxV.scalar(plane4Norm) / cameraRay.scalar(plane4Norm);
			// final point
		auxV.set4(cameraRay).scale(d);
		pointerPos.setSum(viewPos, auxV);
		
		
	}
	
	function onmousedown(ev) {		
		
		firstX = ev.clientX;
		firstY = ev.clientY;
		firstAngleY = viewAngleY;
		firstAngleZ = viewAngleZ;
		
		canv2D.addEventListener("mousemove", onmousemove);
	}
	
	function onmousemove(ev) {
		// displacement from initial
		var dX = (ev.clientX - firstX) / (canv3D.width/2);
		var dY = -(ev.clientY - firstY) / (canv3D.height/2);
		
		var dAngleZ = -dX * 120;
		var dAngleY = -dY * 90;
		
		viewAngleY = Math.max(Math.min(firstAngleY + dAngleY, 89), -10);
		viewAngleZ = (firstAngleZ + dAngleZ) % 360;
		
		updatedView = false;
		
		if (!animationOn) {
			draw();
		}
	}
	
	function onmouseup(ev) {
		canv2D.removeEventListener("mousemove", onmousemove);
	}
	
	function onwheel(ev) {
		ev.preventDefault();
		
		var direction = (ev.detail<0 || ev.wheelDelta>0) ? 1 : -1;
		
		// zoom
		viewDist -= direction/3;
		viewDist = Math.max(viewDist, 3);
		camera.far = viewDist + 20;
		
		updatedView = false;
		
		if (!animationOn) {
			draw();
		}
	}

	function onresize() {
		
		// update dimensions
		canv3D.width = window.innerWidth;
		canv3D.height = window.innerHeight;
		gl.viewport(0, 0, canv3D.width, canv3D.height);
		
		updatedView = false;
		
		// draw
		draw();
	}

	function ontouchstart(ev) {
		
		// single touch or multiple touches?
		if (ev.touches.length > 1) {	// multiple: zoom
			var t1 = ev.touches[0];
			var t2 = ev.touches[1];
			firstDist = viewDist;
			firstFingersDist = Math.sqrt((t1.clientX - t2.clientX) * (t1.clientX - t2.clientX) + (t1.clientY - t2.clientY) * (t1.clientY - t2.clientY));
			canvDiag = Math.sqrt(canv3D.width * canv3D.width + canv3D.height * canv3D.height);
			firstFingersDist /= canvDiag;
		} else {						// single: rotate
			var touch = ev.changedTouches[0];
			firstX = touch.clientX;
			firstY = touch.clientY;
			firstAngleY = viewAngleY;
			firstAngleZ = viewAngleZ;
		}
		canv2D.addEventListener("touchmove", ontouchmove);
	}
	
	function ontouchmove(ev) {
		ev.preventDefault();
		
		// single touch or multiple touches?
		if (ev.touches.length > 1) {	// multiple: zoom
		
			var t1 = ev.touches[0];
			var t2 = ev.touches[1];
			var fingersDist = Math.sqrt((t1.clientX - t2.clientX) * (t1.clientX - t2.clientX) + (t1.clientY - t2.clientY) * (t1.clientY - t2.clientY));
			fingersDist /= canvDiag;
			
			// displacement
			var dDist = (firstFingersDist - fingersDist) * 20;
			
			// update
			viewDist = Math.max(firstDist + dDist, 2.5);
			
		} else {						// single: rotate
			var touch = ev.changedTouches[0];
			
			// displacement from initial
			var dX = (touch.clientX - firstX) / (canv3D.width/2);
			var dY = -(touch.clientY - firstY) / (canv3D.height/2);
			
			dAngleZ = -dX * 100;
			dAngleY = -dY * 80;
			
			// update in real time
			viewAngleY = Math.max(Math.min(firstAngleY + dAngleY, 89), -2);
			viewAngleZ = (firstAngleZ + dAngleZ) % 360;
		}
		
		updatedView = false;
		if (!animationOn) {
			draw();
		}
	}
	
	function ontouchend(ev) {
		// if a finger is removed, no more actions
		canv2D.removeEventListener("touchmove", ontouchmove);
	}
	
	return {
		load: load,
		switchAnimation: switchAnimation,
		setVelocity : setVelocity,
		followPath : followPath
	}
}();


var gui = function() {
	
	// dimensions
	var scale = 1;
	var textSize;
	var offset; 
	var buttonRadius;
	
	// velcity slider
	var velocSlider;
	var velocNum;
	
	// ID: buttons pairs. Key values can range in [1:255]
	var optionButtons = {
		// 50: new Button("fullO", "Switch full screen", switchFullscreen, null),
		40: new Button("animO", "Switch animation", function() { drawing.switchAnimation(this.pressed) }, null),
		20: new Button("velocO", "Velocity", velocSliderButtonH, null)
	};
	var pathButtons = {
		60: new Button("path1", "Path 1", null, "t1"),
		70: new Button("path2", "Path 2", null, "t2"),
		80: new Button("path3", "Path 3", null, "t3"),
		90: new Button("pathF", "Free path", null, "freeRest")
	};
	
	var previousPathID = null;
	
	function Button(name, text, handler, data) {
		if (arguments.length < 4) {
			throw ("Button '"+name+"' error: check argument list length");
		}
		this.name = name;
		this.text = text;
		this.handler = handler;
		this.data = data;
		this.pressed = false;
	}
	
	var load = function() {
		
		function createSliderElement() {
			// add the velocity slider and a textbox to the page
			velocSlider = document.createElement("INPUT");
			velocSlider.setAttribute("type", "range");
			velocSlider.setAttribute("value", "1");
			velocSlider.setAttribute("min", "-2");
			velocSlider.setAttribute("max", "2");
			velocSlider.setAttribute("step", "0.1");
			velocSlider.style.position = "absolute";
			velocSlider.style.zIndex = "2";
			velocSlider.style.display = "none";
			document.body.appendChild(velocSlider);
			
			velocNum = document.createElement("INPUT");
			velocNum.setAttribute("type", "text");
			velocNum.setAttribute("value", "1");
			velocNum.setAttribute("readonly", "true");
			velocNum.style.position = "absolute";
			velocNum.style.zIndex = "2";
			velocNum.style.display = "none";
			document.body.appendChild(velocNum);
		}
		
		function load() {
		
			// add the velocity slider and a textbox to the page
			createSliderElement();
			
			// add fullscreen option
			var fullScreenEnabled = document.documentElement.requestFullscreen ||
				document.documentElement.msRequestFullscreen ||
				document.documentElement.mozRequestFullScreen ||
				document.documentElement.webkitRequestFullscreen;
			if (fullScreenEnabled) {
				optionButtons[50] = new Button("fullO", "Switch full screen", switchFullscreen, null);
			}
			
			// update dimensions and draw
			onresize();
			
			// bind controls
			canv2D.addEventListener("click", onclick);
			velocSlider.addEventListener("change", velocSliderH);
			velocSlider.addEventListener("input", velocSliderH);
			
			var resizeTimerID;
			var delayedResize = function() {
				clearTimeout(resizeTimerID);
				resizeTimerID = setTimeout(onresize, 500);
			};
			window.addEventListener("resize", delayedResize);
		}
		
		return load;
		
	}();
	
	function draw() {
		
		// clear
		c2d.clearRect(0, 0, canv2D.width, canv2D.height);
		
		// dimensions setup
		c2d.font = textSize.toFixed(0) + "px Verdana";
		c2d.textAlign = "start";
		c2d.textBaseline = "bottom";
		c2d.lineWidth = 2;
		
		// Different paths: top-left
		var x = offset;
		var y = offset;
		c2d.fillStyle = "white";
		c2d.fillText("Trajectories:", x, y + textSize*0.3);
		c2d.textBaseline = "middle";
		for (var id in pathButtons) {
			
			y += offset;
			
			// draw button
			c2d.fillStyle = (pathButtons[id].pressed) ? "rgb(200, 200, 200)" : "black";
			c2d.strokeStyle = "white";
			c2d.beginPath();
			c2d.arc(x, y, buttonRadius, 0, 2*Math.PI);
			c2d.fill();
			c2d.stroke();
			
			// draw texts
			c2d.fillStyle = "white";
			c2d.fillText(pathButtons[id].text, x + offset*0.8, y);
		}
		
		// Options: bottom-left
		x = offset;
		y = canv2D.height - offset;
		for (var id in optionButtons) {
			
			// draw button
			c2d.fillStyle = (optionButtons[id].pressed) ? "rgb(200, 200, 200)" : "black";
			c2d.strokeStyle = "white";
			c2d.beginPath();
			c2d.arc(x, y, buttonRadius, 0, 2*Math.PI);
			c2d.fill();
			c2d.stroke();
			
			// draw texts
			c2d.fillStyle = "white";
			c2d.fillText(optionButtons[id].text, x + offset*0.8, y);
			
			y -= offset;
		}
		
		// controls info
		x = canv2D.width - offset/2;
		y = offset/2;
		c2d.fillStyle = "rgba(20, 20, 20, 0.2)";
		c2d.fillRect(x, y, -textSize*11, offset*5.5);
		
		x = canv2D.width - offset;
		y = offset;
		c2d.fillStyle = "white";
		c2d.font = (textSize*0.8).toFixed(0) + "px Verdana";
		c2d.textAlign = "end";
		c2d.fillText("Controls", x, y);	y += offset;
		c2d.font = (textSize*0.6).toFixed(0) + "px Verdana";
		c2d.fillText("Click and drag with the mouse", x, y);	y += offset/2;
		c2d.fillText("button to rotate the view point.", x, y);	y += offset;
		c2d.fillText("Roll the mouse wheel", x, y);	y += offset/2;
		c2d.fillText("to zoom in/out.", x, y);	y += offset;
		c2d.fillText("Use touch gesture to zoom", x, y);	y += offset/2;
		c2d.fillText("or rotate the view point.", x, y);	y += offset;
	}
	
	function drawIDAreas() {
		
		// clear
		c2d.fillStyle = "black";
		c2d.fillRect(0, 0, canv2D.width, canv2D.height);
		
		
		// draw pathButtons
		var x = offset * 0.5;
		var y = offset * 1.5;
		for (var id in pathButtons) {
			
			c2d.fillStyle = "rgb("+ id +",0,0)";
			c2d.fillRect(x, y, offset, offset);
			c2d.fill();
			
			y += offset;
		}
		
		// draw optionButtons
		x = offset * 0.5;
		y = canv2D.height - offset * 1.5;
		for (var id in optionButtons) {
			
			c2d.fillStyle = "rgb("+ id +",0,0)";
			c2d.fillRect(x, y, offset, offset);
			c2d.fill();
			
			y -= offset;
		}
	}
	
	function velocSliderButtonH() {
		
		if (this.pressed)	{		// turn on
			this.hiddenText = this.text;
			this.text = "";
			draw();
			velocSlider.style.display = "block";
			velocNum.style.display = "block";
		
		} else {					// turn off
			velocSlider.style.display = "none";
			velocNum.style.display = "none";
			this.text = this.hiddenText;
			draw();
		}
	}
	
	function velocSliderH() {
		
		var velocity = parseFloat(velocSlider.value);
		velocNum.value = velocity.toFixed(1);
		
		drawing.setVelocity(velocity);
	}
	
	function pressButton(id) {
		
		if (pathButtons[id]) {
			
			// check double selection
			if (id === previousPathID) return;
			
			// show selection
			if (pathButtons[previousPathID])
				pathButtons[previousPathID].pressed = false;
			pathButtons[id].pressed = true;
			previousPathID = id;
			draw();
			
			// action if defined
			if (pathButtons[id].handler) pathButtons[id].handler();
			
			// load path
			drawing.followPath(pathButtons[id].data);
			
		} else if (optionButtons[id]) {
			
			// show selection
			optionButtons[id].pressed = !optionButtons[id].pressed;
			draw();
			
			// action
			optionButtons[id].handler();
		}
		
	}
	
	function switchFullscreen() {
		if (!document.fullscreenElement && // alternative standard method
			!document.mozFullScreenElement && !document.webkitFullscreenElement && !document.msFullscreenElement) { // current working methods
			if (document.documentElement.requestFullscreen) {
				document.documentElement.requestFullscreen();
			} else if (document.documentElement.msRequestFullscreen) {
				document.documentElement.msRequestFullscreen();
			} else if (document.documentElement.mozRequestFullScreen) {
				document.documentElement.mozRequestFullScreen();
			} else if (document.documentElement.webkitRequestFullscreen) {
				document.documentElement.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
			}
		} else {
			if (document.exitFullscreen) {
				document.exitFullscreen();
			} else if (document.msExitFullscreen) {
				document.msExitFullscreen();
			} else if (document.mozCancelFullScreen) {
				document.mozCancelFullScreen();
			} else if (document.webkitExitFullscreen) {
				document.webkitExitFullscreen();
			}
		}
	}
	
	function setFreeze(onOff) {
		if (onOff) {
			canv2D.removeEventListener("click", onclick);
			velocSlider.removeEventListener("change", velocSliderH);
			velocSlider.removeEventListener("input", velocSliderH);
		} else {
			canv2D.addEventListener("click", onclick);
			velocSlider.addEventListener("change", velocSliderH);
			velocSlider.addEventListener("input", velocSliderH);
		}
	}
	
	function onresize() {
		
		// update canvas dimensions
		canv2D.width = window.innerWidth;
		canv2D.height = window.innerHeight;
		
		// update scaling
		scale = Math.sqrt(canv2D.height * canv2D.height + canv2D.width * canv2D.width) / 130;
		scale = Math.min(Math.max(scale, 9), 15);
		textSize = 1.8 * scale;
		offset = 3 * scale;
		buttonRadius = 0.6 * scale;
		c2d.clearRect(0, 0, canv2D.width, canv2D.height);
		
		// scale slider element and its text area
		velocSlider.style.top = (canv2D.height-offset-textSize*0.6)+"px";
		velocSlider.style.left = (offset*2)+"px";
		velocSlider.style.height = textSize+"px";
		velocSlider.style.width = textSize*8+"px";
		velocNum.style.top = (canv2D.height-offset-textSize*0.5)+"px";
		velocNum.style.left = (offset*2.5 + textSize*8)+"px";
		velocNum.style.height = textSize+"px";
		velocNum.style.width = textSize*1.5+"px";
		velocNum.style.fontSize = textSize*0.9+"px";
		
		// re draw
		draw();
	}
	
	function onclick(ev) {
		
		// getID
		drawIDAreas();
		var pixel = c2d.getImageData(ev.clientX, ev.clientY, 1, 1);
		var id = pixel.data[0];
		draw();
		
		// if a button initiate action
		if (id != 0) pressButton(id);
	}
	
	return {
		load: load,
		pressButton: pressButton,
		setFreeze: setFreeze
	}
}();


var RobTools = function() {
	
	//	internal matrices and result matrix
	var matr1 = new Matrix4();
	var matr2 = new Matrix4();
	var res = new Matrix4();
	
	
	var DH = function () {
		this.entries = new Float32Array(4 * 6);
	};
	
	DH.prototype.set = function(row, a, al, d, th) {
		
		if (!row || row < 1 || row > 6) {
			throw "Invalid row specified."
		}
		
		var i = (row - 1) * 4;
		var dh = this.entries;
		
		dh[i++] = a;
		dh[i++] = al;
		dh[i++] = d;
		dh[i++] = th;
	};
	
	DH.prototype.jointTm = function(row, th) {
		
		if (!row || row < 1 || row > 6) {
			throw "Invalid row, theta specified."
		}
		
		var i = (row - 1) * 4;
		var dh = this.entries;
		
		return Tm(dh[i], dh[i+1], dh[i+2], th);
	};
	
	var Tm = function(a, al, d, th) {
		
		// build the homogeneous matrix
		matr1.setRotation(th, 0, 0, 1, true);
		matr1.entries[14] = d;
		matr2.setRotation(al, 1, 0, 0, true);
		matr2.entries[12] = a;
		res.multArrays(matr1.entries, matr2.entries);
		
		return res;
	}
	
	return {
		DH:DH,
		Tm: Tm
	}
}();


