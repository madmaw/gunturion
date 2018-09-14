///<reference path="../../constants.ts"/>

const A_VERTEX_POSITION = FLAG_SHORTEN_GLSL_VARIABLES?'a':'aVertexPosition_';
const A_VERTEX_OFFSET = FLAG_SHORTEN_GLSL_VARIABLES?'b':'aVertexOffset_';
const A_GRID_COORDINATE = FLAG_SHORTEN_GLSL_VARIABLES?'c':'aGridCoordinate_';

const U_MODEL_MATRIX = FLAG_SHORTEN_GLSL_VARIABLES?'d':'uModelMatrix_';
const U_VIEW_MATRIX = FLAG_SHORTEN_GLSL_VARIABLES?'e':'uViewMatrix_';
const U_PROJECTION_MATRIX = FLAG_SHORTEN_GLSL_VARIABLES?'f':'uProjectionMatrix_';
const U_PREVIOUS_VIEW_MATRIX = FLAG_SHORTEN_GLSL_VARIABLES?'g':'uPreviousViewMatrix_';
const U_GRID_MODE = FLAG_SHORTEN_GLSL_VARIABLES?'h':'uGridMode_';
const U_CYCLE_RADIANS = FLAG_SHORTEN_GLSL_VARIABLES?'j':'uCycleRadians_';
const U_OFFSET_MULTIPLIER = FLAG_SHORTEN_GLSL_VARIABLES?'k':'uOffsetMultiplier_';
const U_SURFACE_NORMAL = FLAG_SHORTEN_GLSL_VARIABLES?'l':'uSurfaceNormal_';
const U_DIRECTED_LIGHTING_NORMAL = FLAG_SHORTEN_GLSL_VARIABLES?'m':'uDirectedLightingNormal_';
const U_DIRECTED_LIGHTING_RANGE = FLAG_SHORTEN_GLSL_VARIABLES?'n':'uDirectedLightingRange_';
const V_RELATIVE_POSITION = FLAG_SHORTEN_GLSL_VARIABLES?'o':'vRelativePosition_';
const V_GRID_COORDINATE = FLAG_SHORTEN_GLSL_VARIABLES?'p':'vGridCoordinate_';
const V_SCREEN_COORDINATE = FLAG_SHORTEN_GLSL_VARIABLES?'q':'vScreenCoordinate_';
const V_NORMAL_LIGHTING = FLAG_SHORTEN_GLSL_VARIABLES?'r':'vNormalLighting_';
const V_VERTEX_POSITION = FLAG_SHORTEN_GLSL_VARIABLES?'s':'vVertexPosition_';

const C_BLUR_ITERATIONS = FLAG_BLOOM?7:0;
const C_MAX_POWER_SOURCES = 16;
const C_GRID_LIGHT_MULTIPLIER = '.4';
const C_LINE_WIDTH = '2.';
const C_NEON_LIGHTING = '6.';

const L_RELATIVE_AND_ADJUSTED_VERTEX_POSITION = FLAG_SHORTEN_GLSL_VARIABLES?'t':'adjustedVertePosition_';
const L_VERTEX_NORMAL = FLAG_SHORTEN_GLSL_VARIABLES?'u':'vertexNormal_';
const L_VERTEX_POSITION = FLAG_SHORTEN_GLSL_VARIABLES?'v':'vertexPosition_';
//const L_RELATIVE_VERTEX_POSITION = FLAG_SHORTEN_GLSL_VARIABLES?'w':'relativeVertexPosition_';


let vertexShaderSource = 
`precision lowp float;
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
varying vec4 ${V_VERTEX_POSITION};
varying vec4 ${V_RELATIVE_POSITION};
varying vec4 ${V_GRID_COORDINATE};
varying vec4 ${V_SCREEN_COORDINATE};
varying vec4 ${V_NORMAL_LIGHTING};
void main(){
    vec4 ${L_RELATIVE_AND_ADJUSTED_VERTEX_POSITION}=${A_VERTEX_POSITION};
    vec3 ${L_VERTEX_NORMAL}=${U_SURFACE_NORMAL};
    if(${U_GRID_MODE}>0){
        ${L_RELATIVE_AND_ADJUSTED_VERTEX_POSITION}+=${A_VERTEX_OFFSET}.w*${A_VERTEX_POSITION}*sin(${U_CYCLE_RADIANS}+${A_GRID_COORDINATE}.w)+${U_OFFSET_MULTIPLIER}*${A_VERTEX_OFFSET};
        ${L_VERTEX_NORMAL}=(${U_MODEL_MATRIX}*vec4(${A_VERTEX_POSITION}.xyz/${A_VERTEX_POSITION}.w,1.)-${U_MODEL_MATRIX}*vec4(vec3(0.), 1.)).xyz;
    }
    vec4 ${L_VERTEX_POSITION}=${U_MODEL_MATRIX}*vec4(${L_RELATIVE_AND_ADJUSTED_VERTEX_POSITION}.xyz,1.);
    ${L_RELATIVE_AND_ADJUSTED_VERTEX_POSITION}=${U_VIEW_MATRIX}*${L_VERTEX_POSITION};
    ${V_GRID_COORDINATE}=${A_GRID_COORDINATE};
    ${V_RELATIVE_POSITION}=${L_RELATIVE_AND_ADJUSTED_VERTEX_POSITION};    
    ${V_SCREEN_COORDINATE}=${U_PROJECTION_MATRIX}*${U_PREVIOUS_VIEW_MATRIX}*${L_VERTEX_POSITION};
    ${V_NORMAL_LIGHTING}=vec4(mat3(${U_VIEW_MATRIX})*${L_VERTEX_NORMAL}-mat3(${U_VIEW_MATRIX})*vec3(0.),(dot(${L_VERTEX_NORMAL},${U_DIRECTED_LIGHTING_NORMAL}.xyz)+1.)*${U_DIRECTED_LIGHTING_NORMAL}.w);
    ${V_VERTEX_POSITION}=vec4(${L_VERTEX_POSITION}.xyz,${A_VERTEX_POSITION}.w);
    gl_Position=${U_PROJECTION_MATRIX}*${L_RELATIVE_AND_ADJUSTED_VERTEX_POSITION};
}`;

const U_FILL_COLOR = FLAG_SHORTEN_GLSL_VARIABLES?'t':'uFillColor_';
const U_LINE_COLOR = FLAG_SHORTEN_GLSL_VARIABLES?'u':'uLineColor_';
const U_CAMERA_LIGHT = FLAG_SHORTEN_GLSL_VARIABLES?'w':'uCameraLight_';
const U_AMBIENT_LIGHT = FLAG_SHORTEN_GLSL_VARIABLES?'x':'uAmbientLight_';
const U_GRID_DIMENSION= FLAG_SHORTEN_GLSL_VARIABLES?'y':'uGridDimension_';
const U_GRID_LIGHTING = FLAG_SHORTEN_GLSL_VARIABLES?'z':'uGridLighting_';
const U_PREVIOUS = FLAG_SHORTEN_GLSL_VARIABLES?'A':'uPrevious_';
const U_PREVIOUS_DIMENSION = FLAG_SHORTEN_GLSL_VARIABLES?'B':'uPreviousDimension_';
const U_POWER_SOURCES = FLAG_SHORTEN_GLSL_VARIABLES?'C':'uPowerSources_';
const U_POWER_SOURCE_COUNT = FLAG_SHORTEN_GLSL_VARIABLES?'D':'uPowerSourceCount_';
const U_GRID_TEXTURE = FLAG_SHORTEN_GLSL_VARIABLES?'_':'uGridTexture_';

