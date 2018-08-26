const A_VERTEX_POSITION = 'aVertexPosition_';
const A_OFFSET_POINT = 'aOffsetPoint_';
const A_GRID_COORDINATE = 'aGridCoordinate_';

const U_MODEL_MATRIX = 'uModelMatrix_';
const U_VIEW_MATRIX = 'uViewMatrix_';
const U_PROJECTION_MATRIX = 'uProjectionMatrix_';
const U_PREVIOUS_VIEW_MATRIX = 'uPreviousViewMatrix_';
const U_GRID_MODE = 'uGridMode_';
const U_CYCLE_RADIANS = 'uCycleRadians_';
const U_OFFSET_MULTIPLIER = 'uOffsetMultiplier_';
const V_RELATIVE_POSITION = 'vRelativePosition_';
const V_GRID_COORDINATE = 'vGridCoordinate_';
const V_SCREEN_COORDINATE = 'vScreenCoordinate_';

let vertexShaderSource = `
precision lowp float;
attribute vec4 ${A_VERTEX_POSITION};
attribute vec4 ${A_OFFSET_POINT};
attribute vec4 ${A_GRID_COORDINATE};
uniform mat4 ${U_MODEL_MATRIX};
uniform mat4 ${U_VIEW_MATRIX};
uniform mat4 ${U_PREVIOUS_VIEW_MATRIX};
uniform mat4 ${U_PROJECTION_MATRIX};
uniform lowp int ${U_GRID_MODE};
uniform float ${U_CYCLE_RADIANS};
uniform float ${U_OFFSET_MULTIPLIER};
varying vec3 ${V_RELATIVE_POSITION};
varying vec3 ${V_GRID_COORDINATE};
varying vec4 ${V_SCREEN_COORDINATE};
void main() {
    vec3 adjustedVertexPosition = ${A_VERTEX_POSITION}.xyz;
    if( ${U_GRID_MODE} > 0 ) {
        adjustedVertexPosition += ${A_VERTEX_POSITION}.w * ${A_VERTEX_POSITION}.xyz * sin(${U_CYCLE_RADIANS} + ${A_GRID_COORDINATE}.w) + ${U_OFFSET_MULTIPLIER} * ${A_OFFSET_POINT}.w * ${A_OFFSET_POINT}.xyz;
    }
    
    vec4 vertexPosition = ${U_MODEL_MATRIX} * vec4(adjustedVertexPosition, 1.);
    vec4 relativeVertexPosition = ${U_VIEW_MATRIX} * vertexPosition;
    vec4 screenPosition = ${U_PROJECTION_MATRIX} * relativeVertexPosition;
    ${V_GRID_COORDINATE} = ${A_GRID_COORDINATE}.xyz;
    ${V_RELATIVE_POSITION} = relativeVertexPosition.xyz;    
    ${V_SCREEN_COORDINATE} = ${U_PROJECTION_MATRIX} * ${U_PREVIOUS_VIEW_MATRIX} * vertexPosition;
    gl_Position = screenPosition;
}
`;

const U_FILL_COLOR = 'uFillColor_';
const U_LINE_COLOR = 'uLineColor_';
const U_LINE_WIDTH = 'uLineWidth_';
const U_VISIBLE_DISTANCE = 'uVisibleDistance_';
const U_CAMERA_LIGHT = 'uCameraLight_';
const U_AMBIENT_LIGHT = 'uAmbientLight_';
const U_PREVIOUS = 'uPrevious_';
const U_PREVIOUS_DIMENSION = 'uPreviousDimension_';

