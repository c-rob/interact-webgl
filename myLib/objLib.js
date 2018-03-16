// Roberto C. 27/08/2016

"use strict";

/**
*	This library contains functions that allows loading of models
*	described in OBJ files. A JavaScript Object is built with the
*	infomrations of the model. Only basic mesh description are supported.
*	To use it, it is sufficient to assign the end loading function handle in onload 
*	and then call 'startLoading'. 
*	Once parsing is finished the object 'OBJLib.model' contains all objects
*	in the 'objects' member (a list).
*	A call to 'createDataArrays' creates the Float32Array needed by WebGL:
*	OBJLib.modelData = {
*		indices: ,			3-Uint32 per triangle
*		vertices: ,			3-Float32 per vertex
*		normals: ,			3-Float32 per vertex
*		materialKa: ,		1-Float32 per vertex
*		materialKd: ,		3-Float32 per vertex
*		materialKs: ,		3-Float32 per vertex
*		materialNs: 		1-Float32 per vertex
*	};
*	@namespace
*/
var OBJLib = {};


/**
*	This member will contain the model when ready. Type of {OBJLib.Model}
*	@memberof OBJLib
*/
OBJLib.model = null;


/**
*	This member will contain the Float32Array to pass to WebGL. Created
*	on call of 'createDataArrays'.
*	@memberof OBJLib
*/
OBJLib.modelData = null;


/**
*	This member will contain the list of materials used.
*	@memberof OBJLib
*/
OBJLib.materials = null;


/**
*	If bound, this function is called when parsing begins.
*	@memberof OBJLib
*/
OBJLib.onLoadingStart = null;


/**
*	This function is called when a file loading completes.
*	@memberof OBJLib
*/
OBJLib.onload = null;


/**
*	Synchronization member. This is the counter of how many files are still parsing.
*/
OBJLib.missingFiles = 0;


/**
*	Start loading of obj file.
*	@param {string} fileName The path of the .obj file to load
*	@param {number} scale The scale of the entire file
*
*	@function startLoading
*	@memberof OBJLib
*/
OBJLib.startLoading = function (fileName, scale) {
	
	if (scale == undefined) {
		scale = 1;
	}
	
	// check that onload is bound
	if (OBJLib.onload === null) {
		throw "onload function call is not defined.";
	}
	
	// find file folder
	var path = fileName.slice(0, fileName.lastIndexOf("/") + 1);
	
	// start browser loading
	OBJLib.missingFiles = 1;
	newXMLHttpRequest(fileName, OBJLib.parseObjFile, path, scale);		// (path, callback, ..)
};