const F_GET_SAMPLE_COLOR = FLAG_SHORTEN_GLSL_VARIABLES?'E':'getSampleColor_';
const FP_SCREEN_COORDINATE = FLAG_SHORTEN_GLSL_VARIABLES?'F':'screenCoordinate_';
const FP_DIV = FLAG_SHORTEN_GLSL_VARIABLES?'G':'div_';
const FP_COUNT = FLAG_SHORTEN_GLSL_VARIABLES?'H':'count_';
const L_PREVIOUS_COLOR = FLAG_SHORTEN_GLSL_VARIABLES?'I':'previousColor_';
const L_MULT = FLAG_SHORTEN_GLSL_VARIABLES?'J':'mult_';
const L_DISTANCE_SQUARED = FLAG_SHORTEN_GLSL_VARIABLES?'K':'distanceSquared_';
const L_DISTANCE_AND_FI = FLAG_SHORTEN_GLSL_VARIABLES?'L':'distance_';
const L_FOGGINESS = FLAG_SHORTEN_GLSL_VARIABLES?'M':'fogginess_';
const L_GRID_COLOR = FLAG_SHORTEN_GLSL_VARIABLES?'N':'gridColor_';
const L_GRID_POWER_AND_COUNT_AND_FOCUS = FLAG_SHORTEN_GLSL_VARIABLES?'O':'gridPower_';
const L_POWER_SOURCE = FLAG_SHORTEN_GLSL_VARIABLES?'P':'powerSource_';
const L_POWER_SOURCE_DELTA = FLAG_SHORTEN_GLSL_VARIABLES?'Q':'powerSourceDelta_';
const L_POWER_SOURCE_DISTANCE = FLAG_SHORTEN_GLSL_VARIABLES?'R':'powerSourceDistance_';
const L_POWER = FLAG_SHORTEN_GLSL_VARIABLES?'S':'p_';
const L_POWER_SQUARED = FLAG_SHORTEN_GLSL_VARIABLES?'T':'psq_';
const L_LIGHTING = FLAG_SHORTEN_GLSL_VARIABLES?'U':'lighting_';
const L_TILENESS = FLAG_SHORTEN_GLSL_VARIABLES?'V':'tileness_';
const L_FILL_COLOR = FLAG_SHORTEN_GLSL_VARIABLES?'W':'fillColor_';
const L_LINE_COLOR = FLAG_SHORTEN_GLSL_VARIABLES?'X':'lineColor_';
const L_FWIDTH = FLAG_SHORTEN_GLSL_VARIABLES?'Y':'a3_';
const L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR = FLAG_SHORTEN_GLSL_VARIABLES?'Z':'floorGridCoordinate_';
const L_LINE_DELTA_MIN_AND_BIT = FLAG_SHORTEN_GLSL_VARIABLES?'a':'mn_';
const L_LINE_DELTA_MAX = FLAG_SHORTEN_GLSL_VARIABLES?'b':'mx_';
const L_LINE_WIDTH = FLAG_SHORTEN_GLSL_VARIABLES?'c':'lineWidth_';
//const L_BIT = FLAG_SHORTEN_GLSL_VARIABLES?'d':'bit_';
const L_CURRENT_COLOR = FLAG_SHORTEN_GLSL_VARIABLES?'e':'currentColor_';
const L_TEXTURE_COORDINATE = FLAG_SHORTEN_GLSL_VARIABLES?'f':'textureCoordinate_';
//const L_COUNT = FLAG_SHORTEN_GLSL_VARIABLES?'g':'count_';
//const L_FOCUS = FLAG_SHORTEN_GLSL_VARIABLES?'h':'focus_';
//const L_PIXEL = FLAG_SHORTEN_GLSL_VARIABLES?'f':'pixel_';
const L_GRADIENT_POSITION = FLAG_SHORTEN_GLSL_VARIABLES?'g':'gradientPosition_';

let fragmentShaderSource = 
`#extension GL_OES_standard_derivatives:enable
precision lowp float;
uniform vec4 ${U_FILL_COLOR};
uniform vec3 ${U_LINE_COLOR};
uniform vec4 ${U_CAMERA_LIGHT};
uniform float ${U_AMBIENT_LIGHT};
uniform sampler2D ${U_PREVIOUS};
uniform sampler2D ${U_GRID_TEXTURE};
uniform vec2 ${U_PREVIOUS_DIMENSION};
uniform lowp int ${U_GRID_MODE};
uniform vec3 ${U_GRID_DIMENSION};
uniform float ${U_GRID_LIGHTING}[4];
uniform vec4 ${U_DIRECTED_LIGHTING_RANGE};
uniform vec4 ${U_POWER_SOURCES}[${C_MAX_POWER_SOURCES}];
uniform lowp int ${U_POWER_SOURCE_COUNT};
varying vec4 ${V_VERTEX_POSITION};
varying vec4 ${V_RELATIVE_POSITION};
varying vec4 ${V_GRID_COORDINATE};
varying vec4 ${V_SCREEN_COORDINATE};
varying vec4 ${V_NORMAL_LIGHTING};
vec4 ${F_GET_SAMPLE_COLOR}(vec2 ${FP_SCREEN_COORDINATE},int ${FP_DIV},inout float ${FP_COUNT}){
    vec4 ${L_PREVIOUS_COLOR}=texture2D(${U_PREVIOUS},${FP_SCREEN_COORDINATE});
    if(${L_PREVIOUS_COLOR}.w>.1){
        float ${L_MULT}=${C_BLUR_ITERATIONS}./float(${C_BLUR_ITERATIONS}-${FP_DIV}); 
        ${FP_COUNT}+=${L_MULT};
        ${L_PREVIOUS_COLOR}*=${L_MULT};
    }
    return ${L_PREVIOUS_COLOR};
}
void main(){
    float ${L_DISTANCE_AND_FI}=length(${V_RELATIVE_POSITION}.xyz);
    float ${L_FOGGINESS}=0.;
    if(${L_DISTANCE_AND_FI}<${CONST_VISIBLE_DISTANCE}.){
        ${L_FOGGINESS}=clamp((${CONST_VISIBLE_DISTANCE_SQUARED}.-${L_DISTANCE_AND_FI}*${L_DISTANCE_AND_FI})/${CONST_VISIBLE_DISTANCE_SQUARED}.,0.,1.);
    }
    vec3 ${L_GRID_COLOR}=vec3(0.);
    float ${L_GRID_POWER_AND_COUNT_AND_FOCUS}=0.;
    for(int i=0;i<${C_MAX_POWER_SOURCES};i++){
        if(i<${U_POWER_SOURCE_COUNT}){
            vec4 ${L_POWER_SOURCE}=${U_POWER_SOURCES}[i];
            vec2 ${L_POWER_SOURCE_DELTA}=${L_POWER_SOURCE}.xy-${V_VERTEX_POSITION}.xy;
            float ${L_POWER_SOURCE_DISTANCE}=sqrt(${L_POWER_SOURCE_DELTA}.x*${L_POWER_SOURCE_DELTA}.x+${L_POWER_SOURCE_DELTA}.y*${L_POWER_SOURCE_DELTA}.y);
            if(${L_POWER_SOURCE_DISTANCE}<${L_POWER_SOURCE}.z){
                float ${L_POWER}=(${L_POWER_SOURCE}.z-${L_POWER_SOURCE_DISTANCE})/${L_POWER_SOURCE}.z;
                float ${L_POWER_SQUARED}=${L_POWER}*${L_POWER}*sqrt(${L_POWER_SOURCE}.z)/${CONST_BASE_BUILDING_POWER}.;
                ${L_GRID_POWER_AND_COUNT_AND_FOCUS}+=${L_POWER_SQUARED};
                ${L_GRID_COLOR}+=vec3(.5,${L_POWER_SOURCE}.w,.5-${L_POWER_SOURCE}.w)*${L_POWER_SQUARED};
            }
        }
    }
    if(${L_GRID_POWER_AND_COUNT_AND_FOCUS}>0.){
        ${L_GRID_COLOR}/=${L_GRID_POWER_AND_COUNT_AND_FOCUS};
    }
    float ${L_LIGHTING}=clamp(1.-${L_DISTANCE_AND_FI}/${U_CAMERA_LIGHT}.x,0.,1.)*-dot(${V_RELATIVE_POSITION}.xyz/${L_DISTANCE_AND_FI},${V_NORMAL_LIGHTING}.xyz)*${U_CAMERA_LIGHT}.y+${U_AMBIENT_LIGHT}+${V_NORMAL_LIGHTING}.w+${L_GRID_POWER_AND_COUNT_AND_FOCUS}/9.;
    float ${L_TILENESS}=1.;
    vec3 ${L_FILL_COLOR};
    vec3 ${L_LINE_COLOR};
    vec4 ${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}=floor(${V_GRID_COORDINATE});
    if(${U_GRID_MODE}>0){
        vec3 ${L_FWIDTH}=smoothstep(vec3(0.0),fwidth(${V_GRID_COORDINATE}.xyz)*${C_LINE_WIDTH}*${V_VERTEX_POSITION}.w*(1.-${L_DISTANCE_AND_FI}/${CONST_VISIBLE_DISTANCE}.),${V_GRID_COORDINATE}.xyz);
        ${L_TILENESS}=min(min(${L_FWIDTH}.x,${L_FWIDTH}.y),${L_FWIDTH}.z);
        ${L_FILL_COLOR}=${U_FILL_COLOR}.xyz;
        ${L_LINE_COLOR}=${U_LINE_COLOR};
        ${L_LIGHTING}+=${U_FILL_COLOR}.w;
    }else{ 
        float ${L_LINE_DELTA_MIN_AND_BIT}=min(${V_GRID_COORDINATE}.x-${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}.x,(${V_GRID_COORDINATE}.y-${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}.y)*${V_GRID_COORDINATE}.z);
        float ${L_LINE_DELTA_MAX}=max(${V_GRID_COORDINATE}.x-${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}.x,1.-(1.-${V_GRID_COORDINATE}.y+${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}.y)*${V_GRID_COORDINATE}.z);
        float ${L_LINE_WIDTH}=(1.+${L_GRID_POWER_AND_COUNT_AND_FOCUS}*${L_GRID_POWER_AND_COUNT_AND_FOCUS})*${V_GRID_COORDINATE}.w; 
        if(${L_LINE_DELTA_MIN_AND_BIT}<${L_LINE_WIDTH}||${L_LINE_DELTA_MAX}>(1.-${L_LINE_WIDTH})){
            ${L_TILENESS}=min(${L_LINE_DELTA_MIN_AND_BIT},1.-${L_LINE_DELTA_MAX})/${L_LINE_WIDTH}*(1.-max(0.,${L_DISTANCE_AND_FI}/${CONST_VISIBLE_DISTANCE}.))*(1.-${L_LINE_WIDTH})+${L_LINE_WIDTH};
            ${L_TILENESS}*=${L_TILENESS}*${L_TILENESS};
        }
        ${L_LINE_DELTA_MIN_AND_BIT} = ${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}.y*${U_GRID_DIMENSION}.x+${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}.x;
        for(int i=0;i<4;i++){
            if(${L_LINE_DELTA_MIN_AND_BIT}<${CONST_GL_SAFE_BITS}.&&${L_LINE_DELTA_MIN_AND_BIT}>=0.) {
                ${L_LIGHTING}=max(${L_LIGHTING},mod(floor(${U_GRID_LIGHTING}[i]/pow(2.,${L_LINE_DELTA_MIN_AND_BIT})), 2.)*${C_NEON_LIGHTING});
            }
            ${L_LINE_DELTA_MIN_AND_BIT}-=${CONST_GL_SAFE_BITS}.;
        }
        ${L_GRID_COLOR}=mix(${U_LINE_COLOR},${L_GRID_COLOR},sqrt(${L_GRID_POWER_AND_COUNT_AND_FOCUS}));
        ${L_LINE_COLOR}=${L_GRID_COLOR};
        vec2 ${L_GRADIENT_POSITION}=${V_GRID_COORDINATE}.xy/${U_GRID_DIMENSION}.xy-.5;
        ${L_FILL_COLOR}=vec3(${U_FILL_COLOR}.xy, ${U_FILL_COLOR}.z+${U_FILL_COLOR}.w*(${L_GRADIENT_POSITION}.x+${L_GRADIENT_POSITION}.y));
        if(${U_GRID_DIMENSION}.z>0.){
            // reuse local var for the pixel texture for the surface
            ${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}=texture2D(${U_GRID_TEXTURE},1.-${V_GRID_COORDINATE}.yx/${U_GRID_DIMENSION}.yx);
            ${L_LIGHTING}+=${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}.w*${C_NEON_LIGHTING}*${U_GRID_DIMENSION}.z;
            ${L_TILENESS}=max(${L_TILENESS},${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}.w*${U_GRID_DIMENSION}.z);
        }
    }
    vec4 ${L_CURRENT_COLOR}=vec4(mix(${L_LINE_COLOR},max(mix(vec3(0.),${L_FILL_COLOR},${L_LIGHTING}),${L_GRID_COLOR}*${C_GRID_LIGHT_MULTIPLIER}*(1.-min((${V_VERTEX_POSITION}.z-(${V_VERTEX_POSITION}.x-${U_DIRECTED_LIGHTING_RANGE}.x)*${U_DIRECTED_LIGHTING_RANGE}.y-${U_DIRECTED_LIGHTING_RANGE}.z)/${U_DIRECTED_LIGHTING_RANGE}.w,1.))),${L_TILENESS}), ${L_FOGGINESS});
    vec2 ${L_TEXTURE_COORDINATE}=(${V_SCREEN_COORDINATE}.xy/${V_SCREEN_COORDINATE}.w)/2.+.5;
    ${L_GRID_POWER_AND_COUNT_AND_FOCUS}=0.;
    ${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}=${F_GET_SAMPLE_COLOR}(${L_TEXTURE_COORDINATE},0,${L_GRID_POWER_AND_COUNT_AND_FOCUS});
    for(int i=1;i<${C_BLUR_ITERATIONS};++i){
        ${L_DISTANCE_AND_FI}=float(i);
        ${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}+=${F_GET_SAMPLE_COLOR}(${L_TEXTURE_COORDINATE}+vec2(${U_PREVIOUS_DIMENSION}.x,0.)*${L_DISTANCE_AND_FI},i,${L_GRID_POWER_AND_COUNT_AND_FOCUS});
        ${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}+=${F_GET_SAMPLE_COLOR}(${L_TEXTURE_COORDINATE}-vec2(${U_PREVIOUS_DIMENSION}.x,0.)*${L_DISTANCE_AND_FI},i,${L_GRID_POWER_AND_COUNT_AND_FOCUS});
        ${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}+=${F_GET_SAMPLE_COLOR}(${L_TEXTURE_COORDINATE}+vec2(0.,${U_PREVIOUS_DIMENSION}.y)*${L_DISTANCE_AND_FI},i,${L_GRID_POWER_AND_COUNT_AND_FOCUS});
        ${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}+=${F_GET_SAMPLE_COLOR}(${L_TEXTURE_COORDINATE}-vec2(0.,${U_PREVIOUS_DIMENSION}.y)*${L_DISTANCE_AND_FI},i,${L_GRID_POWER_AND_COUNT_AND_FOCUS});
    }
    if(${L_GRID_POWER_AND_COUNT_AND_FOCUS}>0.){
        ${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}/=${L_GRID_POWER_AND_COUNT_AND_FOCUS};
        ${L_GRID_POWER_AND_COUNT_AND_FOCUS}=sqrt(${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}.w)*${U_CAMERA_LIGHT}.z;
        ${L_CURRENT_COLOR}=vec4((${L_CURRENT_COLOR}.xyz*${L_GRID_POWER_AND_COUNT_AND_FOCUS}+${L_FLOOR_GRID_COORDINATE_AND_PREVIOUS_COLOR}.xyz*(1.-${L_GRID_POWER_AND_COUNT_AND_FOCUS}))*${U_CAMERA_LIGHT}.w,${L_CURRENT_COLOR}.a);
    }
    gl_FragColor=${L_CURRENT_COLOR};
}`;

