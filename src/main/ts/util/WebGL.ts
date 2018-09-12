function webglCreateArrayBuffer(gl: WebGLRenderingContext, data: number[]): WebGLBuffer {
    return webglCreateBuffer(gl, FLAG_USE_GL_CONSTANTS?gl.ARRAY_BUFFER:0x8892, new Float32Array(data));
}

function webglCreateElementArrayBuffer(gl: WebGLRenderingContext, data: number[]): WebGLBuffer {
    // might be able to use Uint8Array since it's unlikely any of our shapes will be bigger than 256 indices
    return webglCreateBuffer(gl, FLAG_USE_GL_CONSTANTS?gl.ELEMENT_ARRAY_BUFFER:0x8893, FLAG_GL_16_BIT_INDEXES?new Uint16Array(data):new Uint8Array(data));
}

function webglCreateBuffer(gl: WebGLRenderingContext, target: number, data: Float32Array | Uint16Array | Uint8Array): WebGLBuffer {
    let buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, FLAG_USE_GL_CONSTANTS?gl.STATIC_DRAW:0x88E4);

    return buffer;
}

function webglBindAttributeBuffer(gl: WebGLRenderingContext, buffer: WebGLBuffer, attribute: number, count: number) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(
        attribute, 
        count, 
        FLAG_USE_GL_CONSTANTS?gl.FLOAT:0x1406, 
        false, 
        0, 
        0
    );
    gl.enableVertexAttribArray(attribute);
}

function webglCreateTexture(gl: WebGLRenderingContext, width: number, height: number, pixels?: ArrayBufferView) {
    let texture = gl.createTexture();
    gl.bindTexture(FLAG_USE_GL_CONSTANTS?gl.TEXTURE_2D:0x0DE1, texture);
    gl.texImage2D(FLAG_USE_GL_CONSTANTS?gl.TEXTURE_2D:0x0DE1, 0, FLAG_USE_GL_CONSTANTS?gl.RGBA:0x1908, width, height, 0,  FLAG_USE_GL_CONSTANTS?gl.RGBA:0x1908, FLAG_USE_GL_CONSTANTS?gl.UNSIGNED_BYTE:0x1401, pixels);
    //gl.texImage2D(FLAG_USE_GL_CONSTANTS?gl.TEXTURE_2D:0x0DE1, 0, FLAG_USE_GL_CONSTANTS?gl.RGBA:0x1908, width, height, 0,  FLAG_USE_GL_CONSTANTS?gl.RGBA:0x1908, FLAG_USE_GL_CONSTANTS?gl.UNSIGNED_INT:5125, pixels);
    gl.texParameteri(FLAG_USE_GL_CONSTANTS?gl.TEXTURE_2D:0x0DE1, FLAG_USE_GL_CONSTANTS?gl.TEXTURE_MIN_FILTER:0x2801, FLAG_USE_GL_CONSTANTS?gl.LINEAR:0x2601);
    gl.texParameteri(FLAG_USE_GL_CONSTANTS?gl.TEXTURE_2D:0x0DE1, FLAG_USE_GL_CONSTANTS?gl.TEXTURE_WRAP_S:0x2802, FLAG_USE_GL_CONSTANTS?gl.CLAMP_TO_EDGE:0x812F);
    gl.texParameteri(FLAG_USE_GL_CONSTANTS?gl.TEXTURE_2D:0x0DE1, FLAG_USE_GL_CONSTANTS?gl.TEXTURE_WRAP_T:0x2803, FLAG_USE_GL_CONSTANTS?gl.CLAMP_TO_EDGE:0x812F);
    return texture;
}

function webglLoadShader(gl: WebGLRenderingContext, type: number, source: string) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if( FLAG_GL_SHOW_SHADER_ERRORS && !gl.getShaderParameter(shader, FLAG_USE_GL_CONSTANTS?gl.COMPILE_STATUS:0x8B81) ) {
        console.error('An error occurred compiling shader', source, gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        throw 'shader compilation error';
    }
    return shader;
}

function webglGetUniformAndAttributeLocations(gl: WebGLRenderingContext, program: WebGLProgram, uniformNames: string[], attributeNames: string[]): {[_:string]: WebGLUniformLocation} {
    let result: {[_:string]: WebGLUniformLocation} = {};
    for( let name of uniformNames ) {
        result[name] = gl.getUniformLocation(program, name);
    }
    for( let name of attributeNames ) {
        result[name] = gl.getAttribLocation(program, name);
    }
    return result;
}