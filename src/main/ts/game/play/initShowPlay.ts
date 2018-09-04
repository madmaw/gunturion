///<reference path="../../constants.ts"/>

const A_VERTEX_POSITION = 'aVertexPosition_';
const A_VERTEX_OFFSET = 'aVertexOffset_';
const A_GRID_COORDINATE = 'aGridCoordinate_';

const U_MODEL_MATRIX = 'uModelMatrix_';
const U_VIEW_MATRIX = 'uViewMatrix_';
const U_PROJECTION_MATRIX = 'uProjectionMatrix_';
const U_PREVIOUS_VIEW_MATRIX = 'uPreviousViewMatrix_';
const U_GRID_MODE = 'uGridMode_';
const U_CYCLE_RADIANS = 'uCycleRadians_';
const U_OFFSET_MULTIPLIER = 'uOffsetMultiplier_';
const U_SURFACE_NORMAL = 'uSurfaceNormal_';
const U_DIRECTED_LIGHTING_NORMAL = 'uDirectedLightingNormal_';
const U_DIRECTED_LIGHTING_RANGE = 'uDirectedLightingRange_';
const V_RELATIVE_POSITION = 'vRelativePosition_';
const V_GRID_COORDINATE = 'vGridCoordinate_';
const V_SCREEN_COORDINATE = 'vScreenCoordinate_';
const V_NORMAL_LIGHTING = 'vNormalLighting_';
const V_VERTEX_POSITION = 'vVertexPosition_';

const C_BLUR_ITERATIONS = 7;
const C_MAX_POWER_SOURCES = 9;

let vertexShaderSource = `
precision lowp float;
attribute vec4 ${A_VERTEX_POSITION};
attribute vec4 ${A_VERTEX_OFFSET};
attribute vec4 ${A_GRID_COORDINATE};
uniform mat4 ${U_MODEL_MATRIX};
uniform mat4 ${U_VIEW_MATRIX};
uniform mat4 ${U_PREVIOUS_VIEW_MATRIX};
uniform mat4 ${U_PROJECTION_MATRIX};
uniform vec3 ${U_SURFACE_NORMAL};
uniform vec4 ${U_DIRECTED_LIGHTING_NORMAL};
uniform lowp int ${U_GRID_MODE};
uniform float ${U_CYCLE_RADIANS};
uniform float ${U_OFFSET_MULTIPLIER};
varying vec3 ${V_VERTEX_POSITION};
varying vec3 ${V_RELATIVE_POSITION};
varying vec3 ${V_GRID_COORDINATE};
varying vec4 ${V_SCREEN_COORDINATE};
varying vec4 ${V_NORMAL_LIGHTING};

void main() {
    vec3 adjustedVertexPosition = ${A_VERTEX_POSITION}.xyz;
    float directedLighting;
    vec3 vertexNormal;
    if( ${U_GRID_MODE} > 0 ) {
        adjustedVertexPosition += ${A_VERTEX_OFFSET}.w * ${A_VERTEX_POSITION}.xyz * sin(${U_CYCLE_RADIANS} + ${A_GRID_COORDINATE}.w) + ${U_OFFSET_MULTIPLIER} * ${A_VERTEX_OFFSET}.xyz;
        vertexNormal = (${U_MODEL_MATRIX} * vec4(${A_VERTEX_POSITION}.xyz/${A_VERTEX_POSITION}.w, 1.) - ${U_MODEL_MATRIX} * vec4(vec3(0.), 1.)).xyz;
        
    } else {
        vertexNormal = ${U_SURFACE_NORMAL};
    }
    directedLighting = dot(vertexNormal, ${U_DIRECTED_LIGHTING_NORMAL}.xyz);
    vec4 relativeNormal = ${U_VIEW_MATRIX} * vec4(vertexNormal, 1.) - ${U_VIEW_MATRIX} * vec4(vec3(0.),1.);
    
    vec4 vertexPosition = ${U_MODEL_MATRIX} * vec4(adjustedVertexPosition, 1.);
    vec4 relativeVertexPosition = ${U_VIEW_MATRIX} * vertexPosition;
    vec4 screenPosition = ${U_PROJECTION_MATRIX} * relativeVertexPosition;
    ${V_GRID_COORDINATE} = ${A_GRID_COORDINATE}.xyz;
    ${V_RELATIVE_POSITION} = relativeVertexPosition.xyz;    
    ${V_SCREEN_COORDINATE} = ${U_PROJECTION_MATRIX} * ${U_PREVIOUS_VIEW_MATRIX} * vertexPosition;
    ${V_NORMAL_LIGHTING} = vec4(relativeNormal.xyz, (directedLighting + 1.) * ${U_DIRECTED_LIGHTING_NORMAL}.w);
    ${V_VERTEX_POSITION} = vertexPosition.xyz;
    gl_Position = screenPosition;
}
`;

