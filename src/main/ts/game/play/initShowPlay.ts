let vertexShaderSource = `
precision lowp float;
attribute vec3 aVertexPosition;
attribute vec3 aBarrycentricCoordinate;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uPreviousViewMatrix;
uniform mat4 uProjectionMatrix;
uniform bool uUseBarrycentricLines;
varying vec3 vBarrycentricCoordinate;
varying vec3 vRelativePosition;
varying vec2 vGridCoordinate;
varying vec4 vScreenCoordinate;
void main() {
    vec4 adjustedVertexPosition = vec4(aVertexPosition, 1.0);
    vec4 vertexPosition = uModelMatrix * adjustedVertexPosition;
    vec4 relativeVertexPosition = uViewMatrix * vertexPosition;
    vec4 screenPosition = uProjectionMatrix * relativeVertexPosition;
    if( uUseBarrycentricLines ) {
        vBarrycentricCoordinate = aBarrycentricCoordinate;
    } else {
        // TODO adjust by line normal
        vGridCoordinate = vertexPosition.xy;
    }
    vRelativePosition = relativeVertexPosition.xyz;    
    vScreenCoordinate = uProjectionMatrix * uPreviousViewMatrix * vertexPosition;
    gl_Position = screenPosition;
}
`;
let fragmentShaderSource = `
#extension GL_OES_standard_derivatives : enable
precision lowp float;
uniform vec3 uFillColor;
uniform vec3 uLineColor;
uniform float uLineWidth;
uniform float uVisibleDistance;
uniform float uCameraLightDistance;
uniform sampler2D uPrevious;
uniform vec2 uPreviousDimension;
uniform bool uUseBarrycentricLines;
varying vec3 vBarrycentricCoordinate;
varying vec3 vRelativePosition;
varying vec2 vGridCoordinate;
varying vec4 vScreenCoordinate;

vec4 getSampleColor(in vec4 currentColor, in vec2 screenCoordinate, inout float count) {
    vec4 previousColor = texture2D(uPrevious, screenCoordinate);
    float amt = (previousColor.a  - currentColor.a+ 1.) /2.;
    count += amt * (.3 + currentColor.a/2.5);
    return mix(currentColor, previousColor, amt);    
}

void main() {
    // TODO can shorten this for sure

    float distanceSquared = vRelativePosition.x*vRelativePosition.x+vRelativePosition.y*vRelativePosition.y+vRelativePosition.z*vRelativePosition.z;
    float distance = sqrt(distanceSquared);
    float visibleDistanceSquared = uVisibleDistance * uVisibleDistance;
    float fogginess = min(1., max(0., (visibleDistanceSquared-distanceSquared) / visibleDistanceSquared));
    if( distance > uVisibleDistance ) {
        fogginess = 0.;
    }
    float lighting = min(1.0, max(0., (uCameraLightDistance-distance) / uCameraLightDistance));
    float tileness = 1.;
    if( uUseBarrycentricLines ) {
        vec3 d = fwidth(vBarrycentricCoordinate);
        vec3 a3 = smoothstep(vec3(0.0), d*max(1., uLineWidth * (1. - distance/uVisibleDistance)), vBarrycentricCoordinate);
        tileness = min(min(a3.x, a3.y), a3.z);
    
    } else {
        float mn = min(vGridCoordinate.x - floor(vGridCoordinate.x), vGridCoordinate.y - floor(vGridCoordinate.y));
        float mx = max(vGridCoordinate.x - floor(vGridCoordinate.x), vGridCoordinate.y - floor(vGridCoordinate.y));
        if( mn < uLineWidth || mx > (1.0 - uLineWidth) ) {
            float m = min(mn, 1.0 - mx);
            tileness = m / uLineWidth * (1. - max(0., distance/uVisibleDistance))*(1. - uLineWidth * 1.1) + uLineWidth * 1.1;
            tileness *= tileness * tileness;
        }    
    }
    vec4 current = vec4(mix(uLineColor, mix(vec3(0.), uFillColor, lighting), tileness), fogginess);
    // blur
    vec2 textureCoordinate = (vScreenCoordinate.xy/vScreenCoordinate.w)/2. + .5;
    float count = 0.;
    vec4 previous = getSampleColor(current, textureCoordinate, count);
    for( int i=1; i<7; ++i ) {
        float f = float(i*i+3)/2.;
        //float f = float(i);
        previous += getSampleColor(current, textureCoordinate + vec2(uPreviousDimension.x, 0.) * f, count);
        previous += getSampleColor(current, textureCoordinate - vec2(uPreviousDimension.x, 0.) * f, count);
        previous += getSampleColor(current, textureCoordinate + vec2(0., uPreviousDimension.y) * f, count);
        previous += getSampleColor(current, textureCoordinate - vec2(0., uPreviousDimension.y) * f, count);
    }
    if( count > 0. ) {
        previous /= count;
        current = vec4(mix(current.rgb, previous.rgb, .55), current.a);
    }

    gl_FragColor = current;

}
`;

