



function initTest() {

    let vertexShaderSource = `
        precision highp float;
        attribute vec3 aVertexPosition;
        attribute vec3 aBarrycentricCoordinate;
        uniform vec3 uViewPosition;
        uniform float uVertexOffsetAbsolute;    
        uniform mat4 uModelMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uPreviousViewMatrix;
        uniform mat4 uProjectionMatrix;
        varying vec3 vBarrycentricCoordinate;
        varying vec3 vRelativePosition;
        varying vec2 vGridCoordinate;
        varying vec4 vScreenCoordinate;
        void main() {
            vec4 adjustedVertexPosition = vec4(aVertexPosition, 1.0);
            vec4 vertexPosition = uModelMatrix * adjustedVertexPosition;
            vec4 relativeVertexPosition = uViewMatrix * vertexPosition;
            vec4 screenPosition = uProjectionMatrix * relativeVertexPosition;
            
            vBarrycentricCoordinate = aBarrycentricCoordinate;
            vRelativePosition = relativeVertexPosition.xyz;
            vGridCoordinate = vertexPosition.xz;
            vScreenCoordinate = uProjectionMatrix * uPreviousViewMatrix * vertexPosition;
            gl_Position = screenPosition;
        }
    `;
    let fragmentShaderSource = `
        #extension GL_OES_standard_derivatives : enable
        precision highp float;
        uniform vec3 uFillColor;
        uniform vec3 uNearFillColor;
        uniform vec3 uLineColor;
        uniform float uLineWidth;
        uniform vec3 uFogColor;
        uniform float uMinFogDistance;
        uniform float uMaxFogDistance;
        uniform float uMinNearDistance;
        uniform float uMaxNearDistance;
        uniform sampler2D uPrevious;
        uniform vec2 uPreviousDimension;
        uniform bool uBlurHorizontal;
        varying vec3 vBarrycentricCoordinate;
        varying vec3 vRelativePosition;
        varying vec2 vGridCoordinate;
        varying vec4 vScreenCoordinate;
        float myfloor(float f) {
            //float c = ceil(f) - 1.0;
            // if( c > f ) {
            //     c--;
            // }
            //return 0.0;
            for( float c = 10.0; c>0.0; c-- ) {
                if( c < f ) {
                    return c;
                }
            }
            return 0.0;
        }
        float edgeFactor(float distance){
            //vec3 f = ceil(vBarrycentricCoordinate) - 1.0;
            vec3 f = vec3(myfloor(vBarrycentricCoordinate.x), myfloor(vBarrycentricCoordinate.y), myfloor(vBarrycentricCoordinate.z));
            
            vec3 b = vBarrycentricCoordinate - f;
            vec3 d = fwidth(b);
            vec3 a3 = smoothstep(vec3(0.0), d*uLineWidth, b);
            //return min(min(a3.x, a3.y), a3.z);
            if( any(lessThan(b, vec3(0.02))) ) {
                return 0.0;
            } else {
                return 1.0;
            }
        }
        float getLightness(vec3 color) {
            float mx = max(max(color.r, color.g), color.b);
            float mn = min(min(color.r, color.g), color.b);
            return (mx + mn)/2.;
        }
        vec4 getSampleColor(in vec4 currentColor, in vec2 screenCoordinate, in float i, inout float count) {
            
            vec4 previousColor = texture2D(uPrevious, screenCoordinate);
            // float d = (5.-i)/25.;
            
            // return previousColor * d;
            // if( previousColor.a > 0. ) {
            //     float currentLightness = getLightness(currentColor.rgb);
            //     float previousLightness = getLightness(previousColor.rgb);
            //     if( currentLightness < previousLightness) {
            //         float diff = previousLightness - currentLightness;
            //         count += .7;
            //         return previousColor + diff * (currentColor - previousColor);
            //     } else {
            //         return vec4(0.);
            //     }                
            // } else {
            //     return vec4(0.);
            // }
            float amt = (previousColor.a  - currentColor.a+ 1.) /2.;
            //float amt = max(currentColor.a - previousColor.a, 0.);
            count += amt * (.3 + currentColor.a/2.);
            return mix(currentColor, previousColor, amt);
        }
        void main() {
            float distanceSquared = vRelativePosition.x*vRelativePosition.x+vRelativePosition.y*vRelativePosition.y+vRelativePosition.z*vRelativePosition.z;
            float distance = sqrt(distanceSquared);
            float maxFogDistanceSquared = uMaxFogDistance * uMaxFogDistance;
            //float fogginess = min(1.0, max(0.0, (uMaxFogDistance-distance) / (uMaxFogDistance - uMinFogDistance)));
            float fogginess = min(1.0, max(0.0, (maxFogDistanceSquared-distanceSquared) / maxFogDistanceSquared));
            if( distance > uMaxFogDistance ) {
                fogginess = 0.0;
            }
            float nearness = min(1.0, max(0.0, (uMaxNearDistance-distance) / (uMaxNearDistance - uMinNearDistance)));
            //float lineness = min(1.0, max(0.0, (uMaxFogDistance-distance) / uMaxFogDistance));
            float lineness = 0.0;
            float edgeness = 1.0;
            float mn = min(vGridCoordinate.x - floor(vGridCoordinate.x), vGridCoordinate.y - floor(vGridCoordinate.y));
            float mx = max(vGridCoordinate.x - floor(vGridCoordinate.x), vGridCoordinate.y - floor(vGridCoordinate.y));
            // fan out distant grid lines
            //float lineWidth = max(uLineWidth, (distance - uMaxNearDistance) / (uMaxFogDistance - uMaxNearDistance));
            float lineWidth = uLineWidth;
            if( mn < lineWidth || mx > (1.0 - lineWidth) ) {
                //edgeness = clamp(min((mn - uLineWidth)/(lineWidth - uLineWidth), (1.0 - mx - uLineWidth)/(lineWidth - uLineWidth)), 0.0, 1.0);
                float m = min(mn, 1.0 - mx);
                edgeness = m / lineWidth * (1.0 - max(0.0, (distance - uMinFogDistance)/(uMaxFogDistance-uMinFogDistance)))*(1.0 - lineWidth * 1.1) + lineWidth * 1.1;
                edgeness *= edgeness * edgeness;
                //edgeness = (1.0 - 1.0/lineWidth);
                //edgeness = 0.0;
            }
            vec2 textureCoordinate = (vScreenCoordinate.xy/vScreenCoordinate.w)/2. + .5;
            //vec4 current = vec4(mix(uFogColor, mix(mix(uLineColor, uFillColor, lineness), mix(uFillColor, uNearFillColor, nearness), edgeness), fogginess), alpha);
            //vec4 current = vec4(mod(abs(vScreenCoordinate.x), 1.0), mod(abs(vScreenCoordinate.y), 1.0), mod(abs(vScreenCoordinate.z), 1.0), 1.0);
            //vec4 current = vec4(mod(abs(vScreenCoordinate.xy/vScreenCoordinate.w), vec2(1.0)), 0.0, 1.0);
            //vec4 current = vec4(mix(uFogColor, mix(mix(uLineColor, uFillColor, lineness), mix(uFillColor, uNearFillColor, nearness), edgeness), fogginess), alpha);
            vec4 current = vec4(mix(mix(uLineColor, uFillColor, lineness), mix(uFillColor, uNearFillColor, nearness), edgeness), fogginess);
            // blur
            float count = 0.;
            vec4 previous = getSampleColor(current, textureCoordinate, 0., count);
            for( int i=1; i<7; ++i ) {
                float f = float(i*i+3)/2.;
                //float f = float(i);
                previous += getSampleColor(current, textureCoordinate + vec2(uPreviousDimension.x, 0.) * f, f, count);
                previous += getSampleColor(current, textureCoordinate - vec2(uPreviousDimension.x, 0.) * f, f, count);
                previous += getSampleColor(current, textureCoordinate + vec2(0., uPreviousDimension.y) * f, f, count);
                previous += getSampleColor(current, textureCoordinate - vec2(0., uPreviousDimension.y) * f, f, count);
            }
            if( count > 0. ) {
                previous /= count;
                current = vec4(mix(current.rgb, previous.rgb, .55), current.a);
            }
            gl_FragColor.rgba = current;
            //gl_FragColor = current;
            //edgeness = edgeFactor(distance);
        
        }
    `;




    let d = 100;
    let t = 5;
    let canvas = document.getElementById('a') as HTMLCanvasElement;
    //let canvas = document.createElement('canvas');

    let backgroundCanvas = document.getElementById('b') as HTMLCanvasElement;
    
    backgroundCanvas.className = 'v';

    canvas.width = backgroundCanvas.width = window.innerWidth;
    canvas.height = backgroundCanvas.height = window.innerHeight;
    
    let gl = canvas.getContext('webgl');
    let bgContext = backgroundCanvas.getContext('2d');

    console.log(gl.getSupportedExtensions());
    gl.getExtension('OES_standard_derivatives');
    let ext = gl.getExtension('EXT_blend_minmax');

    function loadShader(type: number, source: string) {
        let shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if( !gl.getShaderParameter(shader, gl.COMPILE_STATUS) ) {
            console.error('An error occurred compiling shader', source, gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            throw 'shader compilation error';
        }
        return shader;
    }

    function initShaderProgram(fragmentShaderSource: string, vertexShaderSource) {

        let vertexShader = loadShader(gl.VERTEX_SHADER, vertexShaderSource);
        let fragmentShader = loadShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

        let shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);

        if( !gl.getProgramParameter(shaderProgram, gl.LINK_STATUS) ) {
            console.error('An error occurred linking program', gl.getProgramInfoLog(shaderProgram));
            throw 'program link error';
        }

        return shaderProgram;

    }

    function initBuffers() {
        let positions = [
            // Front face
            0, 0, 0,
            t, 0, 0,
            t, 0, t,
            0, 0, t,
    
        ];
        let positionBuffer = webglCreateArrayBuffer(gl, positions);

        let barrycentricCoordinates = [
            // front face
            // t, t, 0, 
            // 0, t, 0, 
            // 0, t, t, 
            // 0, t, 0,
            1, 0, 0, 
            0, 1, 0, 
            0, 0, 1, 
            0, 1, 0,

            // 1, 1, 0, 
            // 0, 1, 1, 
            // 0, 1, 1, 
            // 1, 1, 0,
        ];
        let barrycentricCoordinatesBuffer = webglCreateArrayBuffer(gl, barrycentricCoordinates);

        // This array defines each face as two triangles, using the
        // indices into the vertex array to specify each triangle's
        // position.
        const indices = [
            0,  1,  2,      0,  2,  3,    // front
        ];

        // Now send the element array to GL
        // const indexBuffer = gl.createBuffer();
        // gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        // gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
        const indexBuffer = webglCreateElementArrayBuffer(gl, indices);

        const lineIndices = [
            0, 1, 1, 2, 2, 3, 3, 0,
            4, 5, 5, 6, 6, 7, 7, 4, 
            4, 0, 
            5, 3, 
            6, 2, 
            7, 1
        ];
        const lineIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, lineIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(lineIndices), gl.STATIC_DRAW);

        return {
            position: positionBuffer,
            barrycentricCoordinates: barrycentricCoordinatesBuffer,
            indices: indexBuffer,
            indicesCount: indices.length, 
            lineIndices: lineIndexBuffer, 
            lineIndicesCount: lineIndices.length

        };
    }

    let shaderProgram = initShaderProgram(fragmentShaderSource, vertexShaderSource);
    let lineColor = [0.3, 0.0, 0.3];
    let fillColor = [0.0, 0.0, 0.0];
    let nearFillColor = [1.0, 1.0, 0.3];
    let fogColor = [0.2, 0, 0.2];

    // Set clear color to fog color
    //gl.clearColor(fogColor[0], fogColor[1], fogColor[2], 1.0);
    gl.clearColor(0, 0, 0, 0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);
    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);  
    // Near things obscure far things
    gl.depthFunc(gl.LEQUAL);         
    // overlapping things use the maximum alpha value (because it's fogged)
    // gl.enable(gl.BLEND);
    // gl.blendFunc(gl.SRC_ALPHA, ext.MAX_EXT);
    gl.disable(gl.BLEND);
    
   
    

    let fov = Math.PI/4;
    let aspectRatio = gl.canvas.clientWidth / gl.canvas.clientHeight;
    let projectionMatrix = matrix4Perspective(
        fov, 
        aspectRatio, 
        1, 
        d/2 
    );
    let blurHorizontal = 1;
    // flip so we don't need to reproject
    let flipMatrix = matrix4Scale(1, -1, 1);
    projectionMatrix = matrix4Multiply(projectionMatrix, flipMatrix);

    // console.log(glm.vec4.transformMat4(glm.vec4.create(), [-1, -2, -2, 0], projectionMatrix));
    // console.log(glm.vec4.transformMat4(glm.vec4.create(), [-1, -2, -3, 0], projectionMatrix));
    // console.log(glm.vec4.transformMat4(glm.vec4.create(), [-1, -2, -4, 0], projectionMatrix));
    // console.log(glm.vec4.transformMat4(glm.vec4.create(), [-1, -2, -5, 0], projectionMatrix));
    // console.log(glm.vec4.transformMat4(glm.vec4.create(), [-1, -2, -6, 0], projectionMatrix));
    // console.log(glm.vec4.transformMat4(glm.vec4.create(), [-1, -2, -7, 0], projectionMatrix));
    // console.log(glm.vec4.transformMat4(glm.vec4.create(), [-1, -2, -8, 0], projectionMatrix));
    

    let modelMatrix = matrix4Identity();
    let viewMatrix = matrix4Identity();
    let previousViewMatrix = matrix4Identity();

    let aVertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    let aVertexNormalAverage = gl.getAttribLocation(shaderProgram, 'aVertexNormalAverage');
    let aBarrycentricCoordinate = gl.getAttribLocation(shaderProgram, 'aBarrycentricCoordinate');

    let uProjectionMatrix = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
    let uModelMatrix = gl.getUniformLocation(shaderProgram, 'uModelMatrix');
    let uViewMatrix = gl.getUniformLocation(shaderProgram, 'uViewMatrix');
    let uPreviousViewMatrix = gl.getUniformLocation(shaderProgram, 'uPreviousViewMatrix');
    let uViewPosition = gl.getUniformLocation(shaderProgram, 'uViewPosition');

    let uFillColor = gl.getUniformLocation(shaderProgram, 'uFillColor');
    let uNearFillColor = gl.getUniformLocation(shaderProgram, 'uNearFillColor');
    let uLineColor = gl.getUniformLocation(shaderProgram, 'uLineColor');
    let uLineWidth = gl.getUniformLocation(shaderProgram, 'uLineWidth');
    let uFogColor = gl.getUniformLocation(shaderProgram, 'uFogColor');
    let uMinFogDistance = gl.getUniformLocation(shaderProgram, 'uMinFogDistance');
    let uMaxFogDistance = gl.getUniformLocation(shaderProgram, 'uMaxFogDistance');
    let uMinNearDistance = gl.getUniformLocation(shaderProgram, 'uMinNearDistance');
    let uMaxNearDistance = gl.getUniformLocation(shaderProgram, 'uMaxNearDistance');
    let uVertexOffsetAbsolute = gl.getUniformLocation(shaderProgram, 'uVertexOffsetAbsolute');
    let uPrevious = gl.getUniformLocation(shaderProgram, 'uPrevious');
    let uPreviousDimension = gl.getUniformLocation(shaderProgram, 'uPreviousDimension');
    let uBlurHorizontal = gl.getUniformLocation(shaderProgram, 'uBlurHorizontal');

    let buffers = initBuffers();

    function drawScene(now: number) {

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            aVertexPosition, 
            3, 
            gl.FLOAT, 
            false, 
            0, 
            0
        );
        gl.enableVertexAttribArray(aVertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.barrycentricCoordinates);
        gl.vertexAttribPointer(
            aBarrycentricCoordinate, 
            3, 
            gl.FLOAT, 
            false, 
            0, 
            0
        );
        gl.enableVertexAttribArray(aBarrycentricCoordinate);

        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
    
        gl.useProgram(shaderProgram);
    

        gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uPreviousViewMatrix, false, previousViewMatrix);
        gl.uniform3fv(uFillColor, fillColor);
        gl.uniform3fv(uNearFillColor, nearFillColor);
        gl.uniform3fv(uLineColor, lineColor);
        gl.uniform1f(uLineWidth, .02);
        gl.uniform1f(uVertexOffsetAbsolute, 0);
        gl.uniform1f(uMinFogDistance, d/3);
        gl.uniform1f(uMaxFogDistance, d/2);
        gl.uniform1f(uMinNearDistance, 0);
        gl.uniform1f(uMaxNearDistance, d/8);
        gl.uniform3fv(uFogColor, fogColor);
        gl.uniform3f(uViewPosition, xpos, ypos, zpos);
        gl.activeTexture(gl.TEXTURE0);

        gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
        gl.uniform1i(uPrevious, 0);
        gl.uniform2f(uPreviousDimension, 1/canvas.width, 1/canvas.height);
        gl.uniform1i(uBlurHorizontal, blurHorizontal);
        
    
        
        for( let x=0; x<d; x+=t ) {
            for (let y=0; y<d; y+=t ) {
                let m = matrix4Translate(x - d/2, 0, y - d/2);
                //glm.mat4.multiply(m, modelMatrix, m);
                gl.uniformMatrix4fv(uModelMatrix, false, m);
                gl.drawElements(gl.TRIANGLES, buffers.indicesCount, gl.UNSIGNED_SHORT, 0);        
            }
        }


        gl.uniform3fv(uNearFillColor, [1, 1, 1]);
        gl.uniform3fv(uLineColor, [1, 1, 1]);

        
        let translate = matrix4Translate(Math.sin(now/1000) * 0 + -t/2, 0, -10.5);
        let rotate = matrix4Rotate(1, 0, 0, -Math.PI/2);
        let m = matrix4Multiply(translate, rotate);
        gl.uniformMatrix4fv(uModelMatrix, false, m);
        gl.drawElements(gl.TRIANGLES, buffers.indicesCount, gl.UNSIGNED_SHORT, 0);        


        /*
        gl.uniform4fv(uVertexColor, lineColor);
        gl.uniform1f(uVertexOffsetAbsolute, 0.5);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.lineIndices);
        gl.drawElements(gl.LINES, buffers.lineIndicesCount, gl.UNSIGNED_SHORT, 0);
        */
    }

    let dx = 0;
    let dy = 0;
    backgroundCanvas.onmousedown = function(e: MouseEvent) {
        if( !e.button ) {
            backgroundCanvas.requestPointerLock();
        }
    }

    backgroundCanvas.onmousemove = function(e: MouseEvent) {
        if( document.pointerLockElement == backgroundCanvas ) {
            dx += e.movementX;
            dy += e.movementY;    
        }
    }


    let xpos = 0;
    let ypos = 1;
    let zpos = 0;
    let then = 0;
    let frames = 0;

    let keys: {[_: number]: boolean} = {};

    window.onkeydown = function(e: KeyboardEvent) {
        keys[e.keyCode] = true;
    }
    window.onkeyup = function(e: KeyboardEvent) {
        keys[e.keyCode] = false;
    }

    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);

    let targetTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0);

    gl.viewport(0, 0, canvas.width, canvas.height);

    let sourceTexture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, canvas.width, canvas.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    let textureData = new Uint8Array(canvas.width * canvas.height * 4);

    let imageData = bgContext.createImageData(backgroundCanvas.width, backgroundCanvas.height);

    function update(now: number) {

        requestAnimationFrame(update);
        let diff = now - then;

        previousViewMatrix = viewMatrix
        viewMatrix = matrix4Identity();
        //glm.mat4.rotateY(modelViewMatrix, modelViewMatrix, now * 0.0001);
        //glm.mat4.rotateX(modelViewMatrix, modelViewMatrix, now * 0.0001);
        let xrot = dy * 2 / canvas.width;        
        let yrot = dx * 3 / canvas.width;

        let speed = diff / 200;
        let forward = 0;
        let side = 0;
        let sin = Math.sin(-yrot);
        let cos = Math.cos(-yrot);
        // up/W
        if( keys[38] || keys[87] ) {
            forward += speed;
        }
        // down/S 
        if( keys[40] || keys[83] ) {
            forward -= speed;
        }
        // left/A 
        if( keys[37] || keys[65] ) {
            side += speed;
        }
        // right/D 
        if( keys[39] || keys[68] ) {
            side -= speed;
        }
        zpos -= cos * forward - sin * side;
        xpos -= sin * forward + cos * side;

        //console.log(`${xpos}, ${ypos}, ${zpos}`);
        let rotationMatrixX = matrix4Rotate(1, 0, 0, xrot);
        let rotationMatrixY = matrix4Rotate(0, 1, 0, yrot);
        let translationMatrix = matrix4Translate(-xpos, -ypos, -zpos);
        // glm.mat4.rotateX(viewMatrix, viewMatrix, xrot);
        // glm.mat4.rotateY(viewMatrix, viewMatrix, yrot);
        // glm.mat4.translate(viewMatrix, viewMatrix, [-xpos, -ypos, -zpos]);
        viewMatrix = matrix4Multiply(matrix4Multiply(rotationMatrixX, rotationMatrixY), translationMatrix);


        gl.bindTexture(gl.TEXTURE_2D, targetTexture);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0);

        // Clear the canvas before we start drawing on it.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        blurHorizontal = (blurHorizontal + 1)%2;
        drawScene(now);

        let tmp = sourceTexture;
        sourceTexture = targetTexture;
        targetTexture = tmp;

        //console.log(pos, [xpos, ypos, zpos]);
        //background.setAttribute('style', `padding-left: ${Math.abs(dx)}px; padding-top: ${Math.abs(dy)}px;`);
        //canvas.setAttribute('style', `background-position: ${-dx}px ${-dy}px`);
        let w = Math.PI * d / 20 * (Math.PI*2/fov);

        // glm.mat4.identity(modelMatrix);
        // glm.mat4.rotateX(modelMatrix, modelMatrix, xrot);
        // glm.mat4.multiply(modelMatrix, projectionMatrix, modelMatrix);


        gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, textureData);
        /*
        // modify texture
        let i = 0;
        while( i < textureData.length ) {
            let x = i % (canvas.width*4)/4;
            let y = Math.floor(i / (canvas.width*4));
            let r = textureData[i++];
            let g = textureData[i++];
            let b = textureData[i++];
            let a = textureData[i++];
            
            if( a > 0 ) {
                // blur
                let d = (255 - a)/15;
                //let d = 5;
                let count = 1;
                let rb = 0;
                let gb = 0;
                let bb = 0;
                for( let dx=0; dx<d; dx++ ) {
                    let ix = Math.floor(x + dx - d/2);
                    if( ix >= 0 && ix < canvas.width ) {
                        for( let dy=0; dy < d; dy++ ) {
                            let iy = Math.floor(y + dy - d/2);
                            if( iy >= 0 && iy < canvas.height ) {
                                let j = (ix + iy*canvas.width)*4;
                                rb += textureData[j++];
                                gb += textureData[j++];
                                bb += textureData[j];
                                count++;
                            }
                        }
                    }
                }
                rb /= count;
                gb /= count;
                bb /= count;
                r = Math.max(r, rb);
                g = Math.max(g, gb);
                b = Math.max(b, bb);
                // fog
                r = (r * a) / 255 + (255 - a);
                g = (g * a) / 255 + (255 - a);
                b = (b * a) / 255 + (255 - a);
                a = 255;
                imageData.data[i-4] = r;
                imageData.data[i-3] = g;
                imageData.data[i-2] = b;
                imageData.data[i-1] = a;
            }
        }
        */

        imageData.data.set(textureData);
        bgContext.putImageData(imageData, 0, 0);    

        bgContext.globalCompositeOperation = 'source-over';

        bgContext.fillStyle = '#f00';

        frames ++;

        bgContext.fillText(`${Math.round((frames * 1000)/now)} (${Math.round(1000/diff)}) FPS`, 10, 30);
        
        bgContext.globalCompositeOperation = 'destination-over';

        bgContext.fillStyle = '#333';

        let x = (-yrot / (Math.PI * 2) * canvas.width * (Math.PI*2/(fov*aspectRatio)))%(w*2) - (canvas.width)/2;

        let screenPos = vector3TransformMatrix4(0, 0, 0, modelMatrix);
        // console.log(screenPos);
        // let x = (screenPos[0]/screenPos[3] * canvas.width/2 % (w*2)) - (canvas.width)/2;
        let y = screenPos[1] * canvas.height/2;
        // while( x < canvas.width ) {
        //     bgContext.fillRect(x + (canvas.width - w)/2, y + (canvas.height - w)/2, w, w);
        //     x+= w*2;
        // }
        while( x < canvas.width ) {
            bgContext.fillRect(x + (canvas.width)/2, y + (canvas.height)/2 - w*2, w, w * 2);
            x+= w*2;
        }

        bgContext.fillStyle = `rgb(${fogColor[0] * 255}, ${fogColor[1] * 255}, ${fogColor[2] * 255})`;
        //bgContext.fillStyle = '#fff';
        bgContext.fillRect(0, 0, backgroundCanvas.width, backgroundCanvas.height);



        then = now;
    }
    update(0);

}