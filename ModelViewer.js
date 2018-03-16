// Roberto C. 08/09/2016 ModelViewer.js

// DOM page elements and their contexts
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
	
	// all actions to be selected through the gui
	gui.load();
}


var drawing = function() {
	
	// light parameters
	var lightAmbientColor = new Vector3([0.2, 0.2, 0.2]);
	var lightPointColor = new Vector3([1.0, 1.0, 1.0]);
	var lightPointXY = 6;
	var lightPointHeight = 5;
	var lightAngleZ = 45;
	var lightFovY = 70;
	var lightPointPos = new Vector4();
	var lightMat = new Matrix4();	// light projection matrix
	
	// view variale parameters
	var viewDist = 10;
	var viewAngleZ = 30;
	var viewAngleY = 45;
	var viewLookAt = new Vector4([0, 0, 1, 1]);
	var viewPos = new Vector4();
	var viewMat = new Matrix4();
	var mat = new Matrix4();	// general purpose transformation matrix
	var vec = new Vector3();	// general purpose vector
	
	var camera = {
		aspectRatio: 1,
		fovy: 70,
		near: 1,
		far: 50
	};
	
	// drawing data
	var modelData;
	
	// interaction variables: view zoom, rotation
	var firstX, firstY;
	var firstAngleZ, firstAngleY;
	var firstDist, firstFingersDist;
	var dAngleY, dAngleZ;
	var canvDiag;

	// animation variables
	var ANG_VEL = 20;				// deg/s
	var lastTimeAnim = Date.now();
	var lastTimeReDraw = Date.now();
	
	// drawing options
	var animationOn = false;
	var shadowMapDrawOn = false;
	
	// shadow map
	var framebuffer = null;
	var SHADOWMAP_SIZE = 2048;

	
	// main shader program
	var mainProg;					// the program object
	var mainProgU = {				// uniform locations
		u_ViewMat: null,
		u_ViewPos: null,
		u_LightAmbientColor: null,
		u_LightPointPos: null,
		u_LightPointColor: null,
		u_GammaCorrect: null,
		u_LightMat: null,
		u_ShadowMap: null
	};
	var mainProgA = {				// attribute locations
		a_Position: -1,
		a_Normal: -1,
		a_Kd: -1,
		a_Ks: -1,
		a_Ka: -1,
		a_Ns: -1
	};
	var mainProgBuffs = {};			// attribute buffer objects
	
	var mainProgVS = (
		"attribute vec4 a_Position; \n" +
		"attribute vec3 a_Normal; \n" +
		"attribute vec3 a_Kd; \n" +
		"attribute vec3 a_Ks; \n" +
		"attribute float a_Ka; \n" +
		"attribute float a_Ns; \n" +
		" \n" +
		"uniform mat4 u_ViewMat; \n" +
		"uniform mat4 u_LightMat; \n" +
		" \n" +
		"varying vec3 v_Normal; \n" +
		"varying vec3 v_Position; \n" +
		"varying vec3 v_Kd; \n" +
		"varying vec3 v_Ks; \n" +
		"varying float v_Ka; \n" +
		"varying float v_Ns; \n" +
		"varying vec4 v_PositionFromLight; \n" +
		" \n" +
		"void main() { \n" +
		"	gl_Position = u_ViewMat * a_Position; \n" +
		"	 \n" +
		"	v_Normal = a_Normal;	// assumed already normalized \n" +
		"	v_Position = vec3(a_Position); \n" +
		"	v_Ka = a_Ka; \n" +
		"	v_Kd = a_Kd; \n" +
		"	v_Ks = a_Ks; \n" +
		"	v_Ns = a_Ns; \n" +
		"	v_PositionFromLight = u_LightMat * a_Position; \n" +
		"}"
	);
	
	var mainProgFS = (
		"#ifdef GL_ES \n" +
		"precision mediump float; \n" +
		"#endif \n" +
		" \n" +
		" \n" +
		"#define SHADOWMAP_SIZE 2048.0 \n" +
		"#define MESH_DRAW 1 \n" +
		"#define POINT_DRAW 2 \n" +
		" \n" +
		"const float SHADOW_FRAG_DENSITY = (1.0 / SHADOWMAP_SIZE); \n" +
		"const vec4 BIT_SHIFT = vec4(1.0, 1.0/255.0, 1.0/(255.0*255.0), 1.0/(255.0*255.0*255.0)); \n" +
		" \n" +
		"uniform vec3 u_ViewPos; \n" +
		"uniform vec3 u_LightPointPos; \n" +
		"uniform vec3 u_LightAmbientColor; \n" +
		"uniform vec3 u_LightPointColor; \n" +
		"uniform float u_GammaCorrect; \n" +
		"uniform sampler2D u_ShadowMap; \n" +
		" \n" +
		"varying vec3 v_Normal; \n" +
		"varying vec3 v_Position; \n" +
		"varying vec3 v_Kd; \n" +
		"varying vec3 v_Ks; \n" +
		"varying float v_Ka; \n" +
		"varying float v_Ns; \n" +
		"varying vec4 v_PositionFromLight; \n" +
		" \n" +
		"float getDepth(const vec4 rgbaDepth); \n" +
		" \n" +
		"void main() { \n" +
		"	 \n" +
		"	vec3 pointLightVec = normalize(u_LightPointPos - v_Position); \n" +
		"	vec3 normal = normalize(v_Normal); \n" +
		"	 \n" +
		"	// ambient \n" +
		"	vec3 ambient = u_LightAmbientColor * v_Ka * v_Kd; \n" +
		"	 \n" +
		"	// diffuse \n" +
		"	float diffuseCoeff = max( dot(pointLightVec, normal), 0.0); \n" +
		"	 \n" +
		"	// specular (Blinn) \n" +
		"	float specularCoeff = 0.0; \n" +
		"	if (diffuseCoeff > 0.0) { \n" +
		"		vec3 pointCamVec = normalize(u_ViewPos - v_Position); \n" +
		"		vec3 halfVec = normalize(pointLightVec + pointCamVec); \n" +
		"		specularCoeff = max( dot(halfVec, normal), 0.0); \n" +
		"		specularCoeff = pow(specularCoeff, v_Ns); \n" +
		"	} \n" +
		"	 \n" +
		"	// shadow calculations \n" +
		"	float bias = 0.0025 * (1.0 - diffuseCoeff) + 0.008; \n" +
		"	float shadowCoordOffset = SHADOW_FRAG_DENSITY * ((1.0 - diffuseCoeff) * 0.4 + 0.3); \n" +
		"	vec3 pointMapCoord = (v_PositionFromLight.xyz / v_PositionFromLight.w) * 0.5 + 0.5; \n" +
		"	 \n" +
		"	vec4 shadowRGBA; \n" +
		"	float lightDepth; \n" +
		"	float lightIntensity = 0.0; \n" +
		"	for (int i = -1; i <= 1; ++i) { \n" +
		"		for (int j = -1; j <= 1; ++j) { \n" +
		"			shadowRGBA = texture2D(u_ShadowMap, pointMapCoord.xy \n" +
		"				+ vec2(i, j) * shadowCoordOffset); \n" +
		"			lightDepth = dot(shadowRGBA, BIT_SHIFT);	// get depth float \n" +
		"			if (pointMapCoord.z - bias <= lightDepth) { \n" +
		"				lightIntensity += 1.0; \n" +
		"			} \n" +
		"		} \n" +
		"	} \n" +
		"	lightIntensity /= 9.0; \n" +
		"	 \n" +
		"	diffuseCoeff = diffuseCoeff * lightIntensity; \n" +
		"	specularCoeff = specularCoeff * lightIntensity; \n" +
		"	 \n" +
		"	// color \n" +
		"	vec3 diffuse = u_LightPointColor * v_Kd * diffuseCoeff; \n" +
		"	vec3 specular = u_LightPointColor * v_Ks * specularCoeff; \n" +
		"	 \n" +
		"	vec3 linColor = vec3(ambient + diffuse + specular); \n" +
		"	 \n" +
		"	// gamma correction \n" +
		"	gl_FragColor = vec4(pow(linColor, vec3(1.0/u_GammaCorrect)), 1.0); \n" +
		"}"
	);
	
	// shadows program
	var shadowsProg;
	var shadowsProgU = {
		u_LightMat: null
	};
	var shadowsProgA = {
		a_Position: -1
	};
	var shadowsProgBuffs = {};
	
	var shadowsProgVS = (
		"attribute vec4 a_Position; \n" +
		" \n" +
		"uniform mat4 u_LightMat; \n" +
		" \n" +
		"void main() { \n" +
		"	gl_Position = u_LightMat * a_Position; \n" +
		"}"
	);
	
	var shadowsProgFS = (
		"#ifdef GL_ES \n" +
		"precision mediump float; \n" +
		"#endif \n" +
		" \n" +
		" const vec4 BIT_SHIFT = vec4(1.0, 255.0, 250.0*255.0, 250.0*255.0*255.0); \n" +
		" \n" +
		"void main() { \n" +
		"	gl_FragColor = fract(gl_FragCoord.z * BIT_SHIFT); \n" +
		"	gl_FragColor.a = 1.0; \n" +
		"}"
	);
	
	// points program
	var pointsProg;
	var pointsProgU = {
		u_ViewMat: null
	};
	var pointsProgA = {
		a_Position: -1,
		a_Color: -1
	};
	var pointsProgBuffs = {};
	
	var pointsProgVS = (
		"attribute vec4 a_Position; \n" +
		"attribute vec4 a_Color; \n" +
		" \n" +
		"uniform mat4 u_ViewMat; \n" +
		" \n" +
		"varying vec4 v_Color; \n" +
		" \n" +
		"void main() { \n" +
		"	vec4 pos = u_ViewMat * a_Position; \n" +
		"	pos /= pos.w; \n" +
		"	float size = (1.0 - ((pos.z * 0.5) + 0.5)) * 100.0; \n" +
		"	 \n" +
		"	gl_PointSize = size; \n" +
		"	gl_Position = pos; \n" +
		"	 \n" +
		"	v_Color = a_Color; \n" +
		"}"
	);
	
	var pointsProgFS = (
		"#ifdef GL_ES \n" +
		"precision mediump float; \n" +
		"#endif \n" +
		" \n" +
		"varying vec4 v_Color; \n" +
		" \n" +
		"void main() { \n" +
		"	float d = distance(gl_PointCoord, vec2(0.5, 0.5)); \n" +
		"	if (d < 0.5) { \n" +
		"		gl_FragColor = v_Color; \n" +
		"	} else { \n" +
		"		discard; \n" +
		"	} \n" +
		"}"
	);

	
	function load() {
		
		// get gl data from the model
		modelData = OBJLib.modelData;
		
		// create the Framebuffer Object for the shadow map
		prepareFramebuffer();
		
		
		
		// prepare shadowsProg
		shadowsProg = WebGLInit.createProgram(gl, shadowsProgVS, shadowsProgFS);
		
		// get variables locations for shadowsProg
		for (var u in shadowsProgU) {
			shadowsProgU[u] = gl.getUniformLocation(shadowsProg, u);
			if (!shadowsProgU[u]) {
				throw ("Failed to get the storage location of uniform variable: " + u);
			}
		}
		for (var a in shadowsProgA) {
			shadowsProgA[a] = gl.getAttribLocation(shadowsProg, a);
			if (shadowsProgA[a] < 0) {
				throw "Failed to get the storage location of attribute variable: " + a;
			}
		}
		
		// prepare attributes buffers for shadowsProg
		shadowsProgBuffs.a_Position = prepareBuffer(gl.ARRAY_BUFFER, modelData.vertices, 3, gl.FLOAT, true);
		shadowsProgBuffs.indices = prepareBuffer(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, null, null, true);
		
		
		
		// Prepare mainProg
		mainProg = WebGLInit.createProgram(gl, mainProgVS, mainProgFS);
		
		// get variables locations for mainProg
		for (var u in mainProgU) {
			mainProgU[u] = gl.getUniformLocation(mainProg, u);
			if (!mainProgU[u]) {
				throw ("Failed to get the storage location of uniform variable: " + u);
			}
		}
		for (var a in mainProgA) {
			mainProgA[a] = gl.getAttribLocation(mainProg, a);
			if (mainProgA[a] < 0) {
				throw "Failed to get the storage location of attribute variable: " + a;
			}
		}
		
		// load fixed uniforms for mainProg
		gl.useProgram(mainProg);
		gl.uniform3fv(mainProgU.u_LightAmbientColor, lightAmbientColor.entries);
		gl.uniform3fv(mainProgU.u_LightPointColor, lightPointColor.entries);
		gl.uniform1f(mainProgU.u_GammaCorrect, 1);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, framebuffer.shadowMap);
		
		// prepare attributes buffers for mainProg
		mainProgBuffs.a_Position = prepareBuffer(gl.ARRAY_BUFFER, modelData.vertices, 3, gl.FLOAT);
		mainProgBuffs.a_Normal = prepareBuffer(gl.ARRAY_BUFFER, modelData.normals, 3, gl.FLOAT);
		mainProgBuffs.a_Kd = prepareBuffer(gl.ARRAY_BUFFER, modelData.materialKd, 3, gl.FLOAT);
		mainProgBuffs.a_Ks = prepareBuffer(gl.ARRAY_BUFFER, modelData.materialKs, 3, gl.FLOAT);
		mainProgBuffs.a_Ka = prepareBuffer(gl.ARRAY_BUFFER, modelData.materialKa, 1, gl.FLOAT);
		mainProgBuffs.a_Ns = prepareBuffer(gl.ARRAY_BUFFER, modelData.materialNs, 1, gl.FLOAT, true);
		mainProgBuffs.indices = prepareBuffer(gl.ELEMENT_ARRAY_BUFFER, modelData.indices, null, null, true);
		
		
		
		// prepare pointsProg
		pointsProg = WebGLInit.createProgram(gl, pointsProgVS, pointsProgFS);
		
		// get variables locations for pointsProg
		for (var u in pointsProgU) {
			pointsProgU[u] = gl.getUniformLocation(pointsProg, u);
			if (!pointsProgU[u]) {
				throw ("Failed to get the storage location of uniform variable: " + u);
			}
		}
		for (var a in pointsProgA) {
			pointsProgA[a] = gl.getAttribLocation(pointsProg, a);
			if (pointsProgA[a] < 0) {
				throw "Failed to get the storage location of attribute variable: " + a;
			}
		}
		
		// draw setup
		gl.enable(gl.DEPTH_TEST);
		gl.frontFace(gl.CCW);
		gl.cullFace(gl.BACK);
		gl.enable(gl.CULL_FACE);
		
		// initializations completed
		reDraw();
		
		// interaction events
		canv2D.addEventListener("mousedown", onmousedown);
		window.addEventListener("mouseup", onmouseup);
		canv2D.addEventListener("touchstart", ontouchstart);
		window.addEventListener("touchend", ontouchend);
		canv2D.addEventListener('DOMMouseScroll', onwheel,false); // for Firefox
		canv2D.addEventListener('mousewheel', onwheel,false); // for everyone else
			
		var resizeTimerID;
		var delayedResize = function() {
			clearTimeout(resizeTimerID);
			resizeTimerID = setTimeout(onresize, 500);
		};
		window.addEventListener("resize", delayedResize);
		
	}
	
	function drawMain() {
		
		gl.useProgram(mainProg);
		
		// load variable uniforms
		updateView();
		
		gl.uniformMatrix4fv(mainProgU.u_LightMat, false, lightMat.entries);
		gl.uniformMatrix4fv(mainProgU.u_ViewMat, false, viewMat.entries);
		gl.uniform3fv(mainProgU.u_LightPointPos, vec.set4(lightPointPos).toGlCoord().entries);
		gl.uniform3fv(mainProgU.u_ViewPos, vec.set4(viewPos).toGlCoord().entries);
		
		// use attribute buffers
		for (var a in mainProgA) {
			useBuffer(mainProgA[a], mainProgBuffs[a]);
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mainProgBuffs.indices);
		
		// draw command
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, canv3D.width, canv3D.height);
		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.drawElements(gl.TRIANGLES, modelData.indices.length, gl.UNSIGNED_INT, 0);
		
		// disable vertex buffers
		for (var a in mainProgA) {
			gl.disableVertexAttribArray(mainProgA[a]);
		}
	}
	
	function drawShadows() {
		
		gl.useProgram(shadowsProg);

		// load variable uniforms
		updateLight();
		gl.uniformMatrix4fv(shadowsProgU.u_LightMat, false, lightMat.entries);
		
		// use attribute buffers
		for (var a in shadowsProgA) {
			useBuffer(shadowsProgA[a], shadowsProgBuffs[a]);
		}
		gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mainProgBuffs.indices);
		
		
		// draw in the Framebuffer
		if (!shadowMapDrawOn) {
			gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
			gl.viewport(0, 0, SHADOWMAP_SIZE, SHADOWMAP_SIZE);
			gl.clearColor(1.0, 1.0, 1.0, 1.0);
		} else {
			gl.viewport(0, 0, canv3D.width, canv3D.height);
			gl.clearColor(0.0, 0.0, 0.0, 1.0);
		}
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.drawElements(gl.TRIANGLES, modelData.indices.length, gl.UNSIGNED_INT, 0);
	}
	
	function drawLight() {
		
		gl.useProgram(pointsProg);
		
		// update variables
		gl.uniformMatrix4fv(pointsProgU.u_ViewMat, false, viewMat.entries);
		gl.vertexAttrib3fv(pointsProgA.a_Position, vec.set3(lightPointPos).toGlCoord().entries);
		gl.vertexAttrib3fv(pointsProgA.a_Color, lightPointColor.entries);
		
		// draw
		gl.drawArrays(gl.POINTS, 0, 1);
	}
	
	function prepareFramebuffer() {
		
		// create a Framebuffer object
		framebuffer = gl.createFramebuffer();
		if (!framebuffer) {
			throw "Failed to create Framebuffer object";
		}
		
		// create a Texture object as target
		var texture = gl.createTexture();
		if (!texture) {
			throw "Failed to create texture object";
		}
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SHADOWMAP_SIZE, SHADOWMAP_SIZE, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
		
		// create a Renderbuffer object
		var depthBuffer = gl.createRenderbuffer();
		if (!depthBuffer) {
			throw "Failed to create a Renderbuffer";
		}
		gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
		gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SHADOWMAP_SIZE, SHADOWMAP_SIZE);
		
		// bind the targets to the Framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
		gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);
		
		var e = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
		if (e !== gl.FRAMEBUFFER_COMPLETE) {
			throw ("Framebuffer object is incomplete: " + e.toString());
		}
		
		// unbind the Framebuffer
		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.bindTexture(gl.TEXTURE_2D, null);
		gl.bindRenderbuffer(gl.RENDERBUFFER, null);
		
		framebuffer.shadowMap = texture;
	}
	
	function prepareBuffer(target, data, elemsPerVert, type, free) {
		
		// create buffer
		var buffer = gl.createBuffer();
		if (!buffer) {
			throw "Failed to create a buffer";
		}
		
		// put data
		gl.bindBuffer(target, buffer);
		gl.bufferData(target, data, gl.STATIC_DRAW);
		
		// save needed information on use
		buffer.elemsPerVert = elemsPerVert;
		buffer.type = type;
		
		if (free) {
			gl.bindBuffer(target, null);
		}
		
		return buffer;
	}
	
	function useBuffer(attribute, buffer) {
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
		gl.vertexAttribPointer(attribute, buffer.elemsPerVert, buffer.type, false, 0, 0);
		gl.enableVertexAttribArray(attribute);
	}
	
	function updateView() {
		
		// view base position
		viewPos.set(viewDist, 0, 0, 1);
		
		// rotate and translate viewPos 
		mat.setRotation(-viewAngleY, 0,1,0).rotate(viewAngleZ, 0,0,1);
		viewPos.multL(mat);
		viewPos.setSum(viewPos, viewLookAt);
		
		// calc camera matrix
		camera.aspectRatio = canv3D.width/canv3D.height;
		var fovy = camera.fovy;
		if (camera.aspectRatio < 1) {
			fovy /= camera.aspectRatio;
		}
		
		var p = viewPos.entries;
		var a = viewLookAt.entries;
		viewMat.setLookAt( p[0], p[1], p[2], a[0], a[1], a[2], 0, 0, 1, true);
		viewMat.perspective(camera.fovy, camera.aspectRatio, camera.near, camera.far);		
	}
	
	function updateLight() {
		
		// light base pos
		lightPointPos.set(lightPointXY, 0, lightPointHeight, 1);
		
		// rotate light
		mat.setRotation(lightAngleZ, 0, 0, 1);
		lightPointPos.multL(mat);
		
		// calc light matrix
		var v = lightPointPos.entries;
		var a = viewLookAt.entries;
		lightMat.setLookAt( v[0], v[1], v[2], a[0], a[1], a[2]-1, 0, 0, 1, true);
		lightMat.perspective(lightFovY, 1, 4, 15);
			// .orthProj(-10, 10, -10, 10, 1, 20);
	}
	
	function updateGamma(gamma) {
		
		gamma = Math.min(Math.max(1, gamma), 4);
		
		gl.useProgram(mainProg);
		gl.uniform1f(mainProgU.u_GammaCorrect, gamma);
		
		reDraw();
	}
	
	function reDraw() {
		
		if (shadowMapDrawOn) {
			drawShadows();
		} else {
			drawShadows();
			drawMain();
			drawLight();
		}
	}	

	function switchAnimation() {
		
		lastTimeAnim = Date.now();
		
		if (animationOn) {
			animationOn = false;
		} else {
			animationOn = true;
			animate();
		}
	}
	
	function switchShadowMapDraw() {
		
		shadowMapDrawOn = !shadowMapDrawOn;
		reDraw();
	}

	function setLightParams(xyDist, z) {
		if (xyDist) {
			lightPointXY = xyDist;
			if (z) {
				lightPointHeight = z;
			}
		}
	}
	
	function animate() {
		
		// animate variable
		var now = Date.now();
		lightAngleZ += ((now - lastTimeAnim) * 0.001 * ANG_VEL);
		lightAngleZ %= 360;
		lastTimeAnim = now;
		
		// draw
		reDraw();
		if (animationOn) {
			requestAnimationFrame(animate);
		}
	}
	
	function onresize() {
		
		// update dimensions
		canv3D.width = window.innerWidth;
		canv3D.height = window.innerHeight;
		
		gl.viewport(0, 0, canv3D.width, canv3D.height);
		
		// load camera matrix
		camera.aspectRatio = canv3D.width/canv3D.height;
		var fovy = camera.fovy;
		if (camera.aspectRatio < 1) {
			fovy /= camera.aspectRatio;
		}
		
		var p = viewPos.entries;
		var a = viewLookAt.entries;
		viewMat.setLookAt( p[0], p[1], p[2], a[0], a[1], a[2], 0, 0, 1, true);
		viewMat.perspective(camera.fovy, camera.aspectRatio, camera.near, camera.far);	
		
		// draw
		reDraw();
	}
	
	// mouse interactions
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
		
		dAngleZ = -dX * 120;
		dAngleY = -dY * 90;
		
		// update in real time
		viewAngleY = Math.max(Math.min(firstAngleY + dAngleY, 89), -2);
		viewAngleZ = (firstAngleZ + dAngleZ) % 360;
		
		var now = Date.now();
		if (!animationOn && (now-lastTimeReDraw) > 12) {
			lastTimeReDraw = now;
			reDraw();
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
		viewDist = Math.max(viewDist, 2.5);
		
		camera.far = viewDist + 20;
		
		reDraw();
	}
	
	// touch interactions
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
		
		var now = Date.now();
		if (!animationOn && (now-lastTimeReDraw) > 12) {
			lastTimeReDraw = now;
			reDraw();
		}
	}
	
	function ontouchend(ev) {
		// if a finger is removed, no more actions
		canv2D.removeEventListener("touchmove", ontouchmove);
	}
	
	return {
		load: load,
		setLightParams: setLightParams,
		
		switchAnimation: switchAnimation,
		switchShadowMapDraw: switchShadowMapDraw,
		updateGamma: updateGamma
	}
	
}();