let fragmentShaderSource = `
#extension GL_OES_standard_derivatives : enable
precision lowp float;
uniform vec3 ${U_FILL_COLOR};
uniform vec3 ${U_LINE_COLOR};
uniform float ${U_LINE_WIDTH};
uniform float ${U_VISIBLE_DISTANCE};
uniform vec2 ${U_CAMERA_LIGHT};
uniform float ${U_AMBIENT_LIGHT};
uniform sampler2D ${U_PREVIOUS};
uniform vec2 ${U_PREVIOUS_DIMENSION};
uniform lowp int ${U_GRID_MODE};
varying vec3 ${V_RELATIVE_POSITION};
varying vec3 ${V_GRID_COORDINATE};
varying vec4 ${V_SCREEN_COORDINATE};

vec4 getSampleColor(in vec4 currentColor, in vec2 screenCoordinate, inout float count) {
    vec4 previousColor = texture2D(${U_PREVIOUS}, screenCoordinate);
    float amt = (previousColor.a  - currentColor.a+ 1.) /2.;
    count += amt * (.3 + currentColor.a/2.3);
    return mix(currentColor, previousColor, amt);    
}

void main() {
    // TODO can shorten this for sure

    float distanceSquared = ${V_RELATIVE_POSITION}.x*${V_RELATIVE_POSITION}.x+${V_RELATIVE_POSITION}.y*${V_RELATIVE_POSITION}.y+${V_RELATIVE_POSITION}.z*${V_RELATIVE_POSITION}.z;
    float distance = sqrt(distanceSquared);
    float visibleDistanceSquared = ${U_VISIBLE_DISTANCE} * ${U_VISIBLE_DISTANCE};
    float fogginess = 0.;
    if( distance < ${U_VISIBLE_DISTANCE} ) {
        fogginess = clamp((visibleDistanceSquared-distanceSquared) / visibleDistanceSquared, 0., 1.);
    }
    
    float lighting = clamp((${U_CAMERA_LIGHT}.x-distance) / ${U_CAMERA_LIGHT}.x, 0., 1.) * ${U_CAMERA_LIGHT}.y + ${U_AMBIENT_LIGHT};
    float tileness = 1.;
    if( ${U_GRID_MODE} > 0 ) {
        vec3 d = fwidth(${V_GRID_COORDINATE});
        vec3 a3 = smoothstep(vec3(0.0), d*max(1., ${U_LINE_WIDTH} * (1. - distance/${U_VISIBLE_DISTANCE})), ${V_GRID_COORDINATE});
        tileness = min(min(a3.x, a3.y), a3.z);
    } else {
        float mn = min(${V_GRID_COORDINATE}.x - floor(${V_GRID_COORDINATE}.x), (${V_GRID_COORDINATE}.y - floor(${V_GRID_COORDINATE}.y))*${V_GRID_COORDINATE}.z);
        float mx = max(${V_GRID_COORDINATE}.x - floor(${V_GRID_COORDINATE}.x), (${V_GRID_COORDINATE}.y - floor(${V_GRID_COORDINATE}.y))*${V_GRID_COORDINATE}.z);
        if( mn < ${U_LINE_WIDTH} || mx > (1. - ${U_LINE_WIDTH}) ) {
            float m = min(mn, 1. - mx);
            tileness = m / ${U_LINE_WIDTH} * (1. - max(0., distance/${U_VISIBLE_DISTANCE}))*(1. - ${U_LINE_WIDTH}) + ${U_LINE_WIDTH};
            tileness *= tileness * tileness;
        }    
    }
    vec4 current = vec4(mix(${U_LINE_COLOR}, mix(vec3(0.), ${U_FILL_COLOR}, lighting), tileness), fogginess);
    // blur
    vec2 textureCoordinate = (${V_SCREEN_COORDINATE}.xy/${V_SCREEN_COORDINATE}.w)/2. + .5;
    float count = 0.;
    vec4 previous = getSampleColor(current, textureCoordinate, count);
    for( int i=1; i<7; ++i ) {
        float f = float(i*i+3)/2.;
        //float f = float(i);
        previous += getSampleColor(current, textureCoordinate + vec2(${U_PREVIOUS_DIMENSION}.x, 0.) * f, count);
        previous += getSampleColor(current, textureCoordinate - vec2(${U_PREVIOUS_DIMENSION}.x, 0.) * f, count);
        previous += getSampleColor(current, textureCoordinate + vec2(0., ${U_PREVIOUS_DIMENSION}.y) * f, count);
        previous += getSampleColor(current, textureCoordinate - vec2(0., ${U_PREVIOUS_DIMENSION}.y) * f, count);
    }
    if( count > 0. ) {
        //previous /= count;
        //current = vec4(mix(current.rgb, previous.rgb, .55), current.a);
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
    activeChunksWidth: number, 
    activeChunksHeight: number, 
    chunkWidth: number, 
    chunkHeight: number, 
    chunkGenerator: ChunkGenerator, 
    monsterGenerator: MonsterGenerator, 
    deathAnimationTime: number, 
    fogColor: Vector3
): ShowPlay {
    let canvas = document.getElementById('b') as HTMLCanvasElement;
    let context = canvas.getContext('2d');

    let visibleDistance = 80;//Math.min(activeTilesWidth, activeTilesHeight)/2;
    
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

        projectionMatrix = matrix4Perspective(Math.PI/4, canvasWidth/canvasHeight, .5, visibleDistance);
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
    let aVertexPosition = gl.getAttribLocation(shaderProgram, A_VERTEX_POSITION);
    let aGridCoordinate = gl.getAttribLocation(shaderProgram, A_GRID_COORDINATE);
    let aOffsetPoint = gl.getAttribLocation(shaderProgram, A_OFFSET_POINT);

    let uProjectionMatrix = gl.getUniformLocation(shaderProgram, U_PROJECTION_MATRIX);
    let uModelMatrix = gl.getUniformLocation(shaderProgram, U_MODEL_MATRIX);
    let uViewMatrix = gl.getUniformLocation(shaderProgram, U_VIEW_MATRIX);
    let uPreviousViewMatrix = gl.getUniformLocation(shaderProgram, U_PREVIOUS_VIEW_MATRIX);
    let uFillColor = gl.getUniformLocation(shaderProgram, U_FILL_COLOR);
    let uLineColor = gl.getUniformLocation(shaderProgram, U_LINE_COLOR);
    let uLineWidth = gl.getUniformLocation(shaderProgram, U_LINE_WIDTH);
    let uVisibleDistance = gl.getUniformLocation(shaderProgram, U_VISIBLE_DISTANCE);
    let uCameraLight = gl.getUniformLocation(shaderProgram, U_CAMERA_LIGHT);
    let uAmbientLight = gl.getUniformLocation(shaderProgram, U_AMBIENT_LIGHT);
    let uPrevious = gl.getUniformLocation(shaderProgram, U_PREVIOUS);
    let uPreviousDimension = gl.getUniformLocation(shaderProgram, U_PREVIOUS_DIMENSION);
    let uGridMode = gl.getUniformLocation(shaderProgram, U_GRID_MODE);
    let uCycleRadians = gl.getUniformLocation(shaderProgram, U_CYCLE_RADIANS);
    let uOffsetMultiplier = gl.getUniformLocation(shaderProgram, U_OFFSET_MULTIPLIER);

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

        let world = new World(activeChunksWidth, activeChunksHeight, chunkWidth, chunkHeight, chunkGenerator, monsterGenerator, deathAnimationTime);
        let entityCount = 0;
        for( let i=0; i<entityCount; i++ ) {
            let x = (Math.random() * activeChunksWidth - activeChunksWidth/2) * chunkWidth;
            let y = (Math.random() * activeChunksHeight - activeChunksHeight/2) * chunkHeight;
            let z = Math.random() * 2 + 3;
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
        let player = monsterGenerator(25, 0, 0, 2, 1);
        // let player = monsterGenerator(25, 36.53720576658002, -10.998682604682323, 1.3071719462051747, 1);
        // player.vx = 0.003461038012875774;
        // player.vy = -0.001968901198244335;
        // player.vz = 0.0014426801676311327;
        
        let walkDistance = 0;
        // TODO can remove once we get our model under control
        player.ry = 0;
        // end TODO
        player.visible = 0;
        player.side = SIDE_FRIEND;
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
            player.onCollision = function(this: Monster, other: Entity) {
                let result: number;
                if( other.isMonster ) {
                    this.deathAge = this.age;
                } else {
                    let surface = other as Surface;
                    // you can probably jump
                    if( surface.normal[2]>0) {
                        lastFloor = this.age;
                    }
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
                    bullet.side = SIDE_NEUTRAL;
                    bullet.onCollision = function(this: Monster, withEntity: Entity) {
                        if( withEntity.isMonster ) {
                            this.deathAge = this.age;
                        }
                    }
                    bullet.restitution = 1;
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
            for( let side in world.allEntities ) {
                let entities = world.allEntities[side];
                for( let entity of entities ) {
                    if( FLAG_GL_CULL_EXPLOSIONS ) {
                        gl.enable(gl.CULL_FACE);
                    }
        
                    webglBindAttributeBuffer(gl, entity.positionBuffer, aVertexPosition, 4);
                    webglBindAttributeBuffer(gl, entity.gridCoordinateBuffer, aGridCoordinate, 4);
                    
                    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, entity.indicesBuffer);
        
                    let translationMatrix = matrix4Translate(entity.x, entity.y, entity.z);
                    let lineColor = entity.lineColor;
                    let fillColor = entity.fillColor;
                    gl.uniform1f(uLineWidth, entity.lineWidth);
                    gl.uniform1i(uGridMode, entity.isMonster);
        
                    let offsetPointsBuffer: WebGLBuffer;
                    if( entity.isMonster ) {
                        offsetPointsBuffer = entity.centerPointsBuffer;
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
                        // doesn't get used, but put something in to prevent errors from disposed buffers
                        offsetPointsBuffer = entity.gridCoordinateBuffer;
    
                        let surface = entity as Surface;
                        gl.uniformMatrix4fv(uModelMatrix, false, surface.pointsToWorld);
                    }
                    webglBindAttributeBuffer(gl, offsetPointsBuffer, aOffsetPoint, 4); 
        
                    gl.uniform3fv(uFillColor, fillColor);
                    gl.uniform3fv(uLineColor, lineColor);
        
                    gl.drawElements(gl.TRIANGLES, entity.indicesCount, FLAG_GL_16_BIT_INDEXES?gl.UNSIGNED_SHORT:gl.UNSIGNED_BYTE, 0);
                }
                    
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
            let walkTranslationMatrix: Matrix4;
            if( FLAG_SHAKY_CAMERA ) {
                let screenShake = Math.max(0, (lastShot + 99 - world.age)/999);
                walkTranslationMatrix = matrix4Translate(
                    Math.sin(walkDistance)/8 + (Math.random() - .5)*screenShake, 
                    screenShake, 
                    Math.abs(Math.cos(walkDistance)/8) + (Math.random() - .5)*screenShake
                );
            }
            let rotationMatrixX = matrix4Rotate(1, 0, 0, world.cameraRotationX);
            // camera is never rotated on the y axis
            //let rotationMatrixY = matrix4Rotate(0, 1, 0, world.cameraRotationY);
            let rotationMatrixZ = matrix4Rotate(0, 0, 1, world.cameraRotationZ);
            let translationMatrix = matrix4Translate(-world.cameraX, -world.cameraY, -world.cameraZ);
            let viewMatrix = matrix4MultiplyStack([rotationMatrixX, /*rotationMatrixY,*/ walkTranslationMatrix, rotationMatrixZ, translationMatrix]);

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