/**
*	Main parse function of the obj file. Only basic mesh descriptions and mtl declaration are allowed.
*	OBJLib.model will contain the informations.
*	@param {string} text The content of the file
*	@param {string} path The position in which the loaded file is located
*	@param {number} scale The scale of the entire file
*
*	@function parseObjFile
*	@memberof OBJLib
*/
OBJLib.parseObjFile = function(text, path, scale) {
	
	// notify parsing started if needed
	if (OBJLib.onLoadingStart) {
		OBJLib.onLoadingStart();
	}
	
	// create an empty model
	var mod = new OBJLib.Model();
	
	// initializations
	var lines = text.split("\n");
	var linesLen = lines.length;
	var parser = new OBJLib.Parser();
	var object = new OBJLib.Object();
	var smoothing = false;
	
	// parse all lines
	for (var i = 0; i < linesLen; ++i) {
		
		// set this line
		parser.init(lines[i]);
		
		var keyword = parser.getWord();
		switch (keyword) {
			case "#":	// comments are ignored
			break;
			
			case "mtllib":	// .mtl file used
			OBJLib.missingFiles++;
			newXMLHttpRequest(path + parser.getWord(), OBJLib.parseMtlFile);
			break;
			
			case "o":	// new object
			case "g":	// new sub-object
			object = new OBJLib.Object(parser.getWord());
			mod.objects.push(object);
			break;
			
			case "v":	// add vertex to the list
			var x = parseFloat(parser.getWord()) * scale;
			var y = parseFloat(parser.getWord()) * scale;
			var z = parseFloat(parser.getWord()) * scale;
			mod.vertices.push(new OBJLib.Vertex(x, y, z));
			break;
			
			case "vn":	// add normal to the list
			var x = parseFloat(parser.getWord());
			var y = parseFloat(parser.getWord());
			var z = parseFloat(parser.getWord());
			mod.normals.push((new OBJLib.Normal(x, y, z)).normalize());
			break;
			
			case "f":	// parse face and add to the object
			var face = OBJLib.parseFace(parser);
			if (smoothing) {
				object.sFaces.push(face);
			} else {
				object.faces.push(face);
			}
			break;
			
			case "s":	// smoothing enabled
			smoothing = (parser.getWord() == "off") ? false : true;
			break;
			
			case "usemtl":	// new object necessary for each material
			var mtlName = parser.getWord();
			if ((new OBJLib.Parser(lines[i-1]).getWord()) != "g") {
				object = new OBJLib.Object(object.name + "_" + mtlName);
				mod.objects.push(object);
			}
			object.material = mtlName;
			break;
			
			default:
			break;
		}
	}
	
	// assign model and notify ending
	OBJLib.model = mod;
	OBJLib.modelData = null;
	
	// operation finished
	if (--OBJLib.missingFiles === 0) {
		OBJLib.onload();
	}
};


/**
*	This function parse the text of the .mtl file and save material
*	descriptions into the OBJLib.materials object. Material are saved
*	as key-value pairs where their keys are the mtl names.
*	The content of the materials is an object whose member names are the 
*	material properties (Ka, Kd, ..). Only few basic parameters are parsed.
*	Only RGB space allowed.
*	@param {string} text The text of the loaded .mtl file
*/
OBJLib.parseMtlFile = function(text) {
	
	// get the material list
	if (!OBJLib.materials) {
		OBJLib.materials = {};
	}
	var materials = OBJLib.materials;
	
	// write defaultMtl properties
	materials["defaultMtl"] = new OBJLib.Material();
	
	// initializations
	var lines = text.split("\n");
	var linesLen = lines.length;
	var parser = new OBJLib.Parser();
	
	for (var i = 0; i < linesLen; ++i) {
		
		// parse i-th line
		parser.init(lines[i]);
		
		var keyword = parser.getWord();
		switch (keyword) {
			case "#":	// comments are ignored
			break;
			
			case "newmtl":	// new material defined
			var material = new OBJLib.Material();
			materials[parser.getWord()] = material;
			break;
			
			case "Ka":		// ambient light object color
			var r = parseFloat(parser.getWord());
			var g = parseFloat(parser.getWord());
			var b = parseFloat(parser.getWord());
			material.Ka = [r, g, b];
			break;
			
			case "Kd":		// diffuse light object color
			var r = parseFloat(parser.getWord());
			var g = parseFloat(parser.getWord());
			var b = parseFloat(parser.getWord());
			material.Kd = [r, g, b];
			break;
			
			case "Ks":		// specular light object color
			var r = parseFloat(parser.getWord());
			var g = parseFloat(parser.getWord());
			var b = parseFloat(parser.getWord());
			material.Ks = [r, g, b];
			break;
			
			case "Ns":		// specular exponent
			material.Ns = parseFloat(parser.getWord());
			break;
			
			case "illum":	// illumination model
			material.illum = parseInt(parser.getWord());
			break;
			
			default:
			break;
		}
	}
	
	// operation finished
	if (--OBJLib.missingFiles === 0) {
		OBJLib.onload();
	}
};