const U_FILL_COLOR = 'uFillColor_';
const U_LINE_COLOR = 'uLineColor_';
const U_LINE_WIDTH = 'uLineWidth_';
const U_VISIBLE_DISTANCE = 'uVisibleDistance_';
const U_CAMERA_LIGHT = 'uCameraLight_';
const U_AMBIENT_LIGHT = 'uAmbientLight_';
const U_GRID_DIMENSION= 'uGridDimension_';
const U_GRID_LIGHTING = 'uGridLighting_';
const U_PREVIOUS = 'uPrevious_';
const U_PREVIOUS_DIMENSION = 'uPreviousDimension_';
const U_POWER_SOURCES = 'uPowerSources_';
const U_POWER_SOURCE_COUNT = 'uPowerSourceCount_';

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
uniform vec2 ${U_GRID_DIMENSION};
uniform float ${U_GRID_LIGHTING}[4];
uniform vec4 ${U_DIRECTED_LIGHTING_RANGE};
uniform vec4 ${U_POWER_SOURCES}[${C_MAX_POWER_SOURCES}];
uniform lowp int ${U_POWER_SOURCE_COUNT};
varying vec3 ${V_VERTEX_POSITION};
varying vec3 ${V_RELATIVE_POSITION};
varying vec3 ${V_GRID_COORDINATE};
varying vec4 ${V_SCREEN_COORDINATE};
varying vec4 ${V_NORMAL_LIGHTING};

vec4 getSampleColor(vec2 screenCoordinate, int div, inout float count) {
    vec4 previousColor = texture2D(${U_PREVIOUS}, screenCoordinate);
    if( previousColor.a > .1 ) {
        float mult = ${C_BLUR_ITERATIONS}./float(${C_BLUR_ITERATIONS} - div); 
        count += mult;
        return previousColor * mult;
    } else {
        return vec4(0.);
    }
}

