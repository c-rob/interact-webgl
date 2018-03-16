// WebGL initialization functions

WebGLInit = function() {
	
	/**
	*	Creates a program with the two shaders (VS, FS) and make it current
	*	@param {WebGLRenderingContext} gl The WebGL context
	*	@param {string} vshaderS The vertex shader source
	*	@param {string} fshaderS The fragment shader source
	*/
	var initShaders = function(gl, vshaderS, fshaderS) {
		
		var program = createProgram(gl, vshaderS, fshaderS);
		
		gl.useProgram(program);
		gl.program = program;
	};
	
	
	
	
	
	/**
	*	Creates and links the vertex and fragment shaders into the program
	*	@param {WebGLRenderingContext} gl The WebGL context
	*	@param {string} vshaderS The vertex shader source
	*	@param {string} fshaderS The fragment shader source
	*	@return {WebGLProgram} The created program object
	*/
	var createProgram = function(gl, vshaderS, fshaderS) {
		
		// create shader objects
		var vertexShader = loadShader(gl, gl.VERTEX_SHADER, vshaderS);
		var fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fshaderS);
		if (!vertexShader || !fragmentShader) {
			throw "Failed to compile shaders";
		}
		
		// create a program object
		var program = gl.createProgram();
		if (!program) {
			throw "Failed to create a program object";
		}
		
		// attach the shaders
		gl.attachShader(program, vertexShader);
		gl.attachShader(program, fragmentShader);
		
		// link the program object
		gl.linkProgram(program);
		
		
		// Check the result of linking
		var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
		if (!linked) {
			var error = gl.getProgramInfoLog(program);
			gl.deleteProgram(program);
			gl.deleteShader(fragmentShader);
			gl.deleteShader(vertexShader);
			throw ('Failed to link program: ' + error);
		}
		
		return program;
	};
	
	
	/**
	*	Creates the chosen shader object and compile its source
	*	@param {WebGLRenderingContext} gl The WebGL context
	*	@param {number} type The enum value for the shader to create
	*	@param {string} source The source to be compiled
	*	@return {WebGLShader} The created shader object, or null in case of fail
	*/
	var loadShader = function(gl, type, source) {
		
		// create the shader object
		var shader = gl.createShader(type);
		if (!shader) {
			console.log("Failed to create shader");
			return null;
		}
		
		// set the source
		gl.shaderSource(shader, source);
		
		// compile
		gl.compileShader(shader);
		
		// check the compilation
		var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
		if (!compiled) {
			var error = gl.getShaderInfoLog(shader);
			console.log('Failed to compile shader: ' + error);
			gl.deleteShader(shader);
			return null;
		}
		
		return shader;
	};
	
	
	
	return {
		initShaders: initShaders,
		createProgram: createProgram
	}
	
}();