/**
*	This function returns a OBJLib.Face object containig the indices of vertices
*	and normals it is composed. Texture coordinates are ignored. Normals always specified.
*	@param {OBJLib.Parser} parser The initialized string parser
*	@return {OBJLib.Face} The face created
*/
OBJLib.parseFace = function(parser) {
	
	var face = new OBJLib.Face();
	
	// illimited vertices per face
	while (true) {
		var word = parser.getWord();
		
		// end of line
		if (word == null) break;
		
		var subWords = word.split("/");
		if (subWords.length >= 3) {
			var vI = parseInt(subWords[0]) - 1;
			face.vInd.push(vI);
			var nI = parseInt(subWords[2]) - 1;
			face.nInd.push(nI);
		} else {
			throw "Normals not specified";
		}
	}
	
	return face;
};


/**
*	This function creates the Float32Array WebGL needs in 'modelData' member.
*	Smooth faces share common vertices: these will be indexed but not duplicated
*	for each triangle. In the first part of the vertex buffers there are a number of 'sizeDiVerts'
*	of distinct vertices. The last part contains 'sizeShVerts' of vertices shared between different trinagles.
*	Attribute buffer type is Float32Array.
*	Indices buffer type is Uint32Array.
*	@param {boolean} keepModel If true, the model in OBJLib.model is not deleted to free space in memory
*	@function createDataArrays
*	@memberof OBJLib
*/
OBJLib.createDataArrays = function() {
	
	function writeVertexInfo(dataArray, index, vector) {
		dataArray[index + 0] = vector.x;
		dataArray[index + 1] = vector.y;
		dataArray[index + 2] = vector.z;
	}
	
	function writeColorInfo(colorArray, index, color) {
		colorArray[index + 0] = color[0];
		colorArray[index + 1] = color[1];
		colorArray[index + 2] = color[2];
	}
	
	function writeCoeffInfo(KaArray, index, K) {
		KaArray[index] = K;
	}
	
	return (function(keepModel) {
		
		// first step: buffer sizes and shared vertex array (of smooth faces)
		
		var sizeInd = 0;		// length of indices buffer
		var sizeShVerts = 0;	// number of shared vertices
		var sizeDiVerts = 0;	// number of distinct vertices
		
		// sharedVerts plays an important role on space optimization.
		// 	It is a map that allows every vertex to be written only 1 time
		//	(provaided that all attributes are the same). All needed informations
		//	can be accessed in the array through the vertex index number 'vInd'.
		//	[..: {linInd: .. , nInd: .. , mtlID: ".."}]
		var sharedVerts = [];
		var linInd = 0;		// linear index of shared vertices
		
		// determine the lengths and populate sharedVerts
		var objsList = OBJLib.model.objects;
		for (var i = 0; i < objsList.length; ++i) {
			var facesList = objsList[i].faces;
			for (var j = 0; j < facesList.length; ++j) {
				sizeInd += facesList[j].vInd.length - 2;		// indices of faces
				sizeDiVerts += facesList[j].vInd.length - 2;	// number if distinctVerts
			}
			
			var sFacesList = objsList[i].sFaces;
			for (var j = 0; j < sFacesList.length; ++j) {
				var vInd = sFacesList[j].vInd;
				sizeInd += vInd.length - 2;					// indices of smooth faces
				
				for (var k = 0; k < vInd.length; ++k) {
					if (!sharedVerts[vInd[k]]) {
						sharedVerts[vInd[k]] = {
							linInd: linInd++,
							nInd: sFacesList[j].nInd[k],
							mtlID: objsList[i].material
						};
						sizeShVerts++;
					}
				}
			}
		}
		sizeInd *= 3;
		sizeDiVerts *= 3;
		
		// second step: create typed arrays
		var indices = new Uint32Array(sizeInd);
		var vertices = new Float32Array((sizeDiVerts + sizeShVerts) * 3);
		var normals = new Float32Array((sizeDiVerts + sizeShVerts) * 3);
		var materialKd = new Float32Array((sizeDiVerts + sizeShVerts) * 3);
		var materialKs = new Float32Array((sizeDiVerts + sizeShVerts) * 3);
		var materialKa = new Float32Array(sizeDiVerts + sizeShVerts);		// only 1 coeff per vertex
		var materialNs = new Float32Array(sizeDiVerts + sizeShVerts);
		var iI = 0;					// indices linear index
		var vI = 0;					// vertex attributes linear index
		
		// third step: write data into array from the model
		var modVerts = OBJLib.model.vertices;
		var modNorms = OBJLib.model.normals;
		for (var i = 0; i < objsList.length; ++i) {  // for each object
			var objMtl = OBJLib.materials[ objsList[i].material ];
			
			// distinct verts: split into triagles
			var facesList = objsList[i].faces;
			for (var j = 0; j < facesList.length; ++j) {  // for each face
				var vertInd = facesList[j].vInd;
				var normInd = facesList[j].nInd;
				
				for  (var k = 2; k < vertInd.length; ++k) {  // for each triangle
					
					// 1st vert (always 0 as a triangle fan)
					indices[iI] = vI;
					writeVertexInfo(vertices, vI * 3, modVerts[ vertInd[0] ]);
					writeVertexInfo(normals, vI * 3, modNorms[ normInd[0] ]);
					writeColorInfo(materialKd, vI * 3, objMtl.Kd);
					writeColorInfo(materialKs, vI * 3, objMtl.Ks);
					writeCoeffInfo(materialKa, vI, objMtl.Ka[0]);
					writeCoeffInfo(materialNs, vI, objMtl.Ns);
					iI++;
					vI++;
					
					// 2nd vert
					indices[iI] = vI;
					writeVertexInfo(vertices, vI * 3, modVerts[ vertInd[k-1] ]);
					writeVertexInfo(normals, vI * 3, modNorms[ normInd[k-1] ]);
					writeColorInfo(materialKd, vI * 3, objMtl.Kd);
					writeColorInfo(materialKs, vI * 3, objMtl.Ks);
					writeCoeffInfo(materialKa, vI, objMtl.Ka[0]);
					writeCoeffInfo(materialNs, vI, objMtl.Ns);
					iI++;
					vI++;
					
					// 2nd vert
					indices[iI] = vI;
					writeVertexInfo(vertices, vI * 3, modVerts[ vertInd[k] ]);
					writeVertexInfo(normals, vI * 3, modNorms[ normInd[k] ]);
					writeColorInfo(materialKd, vI * 3, objMtl.Kd);
					writeColorInfo(materialKs, vI * 3, objMtl.Ks);
					writeCoeffInfo(materialKa, vI, objMtl.Ka[0]);
					writeCoeffInfo(materialNs, vI, objMtl.Ns);
					iI++;
					vI++;
				}
			}
			
			// shared verts: indexing and copying shared verts (data can be overwritten multiple times)
			var sFacesList = objsList[i].sFaces;
			for (var j = 0; j < sFacesList.length; ++j) {  // for each face
				var vInd = sFacesList[j].vInd;
				var nInd = sFacesList[j].nInd;
				
				for  (var k = 2; k < vInd.length; ++k) {  // for each triangle
				
					// 1st vert (always 0 as a triangle fan)
					var vShI = sizeDiVerts + sharedVerts[vInd[0]].linInd;	// aux: vertex index of the array buffers
					var normInd = sharedVerts[vInd[0]].nInd;				// aux: norm index in the model
					indices[iI++] = vShI;
					writeVertexInfo(vertices, vShI * 3, modVerts[ vInd[0]] );
					writeVertexInfo(normals, vShI * 3, modNorms[ normInd ] );
					writeColorInfo(materialKd, vShI * 3, objMtl.Kd);
					writeColorInfo(materialKs, vShI * 3, objMtl.Ks);
					writeCoeffInfo(materialKa, vShI, objMtl.Ka[0]);
					writeCoeffInfo(materialNs, vShI, objMtl.Ns);
					
					// 2nd vert
					var vShI = sizeDiVerts + sharedVerts[vInd[k-1]].linInd;	// aux: vertex index of the array buffers
					var normInd = sharedVerts[vInd[k-1]].nInd;				// aux: norm index in the model
					indices[iI++] = vShI;
					writeVertexInfo(vertices, vShI * 3, modVerts[ vInd[k-1]] );
					writeVertexInfo(normals, vShI * 3, modNorms[ normInd ] );
					writeColorInfo(materialKd, vShI * 3, objMtl.Kd);
					writeColorInfo(materialKs, vShI * 3, objMtl.Ks);
					writeCoeffInfo(materialKa, vShI, objMtl.Ka[0]);
					writeCoeffInfo(materialNs, vShI, objMtl.Ns);
					
					// 3rd vert
					var vShI = sizeDiVerts + sharedVerts[vInd[k]].linInd;	// aux: vertex index of the array buffers
					var normInd = sharedVerts[vInd[k]].nInd;				// aux: norm index in the model
					indices[iI++] = vShI;
					writeVertexInfo(vertices, vShI * 3, modVerts[ vInd[k]] );
					writeVertexInfo(normals, vShI * 3, modNorms[ normInd ] );
					writeColorInfo(materialKd, vShI * 3, objMtl.Kd);
					writeColorInfo(materialKs, vShI * 3, objMtl.Ks);
					writeCoeffInfo(materialKa, vShI, objMtl.Ka[0]);
					writeCoeffInfo(materialNs, vShI, objMtl.Ns);
				}
			}
		}
		
		// assign arrays and save space deleting objects
		OBJLib.modelData = {};
		OBJLib.modelData.indices = indices;
		OBJLib.modelData.vertices = vertices;
		OBJLib.modelData.normals = normals;
		OBJLib.modelData.materialKa = materialKa;
		OBJLib.modelData.materialKd = materialKd;
		OBJLib.modelData.materialKs = materialKs;
		OBJLib.modelData.materialNs = materialNs;
		if (!keepModel) {
			OBJLib.materials = null;
			OBJLib.model = null;
		}
	});
}();


