let vertexShaderSource = `
precision lowp float;
attribute vec4 aVertexPosition;
attribute vec4 aOffsetPoint;
attribute vec4 aBarrycentricCoordinate;
uniform mat4 uModelMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uPreviousViewMatrix;
uniform mat4 uProjectionMatrix;
uniform bool uUseBarrycentricLines;
uniform float uCycleRadians;
uniform float uOffsetMultiplier;
varying vec3 vBarrycentricCoordinate;
varying vec3 vRelativePosition;
varying vec2 vGridCoordinate;
varying vec4 vScreenCoordinate;
void main() {
    vec3 adjustedVertexPosition;
    if( uUseBarrycentricLines ) {
        adjustedVertexPosition = aVertexPosition.xyz + aVertexPosition.w * aVertexPosition.xyz * sin(uCycleRadians + aBarrycentricCoordinate.w) + uOffsetMultiplier * aOffsetPoint.w * aOffsetPoint.xyz;
        vBarrycentricCoordinate = aBarrycentricCoordinate.xyz;
    } else {
        adjustedVertexPosition = aVertexPosition.xyz;
    }
    
    vec4 vertexPosition = uModelMatrix * vec4(adjustedVertexPosition, 1.);
    vec4 relativeVertexPosition = uViewMatrix * vertexPosition;
    vec4 screenPosition = uProjectionMatrix * relativeVertexPosition;
    vGridCoordinate = vertexPosition.xy;
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
uniform vec2 uCameraLight;
uniform float uAmbientLight;
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
    count += amt * (.3 + currentColor.a/2.3);
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
    float lighting = min(1., max(0., (uCameraLight.x-distance) / uCameraLight.x)) * uCameraLight.y + uAmbientLight;
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
    monsterGenerator: MonsterGenerator, 
    deathAnimationTime: number, 
    fogColor: Vector3
): ShowPlay {
    let canvas = document.getElementById('b') as HTMLCanvasElement;
    let context = canvas.getContext('2d');

    let visibleDistance = Math.min(activeTilesWidth, activeTilesHeight)/2;
    
    let textureData: Uint8Array;
    let textureImageData: ImageData;
    let sourceTexture: WebGLTexture;
    let targetTexture: WebGLTexture;
    let frameBuffer: WebGLFramebuffer;
    let depthBuffer: WebGLRenderbuffer;

    let projectionMatrix: Matrix4;
    let canvasWidth: number;
    let canvasHeight: number;


    // NOTE: regenerate should be a boolean really, but onresize passes some truthy value
    let resize = function(regenerate?: any) {

        canvasWidth = window.innerWidth;
        canvasHeight = window.innerHeight;

        offscreenCanvas.width = canvas.width = canvasWidth;
        offscreenCanvas.height = canvas.height = canvasHeight;

        textureData = new Uint8Array(canvasWidth * canvasHeight * 4);
        textureImageData = context.createImageData(canvasWidth, canvasHeight);
        if( sourceTexture && FLAG_CLEAN_UP_ON_RESIZE ) {
            gl.deleteTexture(sourceTexture);
            gl.deleteTexture(targetTexture);
            gl.deleteFramebuffer(frameBuffer);
            gl.deleteRenderbuffer(depthBuffer);
        }
        if( regenerate ) {
            sourceTexture = webglCreateTexture(gl, canvasWidth, canvasHeight);
            targetTexture = webglCreateTexture(gl, canvasWidth, canvasHeight);    
            frameBuffer = gl.createFramebuffer();
            depthBuffer = gl.createRenderbuffer();
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, frameBuffer);
        gl.bindRenderbuffer(gl.RENDERBUFFER, depthBuffer);
    
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvasWidth, canvasHeight);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, depthBuffer);

        projectionMatrix = matrix4Perspective(Math.PI/4, canvasWidth/canvasHeight, 1, visibleDistance);
        let flipMatrix = matrix4Scale(1, -1, 1);
        projectionMatrix = matrix4Multiply(projectionMatrix, flipMatrix);
    
        // pretty sure we didn't use to need this?
        gl.viewport(0, 0, canvasWidth, canvasHeight);
    }

    // turn on the extension(s) we use
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
        if( FLAG_GL_CULL_EXPLOSIONS ) {
            gl.enable(gl.CULL_FACE);
        }
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
    


    // get uniforms and attributes
    let aVertexPosition = gl.getAttribLocation(shaderProgram, 'aVertexPosition');
    let aBarrycentricCoordinate = gl.getAttribLocation(shaderProgram, 'aBarrycentricCoordinate');
    let aOffsetPoint = gl.getAttribLocation(shaderProgram, 'aOffsetPoint');

    let uProjectionMatrix = gl.getUniformLocation(shaderProgram, 'uProjectionMatrix');
    let uModelMatrix = gl.getUniformLocation(shaderProgram, 'uModelMatrix');
    let uViewMatrix = gl.getUniformLocation(shaderProgram, 'uViewMatrix');
    let uPreviousViewMatrix = gl.getUniformLocation(shaderProgram, 'uPreviousViewMatrix');
    let uFillColor = gl.getUniformLocation(shaderProgram, 'uFillColor');
    let uLineColor = gl.getUniformLocation(shaderProgram, 'uLineColor');
    let uLineWidth = gl.getUniformLocation(shaderProgram, 'uLineWidth');
    let uVisibleDistance = gl.getUniformLocation(shaderProgram, 'uVisibleDistance');
    let uCameraLight = gl.getUniformLocation(shaderProgram, 'uCameraLight');
    let uAmbientLight = gl.getUniformLocation(shaderProgram, 'uAmbientLight');
    let uPrevious = gl.getUniformLocation(shaderProgram, 'uPrevious');
    let uPreviousDimension = gl.getUniformLocation(shaderProgram, 'uPreviousDimension');
    let uUseBarrycentricLines = gl.getUniformLocation(shaderProgram, 'uUseBarrycentricLines');
    let uCycleRadians = gl.getUniformLocation(shaderProgram, 'uCycleRadians');
    let uOffsetMultiplier = gl.getUniformLocation(shaderProgram, 'uOffsetMultiplier');

    gl.uniform1f(uVisibleDistance, visibleDistance);
    

    return function() {
        let animationFrameHandle: number;
        let destroy = function() {
            canvas.className = '';
            if( FLAG_CLEANUP_EVENT_HANDLERS_ON_DESTROY ) {
                window.onresize = null;
                window.onkeydown = null;
                window.onkeyup = null;
                canvas.onmousedown = null;
                canvas.onmouseup = null;
            }
            window.cancelAnimationFrame(animationFrameHandle);
            resize();
        }
    
        canvas.className = 'v';
    
        resize(1); 
    
        window.onresize = resize;

        let world = new World(activeTilesWidth, activeTilesHeight, chunkWidth, chunkHeight, chunkGenerator, monsterGenerator, deathAnimationTime);
        let entityCount = 40;
        for( let i=0; i<entityCount; i++ ) {
            let angle = Math.PI * 2 * i / entityCount;
            let r = Math.random() * visibleDistance*.9 + 3;
            let x = Math.cos(angle) * r;
            let y = Math.sin(angle) * r;
            let z = Math.random() * 2 + 1;
            let monster = monsterGenerator((Math.random() * 9999999) | 0, x, y, z, 1);
            world.addEntity(monster);    
        }

        let then = 0;
        let frames = 0;
        
        let dx = 0;
        let dy = 0;
        let shooting: number;
        let lastRunningRelease: number;
        let keyStates: {[_:number]: number } = {
            38: 0, 
            87: 0
        };
        canvas.onmousedown = function(e: MouseEvent) {
            if( !e.button ) {
                if( document.pointerLockElement == canvas ) {
                    shooting = world.age;
                } else {
                    canvas.requestPointerLock();
                }
            } 
        }
        canvas.onmouseup = function(e: MouseEvent) {
            shooting = 0;
        }
     
        canvas.onmousemove = function(e: MouseEvent) {
            if( document.pointerLockElement == canvas ) {
                
                dx -= e.movementX;
                dy = Math.min(canvasHeight/4, Math.max(-canvasHeight/4, dy - e.movementY));    
            }
        }
        window.onkeydown = function(e: KeyboardEvent) {
            let keyCode = e.keyCode;
            if( !keyStates[keyCode] ) {
                keyStates[keyCode] = world.age;
            }
        }

        window.onkeyup = function(e: KeyboardEvent) {
            let keyCode = e.keyCode;
            keyStates[keyCode] = 0;
            if( keyCode == 16 ) {
                lastRunningRelease = world.age;
            }
        }
    
        // generate something gun-like
        let player = monsterGenerator(25, 0, 0, 0, 1);
        let walkDistance = 0;
        // TODO can remove once we get our model under control
        player.ry = 0;
        // end TODO
        player.visible = 0;
        player.side = -1;
        player.lineColor = [.7, .7, .3];
        player.fillColor = [.2, .2, 0];
        // make it look like a gun
        let scale = .2;
        
        player.specialMatrix = matrix4MultiplyStack([
            matrix4Translate(player.radius/3, -player.radius/3, 0), 
            matrix4Rotate(0, 1, 0, Math.PI/2), 
            matrix4Scale(scale, scale, 3)
        ]);
        //player.specialMatrix = matrix4Translate(2, 0, -player.radius/2);
        let lastShot = 0;
        let shotInterval = 300;
        let lastFloor = 0;
        if( FLAG_ALLOW_JUMPING ) {
            player.collisionResponse = function(this: Monster, other: Entity) {
                let result: number;
                if( other.isMonster ) {
                    result = COLLISION_RESPONSE_DIE;
                } else {
                    let surface = other as Surface;
                    // you can probably jump
                    if( surface.normal[2]>0) {
                        lastFloor = this.age;
                    }
                    result = COLLISION_RESPONSE_SLIDE;
                }
                return result;
            }    
        }
        player.update = function(this: Monster, world: World, amt: number) {
            let left = keyStates[37] || keyStates[65];
            let right = keyStates[39] || keyStates[68];
            let forward = Math.max(keyStates[38], keyStates[87]);
            let backward = keyStates[40] || keyStates[83];
            let running = keyStates[16] || forward < lastRunningRelease;
            let jumping = keyStates[32];
            
            let baseVelocity = 0.004;
            let forwardVelocity = baseVelocity;
            if( running ) {
                forwardVelocity*=2;
            }

            player.rx = dy * 3 / canvasHeight; 
            player.rz = dx * 3 / canvasWidth;

            let sinZ = Math.sin(player.rz);
            let cosZ = Math.cos(player.rz);
            let sinZSide = Math.sin(player.rz - Math.PI/2);
            let cosZSide = Math.cos(player.rz - Math.PI/2);

            let vx = 0;
            let vy = 0;
            if( right ) {
                vx += baseVelocity * cosZSide;
                vy += baseVelocity * sinZSide;
            }
            if( left ) {
                vx -= baseVelocity * cosZSide;
                vy -= baseVelocity * sinZSide;
            }
            if( forward ) {
                vx += forwardVelocity * cosZ;
                vy += forwardVelocity * sinZ;
                walkDistance += forwardVelocity * amt;
            }
            if( backward ) {
                vx -= baseVelocity * cosZ;
                vy -= baseVelocity * sinZ;
                walkDistance -= baseVelocity * amt;
            }
            if( FLAG_ALLOW_JUMPING && jumping && lastFloor > jumping ) {
                player.vz = baseVelocity;
                lastFloor = 0;
            }
            player.vx = vx;
            player.vy = vy;
            
            if( shooting ) {
                if( this.age > lastShot + shotInterval ) {
                    let sinX = Math.sin(player.rx);
                    let cosX = Math.cos(player.rx);
                    if( lastShot + shotInterval + amt > this.age ) {
                        lastShot = lastShot + shotInterval;
                    } else {
                        lastShot = this.age;
                    }
                    // shoot
                    let bullet = monsterGenerator(818, this.x + this.radius*cosZSide/3 + this.radius*cosZ*3, this.y + this.radius*sinZSide/3 + this.radius*sinZ*3, this.z + sinX * this.radius*3, .2);
                    let bulletVelocity = 0.05; 
                    bullet.update = function(this: Monster) {
                        return this.age > 9999;
                    }
                    bullet.side = -this.side;
                    bullet.collisionResponse = function() {
                        return COLLISION_RESPONSE_DIE;
                    }
                    bullet.vx = cosX * cosZ * bulletVelocity;
                    bullet.vy = cosX * sinZ * bulletVelocity;
                    bullet.vz = sinX * bulletVelocity;
                    bullet.fillColor = this.fillColor;
                    bullet.lineColor = this.lineColor;
                    bullet.ignoreGravity = 1;

                    world.addEntity(bullet);
                }
            }
        }
        world.addEntity(player);

        let render = function(projectionMatrix: Matrix4, viewMatrix: Matrix4, previousViewMatrix: Matrix4) {

            // Clear the color buffer with specified clear color
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
            gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
            gl.uniform1i(uPrevious, 0);
            gl.uniform2f(uPreviousDimension, 1/canvasWidth, 1/canvasHeight);
            gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
            gl.uniformMatrix4fv(uPreviousViewMatrix, false, previousViewMatrix);
            gl.uniform1f(uAmbientLight, .05);
            if( FLAG_MUZZLE_FLASH ) {
                let shotLightBonus = Math.max(0, lastShot + shotInterval/2 - world.age)/(shotInterval/2);
                gl.uniform2f(uCameraLight, 12 + shotLightBonus, .5 + shotLightBonus*.2);    
            } else {
                gl.uniform2f(uCameraLight, 12, .6);    
            }
    
            // draw all the entities
            for( let entity of world.allEntities ) {
                if( FLAG_GL_CULL_EXPLOSIONS ) {
                    gl.enable(gl.CULL_FACE);
                }
    
                webglBindAttributeBuffer(gl, entity.positionBuffer, aVertexPosition, 4);
       
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entity.indicesBuffer);
    
    
    
                let translationMatrix = matrix4Translate(entity.x, entity.y, entity.z);
                let lineColor = entity.lineColor;
                let fillColor = entity.fillColor;
                gl.uniform1f(uLineWidth, entity.lineWidth);
                gl.uniform1i(uUseBarrycentricLines, entity.isMonster);
    
                if( entity.isMonster ) {
    
                    webglBindAttributeBuffer(gl, entity.barycentricCoordinatesBuffer, aBarrycentricCoordinate, 4);
                    webglBindAttributeBuffer(gl, entity.centerPointsBuffer, aOffsetPoint, 4); 
                    let rotationMatrixX = matrix4Rotate(0, 1, 0, -entity.rx);
                    let rotationMatrixY = matrix4Rotate(1, 0, 0, -entity.ry);
                    let rotationMatrixZ = matrix4Rotate(0, 0, 1, -entity.rz);
    
                    let matrixStack = [translationMatrix, rotationMatrixZ, rotationMatrixY, rotationMatrixX, entity.specialMatrix];
    
                    let cycle = entity.age / entity.cycleLength;
                    let offsetMultiplier = 0;
                    if( entity.deathAge ) {
                        if( !FLAG_GL_CULL_EXPLOSIONS ) {
                            gl.disable(gl.CULL_FACE);
                        }
                        let b = (entity.age - entity.deathAge)/deathAnimationTime;
                        let bsq = b * b;
                        let scale = 1 - bsq*.99;
                        offsetMultiplier = bsq * 3 / scale; 
                        // explode away from the camera
                        //matrixStack.splice(1, 0, matrix4Scale(1 - b * sinZ, 1 - b * cosZ, 1 - b));
                        matrixStack.splice(1, 0, matrix4Scale(scale, scale, scale));
                        lineColor = vector3Mix(fogColor, lineColor, bsq);
                        fillColor = vector3Mix(fogColor, fillColor, bsq);
                        // do one last animation
                        cycle = entity.deathAge / entity.cycleLength + (entity.age - entity.deathAge)/deathAnimationTime;
                    }
                    gl.uniform1f(uCycleRadians, cycle * Math.PI * 2);
                    gl.uniform1f(uOffsetMultiplier, offsetMultiplier);
    
                    let modelMatrix = matrix4MultiplyStack(matrixStack);
                    gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
    
    
                } else {
                    let surface = entity as Surface;
                    gl.uniformMatrix4fv(uModelMatrix, false, translationMatrix);
                }
    
                gl.uniform3fv(uFillColor, fillColor);
                gl.uniform3fv(uLineColor, lineColor);
    
                gl.drawElements(gl.TRIANGLES, entity.indicesCount, FLAG_GL_16_BIT_INDEXES?gl.UNSIGNED_SHORT:gl.UNSIGNED_BYTE, 0);
    
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

            let deadness = 0;
            if( FLAG_DEATH_ANIMATION && player.deathAge ) {
                deadness = Math.sin(Math.min(Math.PI/2, (world.age - player.deathAge)/999));
            }

            world.setCameraPosition(
                player.x, 
                player.y, 
                player.z + player.radius*.8 + deadness * visibleDistance/2, 
                (player.rx + Math.PI/2) * (1 - deadness), 
                player.ry, 
                player.rz - Math.PI/2
            );

            // adjust for walk animation
            let walkTranslationMatrix = matrix4Translate(Math.sin(walkDistance)/8, 0, Math.abs(Math.cos(walkDistance)/8));
            let rotationMatrixX = matrix4Rotate(1, 0, 0, world.cameraRotationX);
            let rotationMatrixY = matrix4Rotate(0, 1, 0, world.cameraRotationY);
            let rotationMatrixZ = matrix4Rotate(0, 0, 1, world.cameraRotationZ);
            let translationMatrix = matrix4Translate(-world.cameraX, -world.cameraY, -world.cameraZ);
            let viewMatrix = matrix4MultiplyStack([rotationMatrixX, rotationMatrixY, walkTranslationMatrix, rotationMatrixZ, translationMatrix]);

            render(projectionMatrix, viewMatrix, previousViewMatrix);

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

            context.fillStyle = `rgb(${fogColor[0] * 255}, ${fogColor[1] * 255}, ${fogColor[2] * 255})` ;
            context.fillRect(0, 0, canvasWidth, canvasHeight);

        }   
        update(0);     
    
    }
}