void main() {
    // TODO can shorten this for sure
    float distanceSquared = ${V_RELATIVE_POSITION}.x*${V_RELATIVE_POSITION}.x+${V_RELATIVE_POSITION}.y*${V_RELATIVE_POSITION}.y+${V_RELATIVE_POSITION}.z*${V_RELATIVE_POSITION}.z;
    float distance = sqrt(distanceSquared);
    vec3 relativeNormal = ${V_RELATIVE_POSITION}/distance;
    float visibleDistanceSquared = ${U_VISIBLE_DISTANCE} * ${U_VISIBLE_DISTANCE};
    float fogginess = 0.;
    if( distance < ${U_VISIBLE_DISTANCE} ) {
        fogginess = clamp((visibleDistanceSquared-distanceSquared) / visibleDistanceSquared, 0., 1.);
    }
    vec3 gridColor = vec3(0.);
    float gridPower = 0.;
    for( int i=0; i<${C_MAX_POWER_SOURCES}; i++ ) {
        if( i < ${U_POWER_SOURCE_COUNT} ) {
            vec4 powerSource = ${U_POWER_SOURCES}[i];
            vec2 powerSourceDelta = powerSource.xy - ${V_VERTEX_POSITION}.xy;
            float d = sqrt(powerSourceDelta.x*powerSourceDelta.x + powerSourceDelta.y*powerSourceDelta.y);
            if( d < powerSource.z ) {
                float p = d/powerSource.z;
                float v = 1. - p*p;
                gridPower += v;
                gridColor += vec3(.5, powerSource.w, .5 - powerSource.w) * v;
            }
        }
    }
    if( gridPower > 0. ) {
        gridColor /= gridPower;
    }
    float gridLighting = ${V_NORMAL_LIGHTING}.w * (1. - min((${V_VERTEX_POSITION}.z - (${V_VERTEX_POSITION}.x - ${U_DIRECTED_LIGHTING_RANGE}.x)*${U_DIRECTED_LIGHTING_RANGE}.y - ${U_DIRECTED_LIGHTING_RANGE}.z)/${U_DIRECTED_LIGHTING_RANGE}.w, 1.));
    float pointLighting = clamp((${U_CAMERA_LIGHT}.x-distance) / ${U_CAMERA_LIGHT}.x, 0., 1.) * -dot(relativeNormal,${V_NORMAL_LIGHTING}.xyz) * ${U_CAMERA_LIGHT}.y;
    float lighting = pointLighting + ${U_AMBIENT_LIGHT} + ${V_NORMAL_LIGHTING}.w;
    float tileness = 1.;
    vec3 fillColor;
    vec3 lineColor;
    if( ${U_GRID_MODE} > 0 ) {
        vec3 d = fwidth(${V_GRID_COORDINATE});
        vec3 a3 = smoothstep(vec3(0.0), d*max(1., ${U_LINE_WIDTH} * (1. - distance/${U_VISIBLE_DISTANCE})), ${V_GRID_COORDINATE});
        tileness = min(min(a3.x, a3.y), a3.z);
        fillColor = ${U_FILL_COLOR};
        lineColor = ${U_LINE_COLOR};
    } else {
        float gx = floor(${V_GRID_COORDINATE}.x);
        float gy = floor(${V_GRID_COORDINATE}.y);
        float mn = min(${V_GRID_COORDINATE}.x - gx, (${V_GRID_COORDINATE}.y - gy)*${V_GRID_COORDINATE}.z);
        float mx = max(${V_GRID_COORDINATE}.x - gx, (${V_GRID_COORDINATE}.y - gy)*${V_GRID_COORDINATE}.z);
        float lineWidth = 1./60.; 
        if( mn < lineWidth || mx > (1. - lineWidth) ) {
            float m = min(mn, 1. - mx);
            tileness = m / lineWidth * (1. - max(0., distance/${U_VISIBLE_DISTANCE}))*(1. - lineWidth) + lineWidth;
            tileness *= tileness * tileness;
        }    
        float bit = gy*${U_GRID_DIMENSION}.x+gx;
        for( int i=0; i<4; i++ ) {
            if( bit < ${CONST_GL_SAFE_BITS}. && bit >= 0. ) {
                lighting = max(lighting, mod(floor(${U_GRID_LIGHTING}[i]/pow(2.,bit)), 2.)*3.);
            } 
            bit -= ${CONST_GL_SAFE_BITS}.;
        }
        gridColor = mix(${U_LINE_COLOR}, gridColor, gridPower);
        lineColor = gridColor;
        fillColor = ${U_FILL_COLOR};
    }
    vec4 current = vec4(mix(lineColor, mix(vec3(0.), mix(fillColor, gridColor, gridLighting*gridLighting), lighting), tileness), fogginess);
    // blur
    vec2 textureCoordinate = (${V_SCREEN_COORDINATE}.xy/${V_SCREEN_COORDINATE}.w)/2. + .5;
    float count = 0.;
    vec4 previous = getSampleColor(textureCoordinate, 0, count);
    for( int i=1; i<${C_BLUR_ITERATIONS}; ++i ) {
        //float f = float(i*i+2)/2.;
        float f = float(i);
        previous += getSampleColor(textureCoordinate + vec2(${U_PREVIOUS_DIMENSION}.x, 0.) * f, i, count);
        previous += getSampleColor(textureCoordinate - vec2(${U_PREVIOUS_DIMENSION}.x, 0.) * f, i, count);
        previous += getSampleColor(textureCoordinate + vec2(0., ${U_PREVIOUS_DIMENSION}.y) * f, i, count);
        previous += getSampleColor(textureCoordinate - vec2(0., ${U_PREVIOUS_DIMENSION}.y) * f, i, count);
    }
    if( count > 0. ) {
        previous /= count;          
        float focus = sqrt(sqrt(previous.a));
        current = vec4(current.rgb * focus * 1.3 + previous.rgb * (1.4 - focus*.8), current.a);
    }

    gl_FragColor = current;
}
`;

interface ShowPlay {
    () : void;
}

function initShowPlay(
    seed: number,
    rngFactory: RandomNumberGeneratorFactory,
    offscreenCanvas: HTMLCanvasElement,
    gl: WebGLRenderingContext,
    chunkGenerator: ChunkGenerator, 
    monsterGenerator: MonsterGenerator
): ShowPlay {
    let canvas = document.getElementById('b') as HTMLCanvasElement;
    let context = canvas.getContext('2d');
    let skybox = document.createElement('img');

    let textureData: Uint8Array;
    let textureImageData: ImageData;
    let sourceTexture: WebGLTexture;
    let targetTexture: WebGLTexture;
    let frameBuffer: WebGLFramebuffer;
    let depthBuffer: WebGLRenderbuffer;

    let projectionMatrix: Matrix4;
    let canvasWidth: number;
    let canvasHeight: number;
    let aspectRatio: number;

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

        aspectRatio = canvasWidth/canvasHeight;
        projectionMatrix = matrix4Perspective(
            CONST_FOV, 
            aspectRatio, 
            CONST_BASE_RADIUS/2, 
            CONST_VISIBLE_DISTANCE
        );
        let flipMatrix = matrix4Scale(1, -1, 1);
        projectionMatrix = matrix4Multiply(projectionMatrix, flipMatrix);
    
        // pretty sure we didn't use to need this?
        gl.viewport(0, 0, canvasWidth, canvasHeight);

        if( FLAG_BACKGROUND ) {
            // (p)re-render the background

            let skyGradient = context.createLinearGradient(0, 0, 0, canvasHeight/2);
            skyGradient.addColorStop(0, CONST_SKY_COLOR_HIGH_RGB);
            skyGradient.addColorStop(1, CONST_SKY_COLOR_LOW_RGB);
            context.fillStyle = skyGradient;
            context.fillRect(0, 0, canvasWidth, canvasHeight);
            let rng = rngFactory(0);
            let i = 5;
            while( --i ) {
                context.fillStyle = CONST_BUILDING_COLORS_RGB[i - 1];

                let x = 0;
                while( x < canvasWidth ) {
                    let y = (rng(canvasHeight) + canvasHeight*3)*(Math.sqrt(6 - i))/25 + canvasHeight/5;
                    let w = (rng(canvasWidth/19) + canvasWidth/49) / (aspectRatio * i);
                    context.fillRect(x, y, w, canvasHeight);
                    x += w;
                }    
            }

            skybox.src = canvas.toDataURL();
        }
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
    let aVertexOffset = gl.getAttribLocation(shaderProgram, A_VERTEX_OFFSET);

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
    let uGridDimension = gl.getUniformLocation(shaderProgram, U_GRID_DIMENSION);
    let uGridLighting = gl.getUniformLocation(shaderProgram, U_GRID_LIGHTING);
    let uCycleRadians = gl.getUniformLocation(shaderProgram, U_CYCLE_RADIANS);
    let uOffsetMultiplier = gl.getUniformLocation(shaderProgram, U_OFFSET_MULTIPLIER);
    let uDirectedLightingNormal = gl.getUniformLocation(shaderProgram, U_DIRECTED_LIGHTING_NORMAL);
    let uDirectedLightingRange = gl.getUniformLocation(shaderProgram, U_DIRECTED_LIGHTING_RANGE);
    let uSurfaceNormal = gl.getUniformLocation(shaderProgram, U_SURFACE_NORMAL);
    let uPowerSources = gl.getUniformLocation(shaderProgram, U_POWER_SOURCES);
    let uPowerSourceCount = gl.getUniformLocation(shaderProgram, U_POWER_SOURCE_COUNT);

    gl.uniform1f(uVisibleDistance, CONST_VISIBLE_DISTANCE);
    gl.uniform4fv(uDirectedLightingNormal, CONST_DIRECTIONAL_LIGHT);
    
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

        // generate something gun-like
        let posString = localStorage.getItem(''+seed);
        let pos: Vector3;
        if( posString ) {
            pos = JSON.parse(posString);
        } else {
            pos = [0, 0, 0];
        }
        
        let world = new World(
            chunkGenerator, 
            monsterGenerator, 
            pos
        );

        let displayMessageTime: number;
        let displayMessage: string;
        let say = function(message: string) {
            if( FLAG_SPEECH ) {
                let ut = new SpeechSynthesisUtterance(message);
                speechSynthesis.speak(ut);
                ut.onend = function() {
                    displayMessageTime = world.age - CONST_MESSAGE_TIME;
                }
            }
            displayMessage = message;
            displayMessageTime = world.age;
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
    
        // let player = monsterGenerator(25, -0.000007635353276777558, -4.675305475382446e-22, 0.4900000000000674, CONST_BASE_RADIUS);
        // player.vx = -0.00019996952947114684;
        // player.vy = -1.2244602209692118e-20;
        // player.vz = -2.404588689359089e-9;
        
        let walkDistance = 0;
        // TODO can remove once we get our model under control
        let player = monsterGenerator(
            25, 
            pos[0], pos[1], pos[2] + 2, 
            .49
        );
        player.ry = 0;
        // end TODO
        //player.visible = 0;
        player.side = SIDE_PLAYER;
        player.lineColor = [.7, .7, .3];
        player.fillColor = [.2, .2, 0];
        // make it look like a gun
        let scale = .15;
        player.die = function() {
            player.deathAge = player.age;
            say("HULL FAILURE");
        }
        
        player.specialMatrix = matrix4MultiplyStack([
            matrix4Translate(player.radius, -player.radius/CONST_GUN_BARREL_OFFSET_DIV, 0), 
            matrix4Rotate(0, 1, 0, Math.PI/2), 
            matrix4Scale(scale, scale, CONST_GUN_BARREL_LENGTH_MULT)
        ]);
        //player.specialMatrix = matrix4Translate(2, 0, -player.radius/2);
        let lastShot = 0;
        let lastPower = 0;
        let lastFloor = 0;
        if( FLAG_ALLOW_JUMPING ) {
            player.onCollision = function(this: Monster, world: World, other: Entity) {
                let result: number;
                if( other.type ) {
                    if( !FLAG_TEST_PHYSICS ) {
                        this.die(world, other);
                    }
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
            
            let baseVelocity = .004;
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
                player.vz = .015;
                lastFloor = 0;
            }
            player.vx = vx;
            player.vy = vy;

            // work out our gun power
            let power = 0;
            // buildings are already sorted
            let buildings = world.allEntities[SIDE_BUILDING] as Building[];
            let i = 0;
            while( i < buildings.length ) {
                let building = buildings[i++];
                let buildingX = building.chunkX * CONST_CHUNK_WIDTH + CONST_CHUNK_WIDTH/2;
                let buildingY = building.chunkY * CONST_CHUNK_HEIGHT + CONST_CHUNK_HEIGHT/2;
                let dx = player.x - buildingX;
                let dy = player.y - buildingY;
                let dsq = dx * dx + dy * dy;
                let extendedBuildingPower = building.power * CONST_BUILDING_POWER_EXTRA; 
                if ( dsq < extendedBuildingPower * extendedBuildingPower ) {
                    let d = extendedBuildingPower - Math.sqrt(dsq);
                    power += d*d/(CONST_NORMAL_POWER_DISTANCE*extendedBuildingPower);
                }
            }
            if( lastPower && !power && window.speechSynthesis ) {
                // issue a warning
                say("WEAPONS OFFLINE");
            } else if( !lastPower && power ) {
                say('WEAPONS ONLINE');
            }    
            lastPower = power;
            if( shooting && power ) {
                let shotInterval = CONST_BASE_BULLET_INTERVAL + CONST_DELTA_BULLET_INTERVAL * (1 - Math.sqrt(power));
                if( player.age > lastShot + shotInterval ) {
                    let sinX = Math.sin(player.rx);
                    let cosX = Math.cos(player.rx);
                    if( lastShot + shotInterval + amt > player.age ) {
                        lastShot = lastShot + shotInterval;
                    } else {
                        lastShot = player.age;
                    }
                    // shoot
                    let bullet = monsterGenerator(
                        818, 
                        player.x + player.radius*cosZSide/CONST_GUN_BARREL_OFFSET_DIV + player.radius*cosZ*(CONST_GUN_BARREL_LENGTH_MULT+CONST_BULLET_RADIUS), 
                        player.y + player.radius*sinZSide/CONST_GUN_BARREL_OFFSET_DIV + player.radius*sinZ*(CONST_GUN_BARREL_LENGTH_MULT+CONST_BULLET_RADIUS), 
                        player.z + sinX * player.radius*(CONST_GUN_BARREL_LENGTH_MULT + CONST_BULLET_RADIUS), 
                        CONST_BULLET_RADIUS, 
                        CONST_BULLET_LIFESPAN
                    );
                    bullet.side = SIDE_NEUTRAL;
                    bullet.onCollision = function(this: Monster, world: World, withEntity: Entity) {
                        if( !FLAG_TEST_PHYSICS ) {
                            bullet.die(world, withEntity);  
                        }
                        if( withEntity.type ) {                            
                            if( FLAG_LOG_KILLS ) {
                                console.log('killed seed', (withEntity as Monster).seed);
                            }
                        }
                    }
                    if( FLAG_TEST_PHYSICS ) {
                        bullet.restitution = 1;
                    }
                    bullet.vx = cosX * cosZ * CONST_BULLET_VELOCITY;
                    bullet.vy = cosX * sinZ * CONST_BULLET_VELOCITY;
                    bullet.vz = sinX * CONST_BULLET_VELOCITY;
                    bullet.fillColor = player.fillColor;
                    bullet.lineColor = player.lineColor;
                    bullet.gravityMultiplier = 0;

                    world.addEntity(bullet);
                }
            }
        }
        world.addEntity(player);


        let render = function(projectionMatrix: Matrix4, viewMatrix: Matrix4, previousViewMatrix: Matrix4) {
            // Clear the color buffer with specified clear color
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
            let buildings = world.allEntities[SIDE_BUILDING] as Building[];
            let powerSources: number[] = [];
            let powerSourceCount = Math.min(buildings.length, C_MAX_POWER_SOURCES);
            for( let i=0; i<powerSourceCount; i++ ) {
                let building = buildings[i] as Building;
                powerSources.push(
                    building.chunkX * CONST_CHUNK_WIDTH + CONST_CHUNK_WIDTH/2, 
                    building.chunkY * CONST_CHUNK_HEIGHT + CONST_CHUNK_HEIGHT/2, 
                    Math.sqrt(building.power) * 2 + CONST_CHUNK_DIMENSION_MAX, 
                    building.friendliness * .5
                );
            }

            gl.uniform4fv(uPowerSources, powerSources);
            gl.uniform1i(uPowerSourceCount, powerSourceCount);

            gl.bindTexture(gl.TEXTURE_2D, sourceTexture);
            gl.uniform1i(uPrevious, 0);
            gl.uniform2f(uPreviousDimension, 1/canvasWidth, 1/canvasHeight);
            gl.uniformMatrix4fv(uProjectionMatrix, false, projectionMatrix);
            gl.uniformMatrix4fv(uViewMatrix, false, viewMatrix);
            gl.uniformMatrix4fv(uPreviousViewMatrix, false, previousViewMatrix);
            

            if( FLAG_MUZZLE_FLASH ) {
                let shotLightBonus = Math.max(0, lastShot + CONST_MUZZEL_FLASH_DURATION - world.age)/CONST_MUZZEL_FLASH_DURATION;
                gl.uniform2f(uCameraLight, CONST_CAMERA_LIGHT_DISTANCE + shotLightBonus, CONST_CAMERA_LIGHT_INTENSITY + shotLightBonus*.2);    
            } else {
                gl.uniform2f(uCameraLight, CONST_CAMERA_LIGHT_DISTANCE, CONST_CAMERA_LIGHT_INTENSITY);    
            }
    
            // draw all the entities
            for( let side in world.allEntities ) {
                if( side as any != SIDE_BUILDING ) {
                    let entities = world.allEntities[side];
                    for( let entity of entities ) {
                        let surfaceOrMonster = entity as Surface | Monster;
                        if( FLAG_GL_CULL_EXPLOSIONS ) {
                            gl.enable(gl.CULL_FACE);
                        }
            
                        webglBindAttributeBuffer(gl, surfaceOrMonster.positionBuffer, aVertexPosition, 4);
                        webglBindAttributeBuffer(gl, surfaceOrMonster.gridCoordinateBuffer, aGridCoordinate, 4);
                        
                        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, surfaceOrMonster.indicesBuffer);
            
                        let fillColor = surfaceOrMonster.fillColor;
                        let directedLightingRange: Vector4;
                        let ambientLighting = CONST_AMBIENT_LIGHT_INTENSITY;
                        if( surfaceOrMonster.lastDamageAge && surfaceOrMonster.lastDamageAge + CONST_DAMAGE_FLASH_DURATION > world.age ) {
                            ambientLighting += (1 - (surfaceOrMonster.lastDamageAge + CONST_DAMAGE_FLASH_DURATION - world.age)/CONST_DAMAGE_FLASH_DURATION)/2;
                        }
    

                        gl.uniform1i(uGridMode, entity.type);

                        let offsetBuffer: WebGLBuffer;
                        if( entity.type ) {
                            let monster = entity as Monster; 
                            offsetBuffer = monster.offsetBuffer;
                            let translationMatrix = matrix4Translate(monster.x, monster.y, monster.z);
                            let rotationMatrixX = matrix4Rotate(0, 1, 0, -monster.rx);
                            let rotationMatrixY = matrix4Rotate(1, 0, 0, -monster.ry);
                            let rotationMatrixZ = matrix4Rotate(0, 0, 1, -monster.rz);

                            let matrixStack = [translationMatrix, rotationMatrixZ, rotationMatrixX, rotationMatrixY, monster.specialMatrix];

                            // attempt to find the surface this entity is above
                            directedLightingRange = [0, 0, 0, 0];
                            let surfaces = world.getEntitiesAt(monster.x/CONST_CHUNK_WIDTH | 0, monster.y/CONST_CHUNK_HEIGHT | 0);
                            if( surfaces && surfaces.length ) {
                                let surface = surfaces[0] as Surface;
                                if( surface ) {
                                    directedLightingRange = surface.directedLightingRange;
                                }
                            }
            
                            let cycle = entity.age / monster.cycleLength;
                            let offsetMultiplier = 0;
                            let lineColor = monster.lineColor;
                            if( monster.deathAge ) {
                                if( !FLAG_GL_CULL_EXPLOSIONS ) {
                                    gl.disable(gl.CULL_FACE);
                                }
                                let b = (entity.age - monster.deathAge)/CONST_DEATH_ANIMATION_TIME;
                                let bsq = b * b;
                                let scale = 1 - bsq*.99;
                                offsetMultiplier = bsq * 3 * monster.radius / scale; 
                                // explode away from the camera
                                //matrixStack.splice(1, 0, matrix4Scale(1 - b * sinZ, 1 - b * cosZ, 1 - b));
                                matrixStack.splice(1, 0, matrix4Scale(scale, scale, scale));
                                lineColor = vector3Mix(CONST_FOG_COLOR_VECTOR, lineColor, bsq);
                                fillColor = vector3Mix(CONST_FOG_COLOR_VECTOR, fillColor, bsq);
                                // do one last animation
                                cycle = monster.deathAge / monster.cycleLength + (monster.age - monster.deathAge)/CONST_DEATH_ANIMATION_TIME;
                            }
                            gl.uniform1f(uCycleRadians, cycle * Math.PI * 2);
                            gl.uniform1f(uOffsetMultiplier, offsetMultiplier);
                            gl.uniform1f(uLineWidth, monster.lineWidth);
                            gl.uniform3fv(uLineColor, lineColor);
            
                            let modelMatrix = matrix4MultiplyStack(matrixStack);
                            gl.uniformMatrix4fv(uModelMatrix, false, modelMatrix);
            
                        } else {
                            let surface = entity as Surface;
                            // doesn't get used, but put something in to prevent errors from disposed buffers
                            offsetBuffer = surface.gridCoordinateBuffer;

                            gl.uniform3fv(uSurfaceNormal, surface.normal);
                            gl.uniformMatrix4fv(uModelMatrix, false, surface.pointsToWorld);
                            gl.uniform2f(uGridDimension, surface.width, surface.height);
                            gl.uniform1fv(uGridLighting, surface.gridLighting);
                            gl.uniform3fv(uLineColor, CONST_INERT_GRID_COLOR_RGB);
                            directedLightingRange = surface.directedLightingRange;
                        }
                        webglBindAttributeBuffer(gl, offsetBuffer, aVertexOffset, 4); 
            
                        gl.uniform3fv(uFillColor, fillColor);
                        gl.uniform4fv(uDirectedLightingRange, directedLightingRange);
                        gl.uniform1f(uAmbientLight, ambientLighting);

                        gl.drawElements(gl.TRIANGLES, surfaceOrMonster.indicesCount, FLAG_GL_16_BIT_INDEXES?gl.UNSIGNED_SHORT:gl.UNSIGNED_BYTE, 0);
                    }
                }                    
            }
        }

        let previousViewMatrix = matrix4Identity();
        let update = function(now: number) {
            
            animationFrameHandle = requestAnimationFrame(update);

            let diff = Math.min(CONST_MAX_FRAME_DURATION, now - then);
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
                player.z + player.radius + deadness * CONST_VISIBLE_DISTANCE/2, 
                (player.rx + Math.PI/2) * (1 - deadness), 
                player.ry, 
                player.rz - Math.PI/2
            );

            // adjust for walk animation
            let walkTranslationMatrix: Matrix4;
            if( FLAG_SHAKY_CAMERA ) {
                let screenShake = Math.max(0, (lastShot + 99 - world.age)/999);
                walkTranslationMatrix = matrix4Translate(
                    Math.sin(walkDistance)*player.radius/8 + (Math.random() - .5)*screenShake, 
                    screenShake, 
                    Math.abs(Math.cos(walkDistance)*player.radius/8) + (Math.random() - .5)*screenShake
                );
            }
            let rotationMatrixX = matrix4Rotate(1, 0, 0, world.cameraRotationX);
            // camera is never rotated on the y axis
            //let rotationMatrixY = matrix4Rotate(0, 1, 0, world.cameraRotationY);
            let rotationMatrixZ = matrix4Rotate(0, 0, 1, world.cameraRotationZ);
            let translationMatrix = matrix4Translate(-world.cameraX, -world.cameraY, -world.cameraZ);
            let viewMatrix = matrix4MultiplyStack([rotationMatrixX, /*rotationMatrixY,*/ walkTranslationMatrix, rotationMatrixZ, translationMatrix]);
            // sort the buildings so they are closest to the player
            let buildings = world.allEntities[SIDE_BUILDING] as Building[];            
            buildings.sort(function(a: Building, b: Building) {
                let dxa = world.cameraX - a.chunkX * CONST_CHUNK_WIDTH;              
                let dya = world.cameraY - a.chunkY * CONST_CHUNK_HEIGHT;
                let dxb = world.cameraX - b.chunkX * CONST_CHUNK_WIDTH;
                let dyb = world.cameraY - b.chunkY * CONST_CHUNK_HEIGHT;
                return dxa * dxa + dya * dya - dxb * dxb - dyb * dyb;  
            });

            render(projectionMatrix, viewMatrix, previousViewMatrix);

            previousViewMatrix = viewMatrix;            

            let tmp = sourceTexture;
            sourceTexture = targetTexture;
            targetTexture = tmp;

            gl.readPixels(0, 0, canvasWidth, canvasHeight, gl.RGBA, gl.UNSIGNED_BYTE, textureData);
            textureImageData.data.set(textureData);
            context.putImageData(textureImageData, 0, 0);    

            context.globalCompositeOperation = 'destination-over';
            // draw in a background
            if( FLAG_BACKGROUND ) {
                let screenPosition = vector3TransformMatrix4(
                    0, 
                    CONST_VISIBLE_DISTANCE, 
                    0, 
                    matrix4Multiply(projectionMatrix, rotationMatrixX)
                );
                // only need y from screen position
                let backgroundY = (screenPosition[1] * canvasHeight)/2 + 99;
                let backgroundX = (world.cameraRotationZ * canvasWidth / (CONST_FOV * aspectRatio)) % canvasWidth - canvasWidth;

                while( backgroundX < canvasWidth ) 
                {
                    context.drawImage(skybox, backgroundX, backgroundY - canvasHeight/2);
                    backgroundX += canvasWidth;
                }
    
                context.fillStyle = CONST_SKY_COLOR_HIGH_RGB;
                context.fillRect(0, 0, canvasWidth, canvasHeight);
                
            } else {
                context.fillStyle = CONST_FOG_COLOR_RGB;
                context.fillRect(0, 0, canvasWidth, canvasHeight);    
            }

            context.globalCompositeOperation = 'source-over';
            if( FLAG_SHOW_FPS && diff ) {
                context.textAlign = 'left';
                context.font = `12px sans-serif`;
                context.fillStyle = '#f00';
                frames ++;
                context.fillText(`${Math.round((frames * 1000)/now)} (${Math.round(1000/diff)}) FPS`, 10, 30);    
            } 

            context.fillStyle = context.strokeStyle = '#fff';
            context.globalAlpha = Math.abs(Math.sin(world.age/99))/2+.5;
            if( displayMessageTime && world.age - displayMessageTime < CONST_MESSAGE_TIME ) {
                context.textAlign = 'center';
                context.font = `${CONST_STATUS_HEIGHT}px sans-serif`;
                context.fillText(displayMessage, canvasWidth/2, canvasHeight/2);
            }
            if( !player.deathAge ) {
                if( lastPower ) {
                    context.globalAlpha = 1;
                    let fillStyle;                
                    if( lastPower < .2 ) {
                        fillStyle = 'red';
                    }  else if( lastPower < .5 ) {
                        fillStyle = '#ff0';
                    } else {
                        fillStyle = '#6f6';
                    }
                    context.fillStyle = fillStyle;
                } else {
                    context.strokeStyle = 'red';
                }
                // show grid power
                context.fillRect(canvasWidth - CONST_STATUS_HEIGHT * 3, CONST_STATUS_HEIGHT, CONST_STATUS_HEIGHT * 2 * lastPower, CONST_STATUS_HEIGHT);
                context.strokeRect(canvasWidth - CONST_STATUS_HEIGHT * 3, CONST_STATUS_HEIGHT, CONST_STATUS_HEIGHT * 2, CONST_STATUS_HEIGHT);    
            }
            context.globalAlpha = 1;
        }   
        update(0);     
    
    }
}