/**
*	Parser contructor. The string passed as argument is ready to be parsed
*	by this object. Initial index value is 0.
*	@param {string} text The text to parse
*	@constructor
*	@classdesc
*	This object can read words in the string
*/
OBJLib.Parser = function(text) {
	this.text = text;
	this.index = 0;
};


/**
*	Changes the string to parse
*	@param {string} text Text to parse
*/
OBJLib.Parser.prototype.init = function(text) {
	this.text = text;
	this.index = 0;
};


/**
*	Ignores all non alphanumeric chars. Step forward
*/
OBJLib.Parser.prototype.skipDelimiters = function() {
	var s = this.text;
	for (var i = this.index, len = s.length; i < len; i++) {
		var c = s.charAt(i);
		
		if (c == '\t'|| c == ' ' || c == '(' || c == ')' || c == '"') continue;
		break;
	}
	this.index = i;
};

/**
*	Returns a word from the current position on the text
*	@return {string} The first word found
*/
OBJLib.Parser.prototype.getWord = function() {
	
	var s = this.text;
	
	// skip spaces
	this.skipDelimiters();
	
	// count word length
	for (var i = this.index, len = s.length; i < len; i++) {
		var c = s.charAt(i);
		if (c == '\t'|| c == ' ' || c == '(' || c == ')' || c == '"') break;
	}
	var n = i - this.index;	// the length
	if (n === 0) return null;
	
	var word = s.substr(this.index, n);
	this.index += (n + 1);
	
	return word;
}