interface ShowPlay {
    () : void;
}

function initShowPlay(
    offscreenCanvas: HTMLCanvasElement,
    gl: WebGLRenderingContext,
    activeTilesWidth: number, 
    activeTilesHeight: number, 
    chunkWidth: number, 
    chunkHeight: number, 
    chunkGenerator: ChunkGenerator, 
    monsterGenerator: MonsterGenerator
): ShowPlay {
    let canvas = document.getElementById('b') as HTMLCanvasElement;
    let context = canvas.getContext('2d');

    let visibleDistance = Math.min(activeTilesWidth, activeTilesHeight)/2;
    
    let textureData: Uint8Array;
    let textureImageData: ImageData;
    let sourceTexture: WebGLTexture;
    let targetTexture: WebGLTexture;
    let depthTexture: WebGLTexture;
    let frameBuffer = gl.createFramebuffer();
    let depthBuffer = gl.createRenderbuffer();

    let projectionMatrix: Matrix4;
    let canvasWidth: number;
    let canvasHeight: number;

    let resize = function(cleanUpOnly?: boolean) {

        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;

        offscreenCanvas.width = canvas.width = canvasWidth;
        offscreenCanvas.height = canvas.height = canvasHeight;

        textureData = new Uint8Array(canvasWidth * canvasHeight * 4);
        textureImageData = context.createImageData(canvasWidth, canvasHeight);
        if( sourceTexture ) {
            gl.deleteTexture(sourceTexture);
            gl.deleteTexture(targetTexture);
            gl.deleteTexture(depthTexture);
        }
        if( !cleanUpOnly ) {
            sourceTexture = webglCreateTexture(gl, canvasWidth, canvasHeight);
            targetTexture = webglCreateTexture(gl, canvasWidth, canvasHeight);    

        }
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvasWidth, canvasHeight);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

        projectionMatrix = matrix4Perspective(Math.PI/4, canvasWidth/canvasHeight, 1, visibleDistance);

        // is this required?
        gl.viewport(0, 0, canvasWidth, canvasHeight);
    }

    // turn on the extension we use
    gl.getExtension('OES_standard_derivatives');
    // gl.getExtension( "WEBKIT_WEBGL_depth_texture" );
    // gl.getExtension( "MOZ_WEBGL_depth_texture" );

    // Enable depth testing
    gl.enable(gl.DEPTH_TEST);  
    // Near things obscure far things
    gl.depthFunc(gl.LESS);         
    // overlapping things use the maximum alpha value (because it's fogged)
    if( FLAG_GL_DISABLE_BLENDING ) {
        gl.disable(gl.BLEND); // pretty sure this is off by default
    }
    // transparent clear color 
    gl.clearColor(0, 0, 0, 0);
    // only draw front faces
    if( FLAG_GL_CULL_FACES ) {
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
    }

    let vertexShader = webglLoadShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    let fragmentShader = webglLoadShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    let shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if( FLAG_GL_SHOW_SHADER_ERRORS && !gl.getProgramParameter(shaderProgram, gl.LINK_STATUS) ) {
        console.error('An error occurred linking program', gl.getProgramInfoLog(shaderProgram));
        throw 'program link error';
    }
    gl.useProgram(shaderProgram);
    gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
    gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    


    // get uniforms and attributes
    let aVertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    let aBarrycentricCoordinate = gl.getAttribLocation(shaderProgram, 'aBarrycentricCoordinate');

    let uProjectionMatrix = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
    let uModelMatrix = gl.getUniformLocation(shaderProgram, 'uModelMatrix');
    let uViewMatrix = gl.getUniformLocation(shaderProgram, 'uViewMatrix');
    let uPreviousViewMatrix = gl.getUniformLocation(shaderProgram, 'uPreviousViewMatrix');
    let uFillColor = gl.getUniformLocation(shaderProgram, 'uFillColor');
    let uLineColor = gl.getUniformLocation(shaderProgram, 'uLineColor');
    let uLineWidth = gl.getUniformLocation(shaderProgram, 'uLineWidth');
    let uVisibleDistance = gl.getUniformLocation(shaderProgram, 'uVisibleDistance');
    let uCameraLightDistance = gl.getUniformLocation(shaderProgram, 'uCameraLightDistance');
    let uPrevious = gl.getUniformLocation(shaderProgram, 'uPrevious');
    let uPreviousDimension = gl.getUniformLocation(shaderProgram, 'uPreviousDimension');
    let uUseBarrycentricLines = gl.getUniformLocation(shaderProgram, 'uUseBarrycentricLines');

    gl.uniform1f(uVisibleDistance, visibleDistance);
    
    let render = function(world: World, projectionMatrix: Matrix4, viewMatrix: Matrix4, previousViewMatrix: Matrix4) {

        // Clear the color buffer with specified clear color
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


        gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
        gl.uniform1i(uPrevious, 0);
        gl.uniform2f(uPreviousDimension, 1/canvasWidth, 1/canvasHeight);
        gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
        gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
        gl.uniformMatrix4fv(uPreviousViewMatrix, false, previousViewMatrix);
        gl.uniform1f(uCameraLightDistance, 8);


        // draw all the entities
        for( let entity of world.allEntities ) {

            webglBindAttributeBuffer(gl, entity.positionBuffer, aVertexPosition, 3);
   
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entity.indicesBuffer);



            let translationMatrix = matrix4Translate(entity.x, entity.y, entity.z);
            gl.uniform3fv(uFillColor, entity.fillColor);
            gl.uniform3fv(uLineColor, entity.lineColor);
            gl.uniform1f(uLineWidth, entity.lineWidth);
            gl.uniform1i(uUseBarrycentricLines, entity.isMonster);

            if( entity.isMonster ) {

                webglBindAttributeBuffer(gl, entity.barycentricCoordinatesBuffer, aBarrycentricCoordinate, 3);
                let rotationMatrixX = matrix4Rotate(1, 0, 0, entity.rx);
                let rotationMatrixY = matrix4Rotate(0, 1, 0, entity.ry);
                let rotationMatrixZ = matrix4Rotate(0, 0, 1, entity.rz);
                let modelMatrix = matrix4MultiplyStack([translationMatrix, rotationMatrixX, rotationMatrixY, rotationMatrixZ]);
                    
                gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);

            } else {
                let surface = entity as Surface;
                gl.uniformMatrix4fv(uModelMatrix, false, translationMatrix);
            }

            gl.drawElements(gl.TRIANGLES, entity.indicesCount, FLAG_GL_16_BIT_INDEXES?gl.UNSIGNED_SHORT:gl.UNSIGNED_BYTE, 0);
        }

    }

    return function() {
        let animationFrameHandle: number;
        let destroy = function() {
            canvas.className = '';
            window.onresize = null;
            window.cancelAnimationFrame(animationFrameHandle);
            resize(true);
        }
    
    
        canvas.className = 'v';
    
        resize();
    
        window.onresize = resize as any;

        let world = new World(activeTilesWidth, activeTilesHeight, chunkWidth, chunkHeight, chunkGenerator, monsterGenerator);
        for( let i=0; i<3; i++ ) {
            let monster = monsterGenerator((Math.random() * 9999999) | 0, (i*8)%13 - 4, -5 - i, 1+i);
            world.addEntity(monster);    
        }

        let then = 0;
        let frames = 0;
        
        let dx = 0;
        let dy = 0;
        canvas.onmousedown = function(e: MouseEvent) {
            if( !e.button ) {
                canvas.requestPointerLock();
            }
        }
    
        canvas.onmousemove = function(e: MouseEvent) {
            if( document.pointerLockElement == canvas ) {
                dx += e.movementX;
                dy += e.movementY;    
            }
        }
    
    

        let previousViewMatrix = matrix4Identity();
        let update = function(now: number) {
            animationFrameHandle = requestAnimationFrame(update);

            let diff = Math.min(99, now - then);
            then = now;

            world.update(diff);

            gl.bindTexture(gl.TEXTURE_2D, targetTexture);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0);

            let xrot = dy * 2 / canvasWidth - Math.PI/2; 
            let zrot = dx * 3 / canvasWidth;

            world.cameraRotationZ = zrot;
            world.cameraRotationX = xrot;

            let rotationMatrixX = matrix4Rotate(1, 0, 0, world.cameraRotationX);
            let rotationMatrixY = matrix4Rotate(0, 1, 0, world.cameraRotationY);
            let rotationMatrixZ = matrix4Rotate(0, 0, 1, world.cameraRotationZ);
            let translationMatrix = matrix4Translate(-world.cameraX, -world.cameraY, -world.cameraZ);
            let viewMatrix = matrix4MultiplyStack([rotationMatrixX, rotationMatrixY, rotationMatrixZ, translationMatrix]);


            render(world, projectionMatrix, viewMatrix, previousViewMatrix);

            previousViewMatrix = viewMatrix;            

            let tmp = sourceTexture;
            sourceTexture = targetTexture;
            targetTexture = tmp;

            gl.readPixels(0, 0, canvasWidth, canvasHeight, gl.RGBA, gl.UNSIGNED_BYTE, textureData);
            textureImageData.data.set(textureData);
            context.putImageData(textureImageData, 0, 0);    

            if( FLAG_SHOW_FPS && diff ) {
                context.globalCompositeOperation = 'source-over';
                context.fillStyle = '#f00';
                frames ++;
                context.fillText(`${Math.round((frames * 1000)/now)} (${Math.round(1000/diff)}) FPS`, 10, 30);    
            } 

            context.globalCompositeOperation = 'destination-over';

            context.fillStyle = "#202" ;
            context.fillRect(0, 0, canvasWidth, canvasHeight);

        }   
        update(0);     
    
    }
}