interface ShowPlay {
    (restart?: (()=> void)|any) : void;
}

function initShowPlay(
    audioContext: AudioContext 
): ShowPlay {

    //let offscreenCanvas = d.getElementById('a') as HTMLCanvasElement;
    let offscreenCanvas = d.createElement('canvas');
    let gl = offscreenCanvas.getContext('webgl');
    let canvas = d.getElementById('b') as HTMLCanvasElement;
    let context = canvas.getContext('2d');
    let skybox = d.createElement('img');
    let inputCanvas: HTMLCanvasElement;
    if( FLAG_BLOOM ) {
        inputCanvas = canvas;
    } else {
        inputCanvas = offscreenCanvas;
        canvas.parentElement.insertBefore(offscreenCanvas, canvas);
    }
    const CONST_GL_RENDERBUFFER = FLAG_USE_GL_CONSTANTS?gl.RENDERBUFFER:0x8D41;
    const CONST_GL_FRAMEBUFFER = FLAG_USE_GL_CONSTANTS?gl.FRAMEBUFFER:0x8D40;
    const CONST_GL_DEPTH_COMPONENT16 = FLAG_USE_GL_CONSTANTS?gl.DEPTH_COMPONENT16:0x81A5;
    const CONST_GL_DEPTH_ATTACHMENT = FLAG_USE_GL_CONSTANTS?gl.DEPTH_ATTACHMENT:0x8D00;
    const CONST_GL_VERTEX_SHADER = FLAG_USE_GL_CONSTANTS?gl.VERTEX_SHADER:0x8B31;
    const CONST_GL_FRAGMENT_SHADER = FLAG_USE_GL_CONSTANTS?gl.FRAGMENT_SHADER:0x8B30;
    const CONST_GL_LINK_STATUS = FLAG_USE_GL_CONSTANTS?gl.LINK_STATUS:0x8B82;
    const CONST_GL_ELEMENT_ARRAY_BUFFER = FLAG_USE_GL_CONSTANTS?gl.ELEMENT_ARRAY_BUFFER:0x8893;
    const CONST_GL_COLOR_ATTACHMENT0 = FLAG_USE_GL_CONSTANTS?gl.COLOR_ATTACHMENT0:0x8CE0;
    const CONST_GL_DEPTH_TEST = FLAG_USE_GL_CONSTANTS?gl.DEPTH_TEST:0x0B71;
    const CONST_GL_CULL_FACE = FLAG_USE_GL_CONSTANTS?gl.CULL_FACE:0x0B44;
    const CONST_GL_BLEND = FLAG_USE_GL_CONSTANTS?gl.BLEND:0x0BE2;
    const CONST_GL_LESS = FLAG_USE_GL_CONSTANTS?gl.LESS:0x0201;
    const CONST_GL_FRONT = FLAG_USE_GL_CONSTANTS?gl.FRONT:0x0404;
    const CONST_GL_BACK = FLAG_USE_GL_CONSTANTS?gl.BACK:0x0405;
    const CONST_GL_COLOR_BUFFER_BIT = FLAG_USE_GL_CONSTANTS?gl.COLOR_BUFFER_BIT:0x4000;
    const CONST_GL_DEPTH_BUFFER_BIT = FLAG_USE_GL_CONSTANTS?gl.DEPTH_BUFFER_BIT:0x100;
    const CONST_GL_COLOR_AND_DEPTH_BUFFER_BIT = FLAG_USE_GL_CONSTANTS?gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT:0x4100;
    const CONST_GL_TEXTURE_2D = FLAG_USE_GL_CONSTANTS?gl.TEXTURE_2D:0x0DE1;
    const CONST_GL_UNSIGNED_BYTE = FLAG_USE_GL_CONSTANTS?gl.UNSIGNED_BYTE:0x1401;
    const CONST_GL_UNSIGNED_SHORT = FLAG_USE_GL_CONSTANTS?gl.UNSIGNED_SHORT:0x1403;
    const CONST_GL_RGBA = FLAG_USE_GL_CONSTANTS?gl.RGBA:0x1908;
    const CONST_GL_TRIANGLES = FLAG_USE_GL_CONSTANTS?gl.TRIANGLES:0x0004;
    const CONST_GL_TEXTURE0 = FLAG_USE_GL_CONSTANTS?gl.TEXTURE0:0x84C0; 
    const CONST_GL_TEXTURE1 = FLAG_USE_GL_CONSTANTS?gl.TEXTURE1:0x84C1;

    

	let surfaceGenerator = surfaceGeneratorFactory(gl);

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
    let fovX: number;

    let shootSound = webAudioBoomSoundFactory(audioContext, .3, .01, 399, .9, .5);
    let powerupSound = webAudioVibratoSound3DFactory(audioContext, .2, 0, .1, .05, 'square', 999, 2e3, 599);
    let deathSound = webAudioBoomSoundFactory(audioContext, 2, .2, 499, 1.5, 1);
	let painSound = webAudioVibratoSound3DFactory(audioContext, .5, 0, .4, .2, 'sawtooth', 299, -99);
    let stepSound = webAudioBoomSoundFactory(audioContext, .05, .01, 2e3, .1, .05);
    let sunColor = '#000';
    let sunCaladeraColor = '#c6c';
    let skyColor = CONST_SKY_COLOR_HIGH_RGB;
 


    // turn on the extension(s) we use
    gl.getExtension('OES_standard_derivatives');
    // gl.getExtension( "WEBKIT_WEBGL_depth_texture" );
    // gl.getExtension( "MOZ_WEBGL_depth_texture" );

    // Enable depth testing
    gl.enable(CONST_GL_DEPTH_TEST);  
    // Near things obscure far things
    gl.depthFunc(CONST_GL_LESS);         
    // overlapping things use the maximum alpha value (because it's fogged)
    if( FLAG_GL_DISABLE_BLENDING ) {
        gl.disable(CONST_GL_BLEND); // pretty sure this is off by default
    }
    // transparent clear color 
    gl.clearColor(0, 0, 0, 0);
    // only draw front faces
    if( FLAG_GL_CULL_FACES ) {
        if( FLAG_GL_CULL_EXPLOSIONS ) {
            gl.enable(CONST_GL_CULL_FACE);
        }
        if( FLAG_BLOOM ) {
            // I think the flipping operation means we have to cull the opposite faces?
            gl.cullFace(CONST_GL_FRONT);
        } else {
            gl.cullFace(CONST_GL_BACK);

        }
    }

    let vertexShader = webglLoadShader(gl, CONST_GL_VERTEX_SHADER, vertexShaderSource);
    let fragmentShader = webglLoadShader(gl, CONST_GL_FRAGMENT_SHADER, fragmentShaderSource);

    let shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if( FLAG_GL_SHOW_SHADER_ERRORS && !gl.getProgramParameter(shaderProgram, CONST_GL_LINK_STATUS) ) {
        console.error('An error occurred linking program', gl.getProgramInfoLog(shaderProgram));
        throw 'program link error';
    }
    gl.useProgram(shaderProgram);

    // get uniforms and attributes
    let aVertexPosition = gl.getAttribLocation(shaderProgram, A_VERTEX_POSITION);
    let aGridCoordinate = gl.getAttribLocation(shaderProgram, A_GRID_COORDINATE);
    let aVertexOffset = gl.getAttribLocation(shaderProgram, A_VERTEX_OFFSET);

    /*
    let uProjectionMatrix = gl.getUniformLocation(shaderProgram, U_PROJECTION_MATRIX);
    let uModelMatrix = gl.getUniformLocation(shaderProgram, U_MODEL_MATRIX);
    let uViewMatrix = gl.getUniformLocation(shaderProgram, U_VIEW_MATRIX);
    let uPreviousViewMatrix = gl.getUniformLocation(shaderProgram, U_PREVIOUS_VIEW_MATRIX);
    let uFillColor = gl.getUniformLocation(shaderProgram, U_FILL_COLOR);
    let uLineColor = gl.getUniformLocation(shaderProgram, U_LINE_COLOR);
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
    */

    let uniformLocations: {[_:string]: WebGLUniformLocation | number} = {};
    if( FLAG_SHORTEN_GLSL_VARIABLES ) {
        let uniformString =         
            U_PROJECTION_MATRIX+
            U_MODEL_MATRIX+
            U_VIEW_MATRIX+
            U_PREVIOUS_VIEW_MATRIX+
            U_FILL_COLOR+
            U_LINE_COLOR+
            U_CAMERA_LIGHT+
            U_AMBIENT_LIGHT+
            U_PREVIOUS+
            U_PREVIOUS_DIMENSION+
            U_GRID_MODE+
            U_GRID_DIMENSION+
            U_GRID_LIGHTING+
            U_CYCLE_RADIANS+
            U_OFFSET_MULTIPLIER+
            U_DIRECTED_LIGHTING_NORMAL+
            U_DIRECTED_LIGHTING_RANGE+
            U_SURFACE_NORMAL+
            U_POWER_SOURCES+
            U_POWER_SOURCE_COUNT+
            U_GRID_TEXTURE;
        let uniformCount = 21;
        while( uniformCount-- ) {
            let c = uniformString[uniformCount];
            uniformLocations[c] = gl.getUniformLocation(shaderProgram, c);        
        }
    } else {
        let attributeNames = [
        ];
        let uniformNames = [
            U_PROJECTION_MATRIX,
            U_MODEL_MATRIX,
            U_VIEW_MATRIX,
            U_PREVIOUS_VIEW_MATRIX,
            U_FILL_COLOR,
            U_LINE_COLOR,
            U_CAMERA_LIGHT,
            U_AMBIENT_LIGHT,
            U_PREVIOUS,
            U_PREVIOUS_DIMENSION,
            U_GRID_MODE,
            U_GRID_DIMENSION,
            U_GRID_LIGHTING,
            U_CYCLE_RADIANS,
            U_OFFSET_MULTIPLIER,
            U_DIRECTED_LIGHTING_NORMAL,
            U_DIRECTED_LIGHTING_RANGE,
            U_SURFACE_NORMAL,
            U_POWER_SOURCES,
            U_POWER_SOURCE_COUNT, 
            U_GRID_TEXTURE
        ];
        uniformLocations = webglGetUniformAndAttributeLocations(gl, shaderProgram, uniformNames, attributeNames);
    }

    // webglGetUniformLocations(gl, shaderProgram, [
    //     U_PROJECTION_MATRIX, 
    //     U_MODEL_MATRIX,
    //     U_VIEW_MATRIX,
    //     U_PREVIOUS_VIEW_MATRIX, 
    //     U_FILL_COLOR, 
    //     U_LINE_COLOR, 
    //     U_CAMERA_LIGHT, 
    //     U_AMBIENT_LIGHT, 
    //     U_PREVIOUS, 
    //     U_PREVIOUS_DIMENSION, 
    //     U_GRID_MODE, 
    //     U_GRID_DIMENSION, 
    //     U_GRID_LIGHTING, 
    //     U_CYCLE_RADIANS, 
    //     U_OFFSET_MULTIPLIER, 
    //     U_DIRECTED_LIGHTING_NORMAL, 
    //     U_DIRECTED_LIGHTING_RANGE, 
    //     U_SURFACE_NORMAL, 
    //     U_POWER_SOURCES, 
    //     U_POWER_SOURCE_COUNT
    // ]);
    
    
    let play = function(onRestart?: () => void) {
        let victory: number;
        let seed: number;
        if( FLAG_PERSISTENT_SEED ) {
            seed = ls.getItem(0 as any) as any/1;        
        }
        if( !seed ) {
            if( CONST_WORLD_SEED ) {
                seed = CONST_WORLD_SEED;
            } else {
                seed = floor(m.random() * CONST_BIG_NUMBER);
            }    
        }
        let rngFactory = sinRandomNumberGeneratorFactory(seed);
        let rng = rngFactory(9);    
        let animationFrameHandle: number;
        // NOTE: regenerate should be a boolean really, but onresize passes some truthy value
        let resize = function(regenerate?: any) {

            canvasWidth = innerWidth;
            canvasHeight = innerHeight;
            

            offscreenCanvas.width = canvas.width = canvasWidth;
            offscreenCanvas.height = canvas.height = canvasHeight;

            if( FLAG_BLOOM ) {
                textureData = new Uint8Array(canvasWidth * canvasHeight * 4);
                textureImageData = context.createImageData(canvasWidth, canvasHeight);    
            }
            if( sourceTexture && FLAG_CLEAN_UP_ON_RESIZE ) {
                gl.deleteTexture(sourceTexture);
                gl.deleteTexture(targetTexture);            
                if( FLAG_BLOOM ) {
                    gl.deleteFramebuffer(frameBuffer);
                    gl.deleteRenderbuffer(depthBuffer);    
                }
            }
            if( regenerate ) {
                sourceTexture = webglCreateTexture(gl, canvasWidth, canvasHeight);
                targetTexture = webglCreateTexture(gl, canvasWidth, canvasHeight);    
                if( FLAG_BLOOM ) {
                    frameBuffer = gl.createFramebuffer();
                    depthBuffer = gl.createRenderbuffer();

                    gl.bindFramebuffer(CONST_GL_FRAMEBUFFER, frameBuffer);
                    gl.bindRenderbuffer(CONST_GL_RENDERBUFFER, depthBuffer);
                
                    gl.renderbufferStorage(CONST_GL_RENDERBUFFER, CONST_GL_DEPTH_COMPONENT16, canvasWidth, canvasHeight);
                    gl.framebufferRenderbuffer(CONST_GL_FRAMEBUFFER, CONST_GL_DEPTH_ATTACHMENT, CONST_GL_RENDERBUFFER, depthBuffer);    
                }
            }

            aspectRatio = canvasWidth/canvasHeight;
            fovX = 2 * m.atan(CONST_TAN_FOV_Y_DIV_2 * aspectRatio);
            if( FLAG_BLOOM ) {
                if( FLAG_INLINE_PROJECTION_MATRIX ) {
                    let f = 1 / CONST_TAN_FOV_Y_DIV_2;
                    let nf = 1 / (CONST_BASE_RADIUS/2 - CONST_VISIBLE_DISTANCE);
                    projectionMatrix = [
                        f/aspectRatio, 0, 0, 0, 
                        0, -f, 0, 0,
                        0, 0, (CONST_VISIBLE_DISTANCE + CONST_BASE_RADIUS/2) * nf, -1, 
                        0, 0, (2 * CONST_VISIBLE_DISTANCE * CONST_BASE_RADIUS/2) * nf, 0
                    ];
                } else {
                    projectionMatrix = matrix4PerspectiveFlippedY(
                        CONST_TAN_FOV_Y_DIV_2, 
                        aspectRatio, 
                        CONST_BASE_RADIUS/2, 
                        CONST_VISIBLE_DISTANCE
                    );        
                }
            } else {
                // TODO respect inline here too
                projectionMatrix = matrix4Perspective(
                    CONST_TAN_FOV_Y_DIV_2, 
                    aspectRatio, 
                    CONST_BASE_RADIUS/2, 
                    CONST_VISIBLE_DISTANCE
                );
            }
        
            // pretty sure we didn't use to need this?
            gl.viewport(0, 0, canvasWidth, canvasHeight);

            if( FLAG_BACKGROUND ) {
                // (p)re-render the background

                // let skyGradient = context.createLinearGradient(0, 0, 0, canvasHeight/2);
                // skyGradient.addColorStop(0, CONST_SKY_COLOR_HIGH_RGB);
                // skyGradient.addColorStop(1, CONST_SKY_COLOR_LOW_RGB);
                // context.fillStyle = skyGradient;
                // context.fillRect(0, 0, canvasWidth, canvasHeight);
                let rng = rngFactory(0);
                let i = 5;
                while( --i ) {
                    context.fillStyle = CONST_BUILDING_COLORS_RGB[i - 2];

                    let x = 0;
                    while( x < canvasWidth ) {
                        let y = (rng(canvasHeight) + canvasHeight*4)*(sqrt(6 - i))/25 + canvasHeight/2;
                        let w = (rng(canvasWidth/19) + canvasWidth/49) / (aspectRatio * i);
                        context.fillRect(x, y, w+1, canvasHeight);
                        x += w;
                    }    
                }

                skybox.src = canvas.toDataURL();
            }
        };
        let destroy = function() {
			cancelAnimationFrame(animationFrameHandle);
			if( !FLAG_NO_LOADING ) {
				canvas.className = '';
			}
            if( FLAG_CLEANUP_EVENT_HANDLERS_ON_DESTROY ) {
                onresize = null;
                onkeydown = null;
                onkeyup = null;
                inputCanvas.onmousedown = null;
                inputCanvas.onmouseup = null;
            }
            for(let side in world.allEntities ) {
                let sideEntities = world.allEntities[side];
                sideEntities.map(function(entity) {
                    entity.cleanup();
                })
            }
            resize();
        }
		if( !FLAG_NO_LOADING ) {
			canvas.className = 'v';
		}
    
        resize(1); 
    
        onresize = resize;

        let posString = ls.getItem(seed as any);
        let pos: Vector3;
        if( posString ) {
            pos = JSON.parse(posString);
        } else {
            pos = [0, 0, 0];
            //pos = [CONST_FINISH_X + 12, 0, 99];
        }
        
        let say = function(message: string, pronunciation?: string) {
            if( FLAG_SPEECH && (!FLAG_CHECK_SPEECH || window.speechSynthesis) ) {
                let ut = new SpeechSynthesisUtterance(pronunciation && FLAG_PRONOUCE_PROPERLY?pronunciation:message);
                ut.rate = .8;
                speechSynthesis.speak(ut);
                ut.onend = function() {
                    displayMessageTime = world.age - CONST_MESSAGE_TIME;
                }
            }
            displayMessage = message;
            displayMessageTime = world.age;
        }
        let monsterGenerator = monsterGeneratorFactory(gl, rngFactory, audioContext);
        let chunkGenerator = flatChunkGeneratorFactory(seed, surfaceGenerator, monsterGenerator, rngFactory, audioContext, say, [d, canvas]);
        
        // let player = monsterGenerator(25, -0.000007635353276777558, -4.675305475382446e-22, 0.4900000000000674, CONST_BASE_RADIUS);
        // player.vx = -0.00019996952947114684;
        // player.vy = -1.2244602209692118e-20;
        // player.vz = -2.404588689359089e-9;
        
        let walkDistance = 0;

        let player: Monster;
        let setPlayer = function(playerEntitySeed: number, x: number, y: number, z: number) {
            let newPlayer = monsterGenerator(
                playerEntitySeed,
                x, y, z, 
                .49
            );
            player = newPlayer;
            // swap the gravity (guns that shoot low or zero gravity bullets, allow you to jump higher)
            player.gravityMultiplier=(1 - player.gravityMultiplier/2);
            // bouncing is annoying
            player.restitution = 0;
            player.sound = null;
            player.side = SIDE_PLAYER;
            player.die = function() {
                player.deathAge = player.age;
                if( player == newPlayer ) {
                    say("HULL FAILURE");
                    deathSound(player.x, player.y, player.z);    
                }
            }
            player.onUpdate = function(this: Monster, world: World, amt: number) {
                let left = keyStates[37] || keyStates[65];
                let right = keyStates[39] || keyStates[68];
                let forward = max(keyStates[38], keyStates[87]);
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
    
                let sinZ = sin(player.rz);
                let cosZ = cos(player.rz);
                let sinZSide = sin(player.rz - CONST_DIRTY_PI_ON_2);
                let cosZSide = cos(player.rz - CONST_DIRTY_PI_ON_2);
    
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
                let previousWalkCos = cos(walkDistance);
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
                let walkCos =cos(walkDistance); 
                if( walkCos >= 0 && previousWalkCos < 0 || walkCos < 0 && previousWalkCos >= 0) {
                    stepSound(player.x, player.y, player.z - player.radius);
                }
                if( FLAG_ALLOW_JUMPING && jumping && lastFloor + CONST_CHARGE_FLOOR_DIFF > jumping ) {
                    player.vz = .015;
                    lastFloor = 0;
                }
                player.vx = vx; 
                player.vy = vy;
    
                // work out our gun power
                let power = 0;
                if( lastFloor + CONST_CHARGE_FLOOR_DIFF > player.age ) {
                    // buildings are already sorted
                    let buildings = world.allEntities[SIDE_BUILDING] as Building[];
                    let i = 0;
                    /* from shader...
                    vec4 ${L_POWER_SOURCE}=${U_POWER_SOURCES}[i];
                    vec2 ${L_POWER_SOURCE_DELTA}=${L_POWER_SOURCE}.xy-${V_VERTEX_POSITION}.xy;
                    float ${L_POWER_SOURCE_DISTANCE}=sqrt(${L_POWER_SOURCE_DELTA}.x*${L_POWER_SOURCE_DELTA}.x+${L_POWER_SOURCE_DELTA}.y*${L_POWER_SOURCE_DELTA}.y);
                    if(${L_POWER_SOURCE_DISTANCE}<${L_POWER_SOURCE}.z){
                        float ${L_POWER}=(${L_POWER_SOURCE}.z-${L_POWER_SOURCE_DISTANCE})/${L_POWER_SOURCE}.z;
                        float ${L_POWER_SQUARED}=${L_POWER}*${L_POWER};
                        ${L_GRID_POWER}+=${L_POWER_SQUARED};
                        ${L_GRID_COLOR}+=vec3(.5,${L_POWER_SOURCE}.w,.5-${L_POWER_SOURCE}.w)*${L_POWER_SQUARED};}}}
    
                    */
                    while( i < buildings.length ) {
                        let building = buildings[i++];
                        let buildingX = building.chunkX * CONST_CHUNK_WIDTH + CONST_CHUNK_WIDTH/2;
                        let buildingY = building.chunkY * CONST_CHUNK_HEIGHT + CONST_CHUNK_HEIGHT/2;
                        let dx = player.x - buildingX;
                        let dy = player.y - buildingY;
                        let dsq = dx * dx + dy * dy;
                        if ( dsq < building.power * building.power ) {
                            let d = sqrt(dsq);
                            let p = building.friendliness*(building.power - d)/building.power;
                            power += p*p*sqrt(building.power)/CONST_BASE_BUILDING_POWER;
                        }
                    }
                }
                lastPower = sqrt(power);
                battery = min(maxBattery, battery + lastPower*amt*.011/min(1, (battery + 9)/CONST_BATTERY_WARNING));
                if( shooting && battery >= CONST_BASE_BULLET_COST ) {
                    let shotInterval = CONST_BASE_BULLET_INTERVAL;
                    if( player.age > lastShot + shotInterval || battery >= maxBattery ) {
                        battery -= CONST_BASE_BULLET_COST;
                        let sinX = sin(player.rx);
                        let cosX = cos(player.rx);
                        if( lastShot + shotInterval + amt > player.age ) {
                            lastShot = lastShot + shotInterval;
                        } else {
                            lastShot = player.age;
                        }
                        let bulletPosition = vector3TransformMatrix4(0, 0, 0, bulletPositionMatrix);
                        // shoot
                        let bullet = monsterGenerator(
                            player.seed, 
                            player.x + bulletPosition[0], 
                            player.y + bulletPosition[1], 
                            player.z + bulletPosition[2], 
                            CONST_BULLET_RADIUS, 
                            CONST_BULLET_LIFESPAN
                        );
                        shootSound(player.x, player.y, player.z);
                        bullet.side = SIDE_NEUTRAL;
                        bullet.sound = null;
                        /*
                        bullet.onCollision = function(world: World, withEntity: Entity) {
                            if( !FLAG_TEST_PHYSICS && withEntity.side != SIDE_POWERUPS && withEntity != player && (!bullet.restitution||withEntity.entityType) ) {
                                bullet.die(world, withEntity);  
                            }
                            if( withEntity.entityType ) {
                                if( FLAG_LOG_KILLS ) {
                                    console.log('killed seed', (withEntity as Monster).seed);
                                }
                            }
                        }
                        */
                        if( FLAG_TEST_PHYSICS ) {
                            bullet.restitution = 1;
                        } 
                        bullet.vx = cosX * cosZ * CONST_BULLET_VELOCITY;
                        bullet.vy = cosX * sinZ * CONST_BULLET_VELOCITY;
                        bullet.vz = sinX * CONST_BULLET_VELOCITY;
                        bullet.gravityMultiplier /= 2;
    
                        world.addEntity(bullet);
                    }
                }
                if(!victory && player.x > CONST_FINISH_X) {
                    victory = 1;
                    say("YOU ESCAPED");
                    // increment the seed for the next game
                    ls.setItem(0 as any, seed+1 as any);
                    sunColor = '#FF5';
                    sunCaladeraColor = '#CCC';
                    skyColor = '#99E';
                }
                if( lastBattery >= CONST_BASE_BULLET_COST && battery < CONST_BASE_BULLET_COST && !power ) {
                    // issue a warning
                    if( FLAG_PRONOUCE_PROPERLY ) {
                        say("WEAPON OFFLINE", 'WEAPON OFF LINE');
                    } else {
                        say("WEAPON OFF-LINE");
                    }
                    weaponHasBeenOffline = 1;
                } else if( lastBattery >= CONST_BATTERY_WARNING && battery < CONST_BATTERY_WARNING && !shieldHasBeenOffline ) {
                    if( FLAG_PRONOUCE_PROPERLY ) {
                        say("SHIELD OFFLINE", "SHEELED OFF LINE");
                    } else {
                        say("SHIELD OFF-LINE");
                    }
                    shieldHasBeenOffline = 1;
                } else if( lastBattery < CONST_BASE_BULLET_COST && battery >= CONST_BASE_BULLET_COST && weaponHasBeenOffline ) {
                    say('WEAPON ONLINE');
                    weaponHasBeenOffline = 0;
                } else if( battery > CONST_BATTERY_WARNING * 2 ) {
                    shieldHasBeenOffline = 0;
                }
                lastBattery = battery;
            }
            player.onCollision = function(this: Monster, world: World, other: Entity) {
                let result: number;
                if( other.entityType ) {
                    // we haven't shot ourselves
                    if( other.side != SIDE_NEUTRAL ) {
                        if( other.side == SIDE_POWERUPS ) {
                            let powerup = other as Monster;
                            if( powerup.seed == CONST_BATTERY_SEED ) {
                                batteryLevel++;
                                maxBattery = m.pow(batteryLevel, CONST_BATTERY_LEVEL_EXPONENT);
                                battery += 9;
                                lastBatteryBoost = world.age;
                                powerupSound(player.x, player.y, player.z);    
                            } else {
                                // turn the player into this thing!
                                let oldPlayer = player;
                                setPlayer(powerup.seed, player.x, player.y, player.z);
                                player.rx = oldPlayer.rx;
                                player.ry = oldPlayer.ry;
                                player.rz = oldPlayer.rz;
                                oldPlayer.deathAge = oldPlayer.age;
                                player.age = oldPlayer.age;
                                world.addEntity(player);
                                say("WEAPON UPGRADE");
                            }
                            powerup.deathAge = powerup.age;
                        } else {
                            if( !FLAG_TEST_PHYSICS ) {
                                let otherMonster = other as Monster;
                                if( player.lastDamageAge + CONST_PLAYER_INVULNERABILITY_DURATION > world.age ) {
                                    otherMonster.deathAge = otherMonster.age;
                                } else {
                                    painSound(player.x, player.y, player.z);
                                    let damage = CONST_BATTERY_WARNING / CONST_BASE_RADIUS * otherMonster.radius;
                                    if( battery >= damage ) {
                                        // kill the monster, survive
                                        battery -= damage;
                                        player.lastDamageAge = world.age;
                                        lastShot = world.age + CONST_WINCE_DURATION;
                                        otherMonster.deathAge = otherMonster.age;
                                    } else {
                                        player.die(world, other);
        
                                    }
                                }
                            }    
                        }
                    }
                } else {
                    let surface = other as Surface;
                    // you can probably jump
                    if( surface.normal[2]>0) {
                        lastFloor = player.age;
                    }
                }
                return result;
            }    
        }
        setPlayer(0, pos[0], pos[1], pos[2] + 2);
        player.ry = 0;

        
        
        //player.specialMatrix = matrix4Translate(2, 0, -player.radius/2);
        let lastShot = 0;
        let batteryLevel = CONST_STARTING_BATTERY;
        let maxBattery = m.pow(batteryLevel, CONST_BATTERY_LEVEL_EXPONENT);
        let battery = maxBattery;
        let lastBattery = battery;
		let lastBatteryBoost = 0;
        let lastFloor = 0;
        let lastPower = 0;
		let weaponHasBeenOffline: number;
		let shieldHasBeenOffline: number;



        let world = initWorld(chunkGenerator, player);

        let displayMessageTime: number;
        let displayMessage: string;

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
        inputCanvas.onmousedown = function(e: MouseEvent) {
            if( !e.button ) {
                if( d.pointerLockElement == inputCanvas ) {
                    if( player.deathAge ) {
                        // request restart
                        destroy();
                        onRestart&&FLAG_HOME_SCREEN?onRestart():play();
                    } else {
                        shooting = world.age;
                    }
                } else {
                    inputCanvas.requestPointerLock();
                }
            } 
        }
        inputCanvas.onmouseup = function(e: MouseEvent) {
            shooting = 0;
        }     
        inputCanvas.onmousemove = function(e: MouseEvent) {
            if( d.pointerLockElement == inputCanvas ) {
                
                dx -= e.movementX;
                dy = min(canvasHeight/2, max(-canvasHeight/2, dy - e.movementY/2));    
            }
        }
        onkeydown = function(e: KeyboardEvent) {
            let keyCode = e.keyCode;
            if( !keyStates[keyCode] ) {
                keyStates[keyCode] = world.age;
            }
        }
        onkeyup = function(e: KeyboardEvent) {
            let keyCode = e.keyCode;
            keyStates[keyCode] = 0;
            if( keyCode == 16 ) {
                lastRunningRelease = world.age;
            }
        }
    

        let lightingSin: number;
        let lightingCos: number;

        let render = function(projectionMatrix: Matrix4, viewMatrix: Matrix4, previousViewMatrix: Matrix4) {
            // Clear the color buffer with specified clear color
            gl.clear(CONST_GL_COLOR_AND_DEPTH_BUFFER_BIT);
    
            let buildings = world.allEntities[SIDE_BUILDING] as Building[];
            let powerSources: number[] = [];
            let powerSourceCount = min(buildings.length, C_MAX_POWER_SOURCES);
            let powerBoost = sin(world.age/399)/9 + 1;
            for( let i=0; i<powerSourceCount; i++ ) {
                let building = buildings[i] as Building;
                powerSources.push(
                    building.chunkX * CONST_CHUNK_WIDTH + CONST_CHUNK_WIDTH/2, 
                    building.chunkY * CONST_CHUNK_HEIGHT + CONST_CHUNK_HEIGHT/2, 
                    sqrt(building.power) * powerBoost + CONST_CHUNK_DIMENSION_MAX, 
                    building.friendliness/2
                );
            }

            gl.uniform4fv(uniformLocations[U_POWER_SOURCES], powerSources);
            gl.uniform1i(uniformLocations[U_POWER_SOURCE_COUNT], powerSourceCount);

            if( FLAG_BLOOM ) {
                gl.uniform1i(uniformLocations[U_PREVIOUS], 0);
                gl.uniform1i(uniformLocations[U_GRID_TEXTURE], 1);
                // don't need to set this, it's always reset for us
                //gl.activeTexture(CONST_GL_TEXTURE0);
                gl.bindTexture(CONST_GL_TEXTURE_2D, sourceTexture);
                // all subsequent textures will be on texture 1
                gl.activeTexture(CONST_GL_TEXTURE1);

            } else {
                gl.uniform1i(uniformLocations[U_GRID_TEXTURE], 0);                
            }

            gl.uniform2f(uniformLocations[U_PREVIOUS_DIMENSION], 1/canvasWidth, 1/canvasHeight);
            gl.uniformMatrix4fv(uniformLocations[U_PROJECTION_MATRIX], false, projectionMatrix);
            gl.uniformMatrix4fv(uniformLocations[U_VIEW_MATRIX], false, viewMatrix);
            gl.uniformMatrix4fv(uniformLocations[U_PREVIOUS_VIEW_MATRIX], false, previousViewMatrix);

            // work out lighting
            let lightingAngle = min(CONST_DIRTY_PI/2, world.cameraX/CONST_FINISH_X_DIV_PI_ON_2);
            lightingSin = sin(lightingAngle);
            lightingCos = cos(lightingAngle);
            gl.uniform4f(uniformLocations[U_DIRECTED_LIGHTING_NORMAL], lightingCos, 0, lightingSin, (lightingSin + 1) * CONST_DIRECTIONAL_LIGHT_INTENSITY_DIV_2);


            let cameraLightDistance = CONST_CAMERA_LIGHT_DISTANCE;
            let cameraLightIntensity = CONST_CAMERA_LIGHT_INTENSITY;
            if( FLAG_MUZZLE_FLASH ) {
                let shotLightBonus = max(0, lastShot + CONST_MUZZLE_FLASH_DURATION - world.age)/CONST_MUZZLE_FLASH_DURATION;
                cameraLightIntensity += shotLightBonus;
                // I don't think this will make much difference
                //cameraLightDistance += shotLightBonus;
            }
            let wince: number;
            if( FLAG_SHIELD_EFFECTS_FOCUS ) {
                wince = max(
                    0, 
                    min(1, (battery - CONST_BATTERY_WARNING)/CONST_BATTERY_WARNING)*CONST_MAX_SHIELD_INTENSITY, 
                    (1 - (world.age - player.lastDamageAge - CONST_WINCE_DURATION)) * CONST_WINCE_INTENSITY / CONST_WINCE_DURATION
                );     
            } else {
                wince = max(
                    0, 
                    (1 - (world.age - player.lastDamageAge - CONST_WINCE_DURATION)) * CONST_WINCE_INTENSITY / CONST_WINCE_DURATION
                );     
            }
            gl.uniform4f(uniformLocations[U_CAMERA_LIGHT], cameraLightDistance, cameraLightIntensity, CONST_FOCUS - wince, CONST_BLOOM + wince);    
    
            // draw all the entities
            for( let side in world.allEntities ) {
                if( side as any != SIDE_BUILDING ) {
                    let entities = world.allEntities[side];
                    entities.map(function(entity) {
                        let surfaceOrMonster = entity as Surface | Monster;
                        if( !FLAG_GL_CULL_EXPLOSIONS ) {
                            gl.enable(CONST_GL_CULL_FACE);
                        }
            
                        webglBindAttributeBuffer(gl, surfaceOrMonster.positionBuffer, aVertexPosition, 4);
                        webglBindAttributeBuffer(gl, surfaceOrMonster.gridCoordinateBuffer, aGridCoordinate, 4);
                        
                        gl.bindBuffer(CONST_GL_ELEMENT_ARRAY_BUFFER, surfaceOrMonster.indicesBuffer);
            
                        let fillColor = surfaceOrMonster.filledColor;
                        let directedLightingRange: Vector4;
                        let ambientLighting = CONST_AMBIENT_LIGHT_INTENSITY;
                        if( surfaceOrMonster.lastDamageAge && surfaceOrMonster.lastDamageAge + CONST_DAMAGE_FLASH_DURATION > world.age ) {
                            ambientLighting += (surfaceOrMonster.lastDamageAge + CONST_DAMAGE_FLASH_DURATION - world.age)/CONST_DAMAGE_FLASH_DURATION_2;
                        }
    

                        gl.uniform1i(uniformLocations[U_GRID_MODE], entity.entityType);

                        let offsetBuffer: WebGLBuffer;
                        let lineColor: Vector3;
                        let modelMatrix: Matrix4;
                        if( entity.entityType ) {
                            let monster = entity as Monster; 
                            offsetBuffer = monster.offsetBuffer;
                            let translationMatrix = matrix4Translate(monster.x, monster.y, monster.z);
                            let rotationMatrixX = matrix4Rotate(0, 1, 0, -monster.rx);
                            let rotationMatrixY = matrix4Rotate(1, 0, 0, -monster.ry);
                            let rotationMatrixZ = matrix4Rotate(0, 0, 1, -monster.rz);

                            let matrixStack = [translationMatrix, rotationMatrixZ, monster.specialMatrix, rotationMatrixX, rotationMatrixY];

                            // attempt to find the surface this entity is above
                            directedLightingRange = [0, 0, 0, 0];
                            let surfaces = world.getEntitiesAt(floor(monster.x/CONST_CHUNK_WIDTH), floor(monster.y/CONST_CHUNK_HEIGHT));
                            if( surfaces ) {
                                let surface = surfaces[0] as Surface;
                                if( !surface.entityType ) {
                                    directedLightingRange = surface.directedLightingRange;
                                    if( FLAG_PROPERLY_CHECK_SURFACE_NORMAL && !surface.floor ) {
                                        console.warn('got bad surface', surface);
                                    }    
                                }
                            }
            
                            let cycle = entity.age / monster.cycleLength;
                            let offsetMultiplier = 0;
                            lineColor = monster.lineColor;
                            if( monster.deathAge ) {
                                if( !FLAG_GL_CULL_EXPLOSIONS ) {
                                    gl.disable(CONST_GL_CULL_FACE);
                                }
                                let b = (entity.age - monster.deathAge)/CONST_DEATH_ANIMATION_TIME;
                                let bsq = b * b;
                                let scale = 1 - bsq*.99;
                                offsetMultiplier = bsq * 3 * monster.radius / scale; 
                                // explode away from the camera
                                //matrixStack.splice(1, 0, matrix4Scale(1 - b * sinZ, 1 - b * cosZ, 1 - b));
                                matrixStack.splice(1, 0, matrix4Scale(scale, scale, scale));
                                lineColor = vectorNMix(CONST_FOG_COLOR_VECTOR, lineColor, bsq);
                                fillColor = vectorNMix(CONST_FOG_COLOR_VECTOR, fillColor, bsq);
                                // do one last animation
                                cycle = monster.deathAge / monster.cycleLength + (monster.age - monster.deathAge)/CONST_DEATH_ANIMATION_TIME;
                            }
                            gl.uniform1f(uniformLocations[U_CYCLE_RADIANS], cycle * CONST_DIRTY_PI_2);
                            gl.uniform1f(uniformLocations[U_OFFSET_MULTIPLIER], offsetMultiplier);
            
                            modelMatrix = matrix4MultiplyStack(matrixStack);
            
                        } else {
                            let surface = entity as Surface;
                            // doesn't get used, but put something in to prevent errors from disposed buffers
                            offsetBuffer = surface.gridCoordinateBuffer;
                            modelMatrix = surface.pointsToWorld;

                            gl.uniform3fv(uniformLocations[U_SURFACE_NORMAL], surface.normal);
                            gl.uniform3f(uniformLocations[U_GRID_DIMENSION], surface.surfaceWidth, surface.surfaceHeight, surface.building&&surface.logo?surface.building.friendliness:0);
                            if( surface.logo ) {
                                gl.bindTexture(CONST_GL_TEXTURE_2D, surface.logo);
                            }
                            gl.uniform1fv(uniformLocations[U_GRID_LIGHTING], surface.gridLighting);
                            lineColor = CONST_INERT_GRID_COLOR_RGB;
                            directedLightingRange = surface.directedLightingRange;
                        }
                        webglBindAttributeBuffer(gl, offsetBuffer, aVertexOffset, 4); 
            
                        gl.uniformMatrix4fv(uniformLocations[U_MODEL_MATRIX], false, modelMatrix);
                        gl.uniform4fv(uniformLocations[U_FILL_COLOR], fillColor);
                        gl.uniform3fv(uniformLocations[U_LINE_COLOR], lineColor);
                        gl.uniform4fv(uniformLocations[U_DIRECTED_LIGHTING_RANGE], directedLightingRange);
                        gl.uniform1f(uniformLocations[U_AMBIENT_LIGHT], ambientLighting);

                        gl.drawElements(CONST_GL_TRIANGLES, surfaceOrMonster.indicesCount, FLAG_GL_16_BIT_INDEXES?CONST_GL_UNSIGNED_SHORT:CONST_GL_UNSIGNED_BYTE, 0);
                    });
                }                    
            }
        }

        let bulletPositionMatrix: Matrix4;
        let gunPositionMatrix = matrix4Translate(player.radius*CONST_GUN_LENGTH_SCALE, -player.radius*CONST_GUN_BARREL_OFFSET_Y, -player.radius*CONST_GUN_BARREL_OFFSET_Z);
        let headPositionMatrix = matrix4Translate(0, 0, player.radius);

        let previousViewMatrix: Matrix4;
        if( FLAG_INLINE_IDENTITY_MATRIX ) {
            previousViewMatrix = MATRIX4_IDENTITY;
        } else {
            previousViewMatrix = matrix4Identity();
        }
        let _update = function(now: number) {
            
            animationFrameHandle = requestAnimationFrame(_update);

            let diff = min(CONST_MAX_FRAME_DURATION, now - then);
            then = now;

            world.updateWorld(diff);

            if( FLAG_BLOOM ) {
                gl.activeTexture(CONST_GL_TEXTURE0);
                gl.bindTexture(CONST_GL_TEXTURE_2D, targetTexture);            
                gl.framebufferTexture2D(CONST_GL_FRAMEBUFFER, CONST_GL_COLOR_ATTACHMENT0, CONST_GL_TEXTURE_2D, targetTexture, 0);
            }

            let deadness = 0;
            if( FLAG_DEATH_ANIMATION && player.deathAge ) {
                deadness = sin(min(CONST_DIRTY_PI_ON_2, (world.age - player.deathAge)/999));
            }

            world.setCameraPosition(
                player.x, 
                player.y, 
                player.z + player.radius + deadness * CONST_VISIBLE_DISTANCE/2, 
                (player.rx + CONST_DIRTY_PI_ON_2) * (1 - deadness), 
                player.ry, 
                player.rz - CONST_DIRTY_PI_ON_2
            );
            let listener = audioContext.listener;
            listener.setPosition(player.x, player.y, player.z);       
            listener.setOrientation(cos(player.rz), sin(player.rz), 0, 0, 0, 1);
                 

            // adjust for walk animation
            let walkTranslationMatrix: Matrix4;
            if( FLAG_SHAKY_CAMERA ) {
                let screenShake = max(0, (lastShot + 99 - world.age)/3e3);
                walkTranslationMatrix = matrix4Translate(
                    sin(walkDistance)*player.radius/8 + (rng() - .5)*screenShake, 
                    screenShake, 
                    m.abs(cos(walkDistance)*player.radius/8) + (rng() - .5)*screenShake
                );
            }
            let rotationMatrixX = matrix4Rotate(1, 0, 0, world.cameraRotationX);
            let rotationMatrixZ = matrix4Rotate(0, 0, 1, world.cameraRotationZ);

            let gunRotationXMatrix = matrix4Rotate(0, 1, 0, -player.rx);

            bulletPositionMatrix = matrix4MultiplyStack([
                headPositionMatrix, 
                matrix4Rotate(0, 0, 1, -player.rz),
                gunRotationXMatrix, 
                gunPositionMatrix, 
                // extend the rest of the gun length out, plus a bullet radius
                // TODO don't recalculate every time
                matrix4Translate(player.radius*CONST_GUN_LENGTH_SCALE/2 + CONST_BULLET_RADIUS/2, 0, 0)
            ]);

            player.specialMatrix = matrix4MultiplyStack([
                headPositionMatrix, 
                gunRotationXMatrix,
                gunPositionMatrix, 
                // TODO don't recalculate every time
                matrix4Scale(CONST_GUN_LENGTH_SCALE, CONST_GUN_LATERAL_SCALE, CONST_GUN_LATERAL_SCALE),
                // TODO don't recalculate every time
                matrix4Rotate(1, 0, 0, -CONST_DIRTY_PI/6),                 
                matrix4Rotate(0, 1, 0, CONST_DIRTY_PI/2+player.rx), 
            ]);
    
            // camera is never rotated on the y axis
            //let rotationMatrixY = matrix4Rotate(0, 1, 0, world.cameraRotationY);
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

            if( FLAG_BLOOM ) {
                let tmp = sourceTexture;
                sourceTexture = targetTexture;
                targetTexture = tmp;
    
                gl.readPixels(0, 0, canvasWidth, canvasHeight, CONST_GL_RGBA, CONST_GL_UNSIGNED_BYTE, textureData);
                textureImageData.data.set(textureData);
                context.putImageData(textureImageData, 0, 0);         

            } else {
                context.clearRect(0, 0, canvasWidth, canvasHeight);
            }
            context.globalCompositeOperation = 'destination-over';
            // draw in a background
            if( FLAG_BACKGROUND ) {
                let lightingMatrix: Matrix4;
                if( FLAG_BLOOM ) {
                    lightingMatrix = matrix4Multiply(projectionMatrix, rotationMatrixX)
                } else {
                    lightingMatrix = matrix4MultiplyStack([projectionMatrix, matrix4Scale(1, -1, 1), rotationMatrixX]);
                }
                let screenPosition = vector3TransformMatrix4(
                    0, 
                    1, 
                    .2, 
                    lightingMatrix
                );
                // only need y from screen position
                
                let backgroundY = (screenPosition[1] * canvasHeight - canvasHeight)/2 | 0;
                
                let west = numberPositiveMod(world.cameraRotationZ - CONST_DIRTY_PI_ON_2, CONST_FAIRLY_ACCURATE_PI_2);
                // let east = (world.cameraRotationZ + PI)%(PI*2);
                // if( east < 0 ) {
                //     east += PI*2;
                // }

                let circumference = CONST_FAIRLY_ACCURATE_PI_2/fovX * canvasWidth;
                let skyballX = ((west * canvasWidth / fovX)) % circumference - circumference/2 + canvasWidth/2;
                let backgroundX = (world.cameraRotationZ * canvasWidth/fovX) % canvasWidth - canvasWidth;

                while( backgroundX < canvasWidth && player.x < CONST_FINISH_X ) 
                {
                    context.drawImage(skybox, backgroundX, backgroundY);
                    backgroundX += canvasWidth;
                }
                if( FLAG_BACKGROUND_TARGET ) {
                    let skyballPosition = vector3TransformMatrix4(
                        0, 
                        lightingCos, 
                        lightingSin, 
                        lightingMatrix
                    );
                    
                    let skyballY = (skyballPosition[1] * canvasHeight + canvasHeight)/2;
                    let skyGradient = context.createRadialGradient(skyballX, skyballY, canvasHeight/9, skyballX, skyballY, canvasHeight);
                    let adj = 1 + sin(world.age/999)/9;
                    skyGradient.addColorStop(.1 * adj, sunColor);
                    skyGradient.addColorStop(.11 * adj, sunCaladeraColor);
                    skyGradient.addColorStop(1, skyColor);
                    context.fillStyle = skyGradient;
                } else {
                    context.fillStyle = CONST_SKY_COLOR_HIGH_RGB;
                }

                context.fillRect(0, 0, canvasWidth, backgroundY + canvasHeight);
                context.fillStyle = CONST_FOG_COLOR_RGB;
                context.fillRect(0, max(0, backgroundY + canvasHeight), canvasWidth, canvasHeight);
                
            } else {
                context.fillStyle = CONST_FOG_COLOR_RGB;
                context.fillRect(0, 0, canvasWidth, canvasHeight);    
            }

            context.globalCompositeOperation = 'source-over';
            context.textBaseline = 'top';
            if( FLAG_SHOW_FPS && diff ) {
                context.font = `12px sans-serif`;
                context.fillStyle = '#f00';
                frames ++;
                context.fillText(`${m.round((frames * 1000)/now)} (${m.round(1000/diff)}) FPS`, 10, 30);    
            } 

            context.fillStyle = context.strokeStyle = '#fff';
            context.globalAlpha = m.abs(sin(world.age/99))/2+.5;
            context.font = CONST_STATUS_FONT;
            context.textAlign = 'center';
            if( displayMessageTime && world.age - displayMessageTime < CONST_MESSAGE_TIME ) {
                context.fillText(displayMessage, canvasWidth/2, canvasHeight/2);
            }
            if( FLAG_MEASURE_TEXT ) {
                context.textAlign = 'left';
            } 
            if( !player.deathAge ) {
                let fillStyle;                
                if( FLAG_FLASH_BATTERY_BOOST_FLASH_BAR ) {
                    let batteryBoost = lastBatteryBoost - world.age + CONST_BATTERY_BOOST_ANIMATION_DURATION;
                    let p = min(1, 1 - batteryBoost/CONST_BATTERY_BOOST_ANIMATION_DURATION);
                    if( battery > CONST_BASE_BULLET_COST ) {
                        context.globalAlpha = p;
                    }
                    context.lineWidth = 9 - p*7;    
                }

                if( battery < CONST_BATTERY_WARNING ) {
                    fillStyle = 'red';
                }  else {
                    fillStyle = '#4f4';
                }
                context.fillStyle = fillStyle;
                if( battery < CONST_BASE_BULLET_COST ) {
                    context.strokeStyle = 'red';
                }
                // show battery
                context.fillRect(canvasWidth - maxBattery - CONST_STATUS_HEIGHT, CONST_STATUS_HEIGHT, battery, CONST_STATUS_HEIGHT);
                context.strokeRect(canvasWidth - maxBattery - CONST_STATUS_HEIGHT, CONST_STATUS_HEIGHT, maxBattery, CONST_STATUS_HEIGHT);
                let powerSymbolWidth = FLAG_MEASURE_TEXT?context.measureText(CONST_BATTERY_SYMBOL).width:(CONST_STATUS_HEIGHT*.9|0);
                let p = lastPower;
                let x = canvasWidth - maxBattery - (CONST_STATUS_HEIGHT+9);
                while( p > 0 ) {
                    x-= powerSymbolWidth;
                    context.fillText(CONST_BATTERY_SYMBOL, x, CONST_STATUS_HEIGHT);
                    p--;
                }
            }
            context.globalAlpha = 1;
        }   
        _update(0);     
    
    }
    return play;
}