/**
*	Model constructor. If a list of objects is passed as argument 
*	this will be initialized with them.
*	@param {array} list Optional list of OBJLib.Object
*	@constructor
*	@classdesc
*	The object stored in OBJLib.model will be of this class. The model
*	contains several OBJLib.Object in a list on 'objects'.
*	model.vertices, model.normals are lists of 'Vertex' and 'Normal' 
*	faces point to.
*/
OBJLib.Model = function(list) {
	this.objects = [];
	this.vertices = [];
	this.normals = []; 
	
	if (Object.prototype.toString.call(list) === "[object Array]"
		&& list.length > 0 && list[0] instanceof OBJLib.Object) {
		this.objects = list;
	}
};


/**
*	Object constructor.
*	@param {string} name The name of the object
*	@constructor
*	@classdesc
*	Objects contained in models. Objects contain:
*	name, list of faces, list of smooth faces.
*/
OBJLib.Object = function(name) {
	this.name = name;
	this.faces = [];
	this.sFaces = [];
	this.material = "defaultMtl";
};


/**
*	Face constructor
*	@param {array} vInd The indices of the OBJLib.model.vertices array
*	@param {array} nInd The indices of the OBJLib.model.normals array
*	@constructor
*	@classdesc
*	Faces contained in objects. Members are indices of vertices, normals lists.
*/
OBJLib.Face = function(vInd, nInd) {
	this.vInd = [];
	this.nInd = [];
	
	
	if (vInd) {
		this.vInd = vInd;
		
		if (nInd) {
			this.nInd = nInd;
		}
	}
};


