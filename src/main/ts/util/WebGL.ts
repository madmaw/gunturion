function webglCreateArrayBuffer(gl: WebGLRenderingContext, data: number[]): WebGLBuffer {
    return webglCreateBuffer(gl, gl.ARRAY_BUFFER, new Float32Array(data));
}

function webglCreateElementArrayBuffer(gl: WebGLRenderingContext, data: number[]): WebGLBuffer {
    // might be able to use Uint8Array since it's unlikely any of our shapes will be bigger than 256 indices
    return webglCreateBuffer(gl, gl.ELEMENT_ARRAY_BUFFER, FLAG_GL_16_BIT_INDEXES?new Uint16Array(data):new Uint8Array(data));
}

function webglCreateBuffer(gl: WebGLRenderingContext, target: number, data: Float32Array | Uint16Array | Uint8Array): WebGLBuffer {
    let buffer = gl.createBuffer();
    gl.bindBuffer(target, buffer);
    gl.bufferData(target, data, gl.STATIC_DRAW);

    return buffer;
}

function webglBindAttributeBuffer(gl: WebGLRenderingContext, buffer: WebGLBuffer, attribute: number, count: number) {
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(
        attribute, 
        count, 
        gl.FLOAT, 
        false, 
        0, 
        0
    );
    gl.enableVertexAttribArray(attribute);
}

function webglCreateTexture(gl: WebGLRenderingContext, width: number, height: number) {
    let texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,  gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    return texture;
}

function webglLoadShader(gl: WebGLRenderingContext, type: number, source: string) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if( FLAG_GL_SHOW_SHADER_ERRORS && !gl.getShaderParameter(shader, gl.COMPILE_STATUS) ) {
        console.error('An error occurred compiling shader', source, gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        throw 'shader compilation error';
    }
    return shader;
}