var gui = function() {
	
	// dimensions
	var scale = 1;
	var textSize;
	var offset; 
	var buttonRadius;
	
	// gamma slider
	var gammaSlider;
	var gammaNum;
	
	// ID: buttons pairs. Key values can range in [1:255]
	var optionButtons = {
		// 50: new Button("fullO", "Switch full screen", switchFullscreen, null),
		40: new Button("animO", "Switch animation", drawing.switchAnimation, null),
		30: new Button("shadowmapO", "Switch shadowmap", drawing.switchShadowMapDraw, null),
		10: new Button("gammaO", "Gamma correction", gammaSliderButtonH, null)
	};
	var modelButtons = {
		60: new Button("ckeckboardM", "Test scene", function(){drawing.setLightParams(6, 5)}, "testModels/checkboard.obj"),
		70: new Button("womanM", "Woman face", function(){drawing.setLightParams(6, 2)}, "testModels/womanText.obj"),
		100: new Button("mbwM", "BMW 3 Series Coupé", function(){drawing.setLightParams(6, 5)}, "testModels/BMW3SeriesCoupe2text.obj")
	};
	
	var previousModelID = null;
	var modelInfo = null;
	
	
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
			// add the gamma slider and a textbox to the page
			gammaSlider = document.createElement("INPUT");
			gammaSlider.setAttribute("type", "range");
			gammaSlider.setAttribute("value", "1");
			gammaSlider.setAttribute("min", "1");
			gammaSlider.setAttribute("max", "3.5");
			gammaSlider.setAttribute("step", "0.1");
			gammaSlider.style.position = "absolute";
			gammaSlider.style.zIndex = "2";
			gammaSlider.style.display = "none";
			document.body.appendChild(gammaSlider);
			
			gammaNum = document.createElement("INPUT");
			gammaNum.setAttribute("type", "text");
			gammaNum.setAttribute("value", "1");
			gammaNum.setAttribute("readonly", "true");
			gammaNum.style.position = "absolute";
			gammaNum.style.zIndex = "2";
			gammaNum.style.display = "none";
			document.body.appendChild(gammaNum);
		}
		
		function load() {
		
			// add the gamma slider and a textbox to the page
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
			gammaSlider.addEventListener("change", gammaSliderH);
			gammaSlider.addEventListener("input", gammaSliderH);
			
			var resizeTimerID;
			var delayedResize = function() {
				clearTimeout(resizeTimerID);
				resizeTimerID = setTimeout(onresize, 500);
			};
			window.addEventListener("resize", delayedResize);
			
			// load first model
			pressButton(60);
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
		
		// Models: top-left
		var x = offset;
		var y = offset;
		c2d.fillStyle = "white";
		c2d.fillText("OBJ Models:", x, y + textSize*0.3);
		c2d.textBaseline = "middle";
		for (var id in modelButtons) {
			
			y += offset;
			
			// draw button
			c2d.fillStyle = (modelButtons[id].pressed) ? "rgb(200, 200, 200)" : "black";
			c2d.strokeStyle = "white";
			c2d.beginPath();
			c2d.arc(x, y, buttonRadius, 0, 2*Math.PI);
			c2d.fill();
			c2d.stroke();
			
			// draw texts
			c2d.fillStyle = "white";
			c2d.fillText(modelButtons[id].text, x + offset*0.8, y);
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
		
		// model info
		x = canv2D.width - offset;
		y = offset;
		c2d.font = (textSize*0.8).toFixed(0) + "px Verdana";
		c2d.textAlign = "end";
		c2d.fillText(modelInfo, x, y);
		
	}
	
	function drawIDAreas() {
		
		// clear
		c2d.fillStyle = "black";
		c2d.fillRect(0, 0, canv2D.width, canv2D.height);
		
		
		// draw modelButtons
		x = offset * 0.5;
		y = offset * 1.5;
		for (var id in modelButtons) {
			
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
	
	function drawBlackScreen(text) {
		
		c2d.save();
		c2d.fillStyle = "black";
		c2d.fillRect(0, 0, canv2D.width, canv2D.height);
		
		if (text) {
			var x = canv2D.width/2;
			var y = canv2D.height/2;
			
			c2d.font = (textSize*2).toFixed(0) + "px Verdana";
			c2d.fillStyle = "white";
			c2d.textAlign = "center";
			c2d.fillText(text, x, y);
		}
		
		c2d.restore();
	}
	
	function gammaSliderButtonH() {
		
		if (this.pressed)	{		// turn on
			this.hiddenText = this.text;
			this.text = "";
			draw();
			gammaSlider.style.display = "block";
			gammaNum.style.display = "block";
		
		} else {					// turn off
			gammaSlider.style.display = "none";
			gammaNum.style.display = "none";
			this.text = this.hiddenText;
			draw();
		}
	}
	
	function gammaSliderH() {
		
		var gamma = parseFloat(gammaSlider.value);
		gammaNum.value = gamma.toFixed(1);
		
		drawing.updateGamma(gamma);
	}
	
	function pressButton(id) {
		
		if (modelButtons[id]) {
			
			// check double selection
			if (id === previousModelID) return;
			
			// show selection
			if (modelButtons[previousModelID])
				modelButtons[previousModelID].pressed = false;
			modelButtons[id].pressed = true;
			previousModelID = id;
			
			// notify loading
			drawBlackScreen("Downloading..");
			
			// action if defined
			if (modelButtons[id].handler) modelButtons[id].handler();
			
			// call loader
			OBJLib.onLoadingStart = function() { drawBlackScreen("Parsing..") };
			OBJLib.onload = onLoadedModel;
			setTimeout( OBJLib.startLoading(modelButtons[id].data), 5);
			
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
	
	function onLoadedModel() {
		
		// finish parsing and save info
		OBJLib.createDataArrays();
		modelInfo = (OBJLib.modelData.indices.length/3).toFixed(0) + " triangles";
		
		// re draw
		draw();
		drawing.load();
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
		gammaSlider.style.top = (canv2D.height-offset-textSize*0.6)+"px";
		gammaSlider.style.left = (offset*2)+"px";
		gammaSlider.style.height = textSize+"px";
		gammaSlider.style.width = textSize*8+"px";
		gammaNum.style.top = (canv2D.height-offset-textSize*0.5)+"px";
		gammaNum.style.left = (offset*2.5 + textSize*8)+"px";
		gammaNum.style.height = textSize+"px";
		gammaNum.style.width = textSize*1.5+"px";
		gammaNum.style.fontSize = textSize+"px";
		
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
		load: load
	}
}();