/**
*	Vertex constructor
*	@param {number} x The X coordinate of the vertex.
*	@param {number} y The Y coordinate of the vertex.
*	@param {number} z The Z coordinate of the vertex.
*	@constructor
*	@classdesc
*	This is the class of OBJLib.model.vertices list
*/
OBJLib.Vertex = function(x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
};

/**
*	Normal constructor
*	@param {number} x The X component of the normal.
*	@param {number} y The Y component of the normal.
*	@param {number} z The Z component of the normal.
*	@constructor
*	@classdesc
*	This is the class of OBJLib.model.normals list
*/
OBJLib.Normal = function(x, y, z) {
	this.x = x;
	this.y = y;
	this.z = z;
};

/**
*	Normalize utility
*	@return {OBJLib.Normal} this
*/
OBJLib.Normal.prototype.normalize = function() {
	
	var normInv = 1 / Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
	
	this.x *= normInv;
	this.y *= normInv;
	this.z *= normInv;
	
	
	var norm = Math.sqrt(this.x*this.x + this.y*this.y + this.z*this.z);
	if (norm >= 1.001 || norm <= 0.9999) {
		throw ("Coglione! : " + norm);
	}
	
	return this;
};


/**
*	Material constructor.
*	Initialized to "defaultMtl".
*	@constructor
*	@classdesc
*	This is the class of OBJLib.materials list
*/
OBJLib.Material = function() {
	this.Ka = [1, 1, 1];
	this.Kd = [0.5, 0.5, 0.5];
	this.Ks = [0, 0, 0];
	this.Ns = 150;
	this.illum = 1;
};


/**
*	Global utility function that send a GET call of a desired file.
*	The callback is called when the request completes with succeess.
*	The passed arguments are: [responseText, ..]. Where .. denotes the eventual
*	optional parameters needed by the callback function that can be specified
*	passing them as arguments of 'newXMLHttpRequest' after url and callback.
*	@param {string} url The file to request
*	@param {function} callback The callback function on success.
*/
function newXMLHttpRequest(url, callback) {
	
	// get the optional arguments to pass to callback
	var argsArray = Array.from(arguments);
	argsArray = argsArray.slice(2);
	
	// do the request
	var request = (window.XMLHttpRequest) ? (new XMLHttpRequest()) : (new ActiveXObject("Microsoft.XMLHTTP"));
	
	request.onreadystatechange = function() {
		if (request.readyState === 4 && request.status === 200) {
			if (callback) {
				argsArray.unshift(request.responseText);	// args: [responseText, ..]
				callback.apply(this, argsArray);
			} else {
				throw "Callback not defined in newXMLHttpRequest()";
			}
		}
	};
	request.open("GET", url, true);
	request.send();
}

