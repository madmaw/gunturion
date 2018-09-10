const SURFACE_BUFFER = .1;

const SIDE_SCENERY = 0;
const SIDE_PLAYER = 1;
const SIDE_ENEMY = 2;
const SIDE_NEUTRAL = 3;
const SIDE_POWERUPS = 4;
const SIDE_BUILDING = 5;

const MONSTER_BEHAVIOUR_FLAG_LATERAL_MOVEMENT = 1;
const MONSTER_BEHAVIOUR_FLAG_VERTICAL_MOVEMENT = 2;
const MONSTER_BEHAVIOUR_FLAG_ROTATION_Z = 4;
const MONSTER_BEHAVIOUR_FLAG_ROTATION_X = 8;

interface EntityBase {
    entityType: number;
    cleanup(): void;
    side: number;
}

interface Updatable {
    age: number;
    onUpdate(world: World, diff: number): any;
}

interface Bounded {
    entityId: number;
    bounds(): Rect3;
}

interface Rendered {
    filledColor: Vector3;
    positionBuffer: WebGLBuffer;
    gridCoordinateBuffer: WebGLBuffer;
    indicesBuffer: WebGLBuffer;
    indicesCount: number;
}

interface Monster extends EntityBase, Updatable, Bounded, Rendered {
    entityType: 1;
    radius: number;
    x: number;
    y: number;
    z: number;
    vx: number; 
    vy: number;
    vz: number;
    rx: number;
    ry: number; 
    rz: number;
    lineColor: Vector3;
    specialMatrix?: Matrix4;
    lastDamageAge?: number;
    deathAge?: number;
    birthday?: number,
    offsetBuffer: WebGLBuffer;
    onCollision(world: World, entity: Entity): void;
    die(world: World, deathSource?: Entity): void,
    restitution: number;
    visible: number;
    cycleLength: number;
    gravityMultiplier: number;
    previousPosition?: Vector3;
    previousVelocity?: Vector3;
    seed: number;
    sound?: SoundLoop3D;
}

interface MonsterBehaviour {
    (world: World, diff: number, takenFlags: number): any;
}

interface MonsterDeathBehaviour {
    (world: World, deathSource: Entity): void;
}

interface Surface extends EntityBase, Bounded, Rendered {
    entityType: 0; 
    normal: Vector3;
    points: Vector2[];
    worldToPoints: Matrix4;
    pointsToWorld: Matrix4;
    chunkX: number;
    chunkY: number;
    worldToPointsRotation: Matrix4;
    pointsToWorldRotation: Matrix4;
    surfaceWidth: number;
    surfaceHeight: number;
    gridLighting: number[];
    directedLightingRange: Vector4;
    lastDamageAge?: number;
    floor?: number;
    onCollision?: (world: World, entity: Entity) => void;
}

interface Building extends EntityBase, Updatable {
    entityType: -1;
    chunkX: number;
    chunkY: number;
    power: number;
    friendliness: number;
}

type Entity = Monster | Surface | Building;

interface MonsterGenerator {
    (
        seed: number,
        x: number, 
        y: number, 
        z: number, 
        radius: number, 
        maxAge?: number, 
        onDie?: (world: World) => void
    ): Monster;
}

interface SurfaceGenerator {
    (
        x: number, 
        y: number, 
        z: number, 
        width: number, 
        height: number, 
        chunkX: number, 
        chunkY: number,
        rotateX: number, 
        rotateY: number, 
        fillColor: Vector3, 
        lineScaleX: number, 
        lineScaleY: number,
        directedLightingRange: Vector4, 
        onCollision?: (world: World, entity: Entity) => void
    ): Surface;
}


function surfaceGeneratorFactory(gl: WebGLRenderingContext): SurfaceGenerator {
    let nextId = 0;

    return function(
        x: number, 
        y: number, 
        z: number, 
        width: number, 
        height: number, 
        chunkX: number, 
        chunkY: number,
        rotateX: number, 
        rotateY: number, 
        fillColor: Vector3, 
        lineScaleX: number, 
        lineScaleY: number,
        directedLightingRange: Vector4, 
        onCollision: (world: World, entity: Entity) => void
    ) {
        let surfaceId = --nextId;

        let floorPositions = [
            0, 0, 0, 0,  
            width, 0, 0, 0, 
            width, height, 0, 0, 
            0, height, 0, 0
        ];
        let floorPositionBuffer = webglCreateArrayBuffer(gl, floorPositions);
        
        let lineX = width/lineScaleX;
        let lineY = height/lineScaleY;
        // assume we are always rotating only one axis by 90 degrees
        let lineAspectRatio = rotateX?lineScaleX/lineScaleY:lineScaleY/lineScaleX;
        // assume the min is the one we're trying to match
        let lineWidth = CONST_GRID_LINE_WIDTH / Math.min(lineScaleX, lineScaleY);
        let gridCoordinates = [
            0, 0, lineAspectRatio, lineWidth,  
            lineX, 0, lineAspectRatio, lineWidth, 
            lineX, lineY, lineAspectRatio, lineWidth, 
            0, lineY, lineAspectRatio, lineWidth
        ];
        let gridCoordinateBuffer = webglCreateArrayBuffer(gl, gridCoordinates);

        let floorIndices = [
            // triangle 1
            0, 1, 2,
            // triangle 2
            0, 2, 3
        ];
        let floorIndicesBuffer = webglCreateElementArrayBuffer(gl, floorIndices);

        let worldToPointsRotationMatrix = matrix4Multiply(
            matrix4Rotate(1, 0, 0, rotateX), 
            matrix4Rotate(0, 1, 0, rotateY)
        );
        let worldToPointsMatrix = matrix4Multiply(
            worldToPointsRotationMatrix, 
            matrix4Translate(-x, -y, -z),
        );
        let pointsToWorldRotationMatrix = matrix4Multiply(
            matrix4Rotate(0, 1, 0, -rotateY),
            matrix4Rotate(1, 0, 0, -rotateX) 
        );
        let pointsToWorldMatrix = matrix4Multiply(
            matrix4Translate(x, y, z), 
            pointsToWorldRotationMatrix,
        );
        
        let normal = vector3TransformMatrix4(0, 0, 1, pointsToWorldRotationMatrix);
        let maxRotatedDimensions = vector3TransformMatrix4(
            width + SURFACE_BUFFER, 
            height + SURFACE_BUFFER, 
            SURFACE_BUFFER, 
            pointsToWorldRotationMatrix
        );
        let minRotatedDimensions = vector3TransformMatrix4(
            -SURFACE_BUFFER, 
            -SURFACE_BUFFER, 
            -SURFACE_BUFFER, 
            pointsToWorldRotationMatrix
        );
        let bounds: Rect3 = {
            minimum: [
                Math.min(x + minRotatedDimensions[0], x + maxRotatedDimensions[0]), 
                Math.min(y + minRotatedDimensions[1], y + maxRotatedDimensions[1]), 
                Math.min(z + minRotatedDimensions[2], z + maxRotatedDimensions[2])
            ], 
            maximum: [
                Math.max(x + minRotatedDimensions[0], x + maxRotatedDimensions[0]), 
                Math.max(y + minRotatedDimensions[1], y + maxRotatedDimensions[1]), 
                Math.max(z + minRotatedDimensions[2], z + maxRotatedDimensions[2])
            ]
        }
        let gridLighting = [0, 0, 0, 0];

        let surface: Surface = {
            entityType: 0,
            entityId: surfaceId--,
            normal: normal,
            points: [[0, 0], [width, 0], [width, height], [0, height]],
            chunkX: chunkX, 
            chunkY: chunkY,
            surfaceWidth: width, 
            surfaceHeight: height,
            filledColor: fillColor, 
            positionBuffer: floorPositionBuffer, 
            gridCoordinateBuffer: gridCoordinateBuffer,
            gridLighting: gridLighting,
            indicesBuffer: floorIndicesBuffer,
            indicesCount: floorIndices.length,
            worldToPoints: worldToPointsMatrix, 
            pointsToWorld: pointsToWorldMatrix,
            worldToPointsRotation: worldToPointsRotationMatrix, 
            pointsToWorldRotation: pointsToWorldRotationMatrix,
            directedLightingRange: directedLightingRange,
            side: SIDE_SCENERY,
            cleanup: function() {
                gl.deleteBuffer(gridCoordinateBuffer);
                gl.deleteBuffer(floorIndicesBuffer);
            },
            bounds: function(this: Surface): Rect3 {
                return bounds;
            }, 
            onCollision: onCollision
        };
        return surface;
    }    
}

function monsterGeneratorFactory(gl: WebGLRenderingContext, rngFactory: RandomNumberGeneratorFactory, audioContext: AudioContext): MonsterGenerator {

    let soundLoopFactory = webAudioVibratoSoundLoop3DFactory(audioContext, rngFactory);
    let dieSound = webAudioBoomSoundFactory(audioContext, .7, .1, 777, .4, .3);


    let nextId = 0;

    function fib(i: number) {
        let prev = 1;
        let f = 1;
        while( i ) {
            let p = f;
            f = f + prev;
            prev = p;
            i--;
        }
        return f;
    }

    let monsterGenerator = function(
        seed: number,
        x: number, 
        y: number, 
        z: number, 
        radius: number, 
        maxAge?: number, 
        onDie?: (world: World) => void, 
        acceleration?: number
    ): Monster {

        function shift(bits: number): number {
            let mask = Math.pow(2, bits) - 1;
            let b = s & mask;
            s>>=bits;
            if( FLAG_WARN_SHIFT_TOO_FAR ) {
                shifts += bits;
                if( shifts > 31 ) {
                    console.warn('shifting too much', shifts);
                }
    
            }
            return b;
        }   

        let s = seed;
        let rng = rngFactory(seed);

        let shifts = 0;
    
    
        let ringsBase = shift(3);
        let rings = fib(ringsBase)%11; // 1, 2, 3, 5, 8, 13(2), 21(10), 34(1)
        let minPointCount = fib(shift(2)+1) + Math.max(1, ringsBase-1); // 2, 3, 5, 8 + rings
        let horizontalScale = (shift(1)+minPointCount)/(minPointCount+1);
        // TODO we don't have code for the other way 
        let equalRingOffset = shift(1);
        //equalRingOffset = 1;
        let allowPointyTip = shift(1);
        let cycleLength = (shift(5)+32) * 99 * radius;  
        let maxSpikiness = (shift(2)+1)/(14 - rings);
        
        let cycleBase = (shift(4)) * CONST_DIRTY_PI_2/minPointCount;

        let patternBits = 2;
        let pattern = shift(patternBits) | shift(patternBits);        


        let colorPattern = shift(3);
        let ry = shift(1) * CONST_DIRTY_PI_DIV_2;     
        let high: number;
        let low: number;
        let lowVariance = .1;
        let fillColor = [];
        let lineColor = [];
        let i=3;
        if( !colorPattern ) {
            colorPattern |= 1 << rng(3);
        } else if( colorPattern > 5 ) {
            // we own yellow and we don't want white
            colorPattern &= ~(1 << (rng(colorPattern-5)+1));
        } 
        if( colorPattern == 1 ) {
            // blues are too dark
            // only one
            high = 1;
            low = .4;
            lowVariance = .2;
        } else if( colorPattern % 2 ) {
            // two lit
            high = .7;
            low = .3;
        } else {
            // only one
            high = .9;
            low = .4;
        }
        if( FLAG_BIGGER_IS_BRIGHTER ) {
            low *= Math.min(2, radius/CONST_BASE_RADIUS);
        }
        while( i-- ) {
            let colorPatternBit = colorPattern & 1;
            colorPattern >>= 1;
            if( colorPatternBit) {
                fillColor.unshift(low + rng()*lowVariance);
                lineColor.unshift(high + rng()*lowVariance);
            } else {
                fillColor.unshift(0);
                lineColor.unshift(low + rng()*lowVariance);
            }
        }

        
        // reset
        s = seed;
        if( FLAG_WARN_SHIFT_TOO_FAR ) {
            shifts = 0;
        }
        function addPoint(x: number, y: number, z: number, spikiness: number, cx: number, cy: number, cz: number) {
            let length = vector3Length([x, y, z]);
            offsets.push(cx, cy, cz, spikiness);
            positions.push(x, y, z, length);
        }

        // if the first bit is 0, we generate flying monsters, important for when the player is inaccessible
        let gravityMultiplier = Math.min(1, shift(2)/2);
        let restitution = shift(2)/4;

        // generate
        let positions: number[] = [];
        let indices: number[] = [];
        let barrycentricCoordinates: number[] = [];
        let offsets: number[] = [];


        let ringPointCounts: number[] = [];
        let ringAngles: number[] = [];
        let ringDiv: number;
        let angleYOffset: number;
        let tipZ: number;
        let pointyTip = (rings % 2 && minPointCount > 3 
            || !equalRingOffset) && allowPointyTip 
            || rings == 1;
        gravityMultiplier *= gravityMultiplier;
        if( pointyTip ) {
            ringDiv = rings + 1;
            angleYOffset = CONST_DIRTY_PI/ringDiv;
            tipZ = radius;
        } else {
            ringDiv = rings;
            angleYOffset = CONST_DIRTY_PI/(ringDiv*2);
            tipZ = Math.cos(angleYOffset) * radius;
        }
        let ringOffset = 0;
        let angleY = angleYOffset;
        for( let ring=0; ring<rings; ring++ ) {
            ringAngles.push(angleY);
            ringPointCounts.push(minPointCount);
            angleY += CONST_FAIRLY_ACCURATE_PI/ringDiv;
        }
        
        for( let ring=0; ring<rings; ring++ ) {
            let ringPointCount = ringPointCounts[ring];
            let ringAngleY = ringAngles[ring];
            let nextRingOffset = ringOffset + equalRingOffset;
            let ringRadius = Math.sin(ringAngleY) * radius * horizontalScale/Math.cos(CONST_DIRTY_PI/ringPointCount);
            let ringZ = Math.cos(ringAngleY) * radius;
            
            for( let point = 0; point < ringPointCount; point ++ ) {
                let cycleOffset = (point + ring) * cycleBase;
                let nextCycleOffset = ((point+1)%ringPointCount + ring) * cycleBase;
                let ringSpikiness = maxSpikiness*Math.sin(ringAngleY);
                let spikiness = (pattern >> (point)%patternBits)&1?ringSpikiness:0;
                let nextSpikiness = (pattern >> ((point+1)%ringPointCount)%patternBits)&1?ringSpikiness:0;

                let angleZ = ringOffset * CONST_FAIRLY_ACCURATE_PI/ringPointCount + point * CONST_FAIRLY_ACCURATE_PI_2/ringPointCount;  
                let nextAngleZ = angleZ + CONST_FAIRLY_ACCURATE_PI_2/ringPointCount;
                let l = indices.length;
                let rx = Math.cos(angleZ) * ringRadius;
                let ry = Math.sin(angleZ) * ringRadius;
                let nextRx = Math.cos(nextAngleZ) * ringRadius;
                let nextRy = Math.sin(nextAngleZ) * ringRadius;
                if( ring < rings - 1 ) {
                    let nextRingPointCount = ringPointCounts[ring+1];

                    let nextRingAngleY = ringAngles[ring+1];
                    
                    let nextRingCycleOffset = (point + ring + 1) * cycleBase;
                    let nextRingNextCycleOffset = ((point + 1)%nextRingPointCount + ring + 1) * cycleBase;
                    let nextRingRingSpikiness = maxSpikiness * Math.sin(nextRingAngleY);
                    let nextRingSpikiness = (pattern >> (point)%patternBits)&1?nextRingRingSpikiness:0;
                    let nextRingNextSpikiness = (pattern >> ((point + 1)%nextRingPointCount)%patternBits)&1?nextRingRingSpikiness:0;
    
                    let nextRingRadius = Math.sin(nextRingAngleY) * radius * horizontalScale/Math.cos(CONST_DIRTY_PI/nextRingPointCount);
                    let nextRingZ = Math.cos(nextRingAngleY) * radius;
                    let nextRingAngleZ = nextRingOffset * CONST_FAIRLY_ACCURATE_PI / nextRingPointCount + point * CONST_FAIRLY_ACCURATE_PI_2/nextRingPointCount;
                    let nextRingNextAngleZ = nextRingAngleZ + CONST_FAIRLY_ACCURATE_PI_2 / nextRingPointCount;
                    let nextRingRx = Math.cos(nextRingAngleZ)*nextRingRadius;
                    let nextRingRy = Math.sin(nextRingAngleZ) * nextRingRadius;
                    let nextRingNextRx = Math.cos(nextRingNextAngleZ)*nextRingRadius;
                    let nextRingNextRy = Math.sin(nextRingNextAngleZ) * nextRingRadius;


                    let r1 = rng()+.5;
                    let r2 = rng()+.5;

                    // let normal1 = vector3GetNormal(
                    //     rx - nextRingRx, ry - nextRingRy, ringZ - nextRingZ, 
                    //     rx - nextRx, ry - nextRy, 0
                    // );
                    let cx1 = (rx + nextRx + nextRingNextRx) * r1 / 3;
                    let cy1 = (ry + nextRy + nextRingNextRy) * r1 / 3;
                    let cz1 = (ringZ * 2 + nextRingZ) * r1 / 3;
                    // if( vector3DotProduct(normal1, [cx1, cy1, cz1]) < 0 ) {
                    //     throw 'incorrect normal';
                    // }

                    // let normal2 = vector3GetNormal(
                    //     nextRingNextRx - nextRingRx, nextRingNextRy - nextRingRy, 0, 
                    //     nextRx - nextRingRx, nextRy - nextRingRy, ringZ - nextRingZ
                    // );
                    let cx2 = (nextRx + nextRingRx + nextRingNextRx) * r2 / 3;
                    let cy2 = (nextRy + nextRingRy + nextRingNextRy) * r2 / 3;
                    let cz2 = (ringZ + nextRingZ * 2) * r2 / 3;
                    // if( vector3DotProduct(normal2, [cx2, cy2, cz2]) < 0 ) {
                    //     throw 'incorrect normal';
                    // }

                    // normals.push.apply(normals, normal1));
                    // normals.push.apply(normals, normal1);
                    // normals.push.apply(normals, normal1);
                    // normals.push.apply(normals, normal2);
                    // normals.push.apply(normals, normal2);
                    // normals.push.apply(normals, normal2);

                    addPoint(nextRx, nextRy, ringZ, nextSpikiness, cx1, cy1, cz1);
                    addPoint(rx, ry, ringZ, spikiness, cx1, cy1, cz1);
                    addPoint(nextRingRx, nextRingRy, nextRingZ, nextRingSpikiness, cx1, cy1, cz1);
                    addPoint(nextRx, nextRy, ringZ, nextSpikiness, cx2, cy2, cz2);
                    addPoint(nextRingRx, nextRingRy, nextRingZ, nextRingSpikiness, cx2, cy2, cz2);
                    addPoint(nextRingNextRx, nextRingNextRy, nextRingZ, nextRingNextSpikiness, cx2, cy2, cz2);

                    indices.push(
                        // face 1
                        l++, l++, l++, 
                        // face 2
                        l++, l++, l++

                    );
                    // positions.push(
                    //     // face 1
                    //     nextRx, nextRy, ringZ, nextSpikiness,  
                    //     rx, ry, ringZ, spikiness,  
                    //     nextRingRx, nextRingRy, nextRingZ, nextRingSpikiness,  
                    //     // face 2
                    //     nextRx, nextRy, ringZ, nextSpikiness,  
                    //     nextRingRx, nextRingRy, nextRingZ, nextRingSpikiness,  
                    //     nextRingNextRx, nextRingNextRy, nextRingZ, nextRingNextSpikiness,  
                    // );
                    // centerPoints.push(
                    //     cx1, cy1, cz1, r1,
                    //     cx1, cy1, cz1, r1, 
                    //     cx1, cy1, cz1, r1, 

                    //     cx2, cy2, cz2, r2, 
                    //     cx2, cy2, cz2, r2, 
                    //     cx2, cy2, cz2, r2, 
                    // );
                    if( equalRingOffset ) {
                        barrycentricCoordinates.push(
                            // face 1
                            1, 0, 0, nextCycleOffset, 
                            0, 1, 0, cycleOffset, 
                            0, 0, 1, nextRingCycleOffset, 
                            // face 2
                            1, 0, 0, nextCycleOffset, 
                            0, 1, 0, nextRingCycleOffset, 
                            0, 0, 1, nextRingNextCycleOffset,
                        );    
                    } else {
                        // remove the center line
                        if( FLAG_CAP_ENDS ) {
                            if( ring == 0 && !pointyTip ) {
                                barrycentricCoordinates.push(
                                    // face 1
                                    0, 0, 1, nextCycleOffset, 
                                    0, 1, 0, cycleOffset, 
                                    1, 1, 0, nextRingCycleOffset, 
                                );    
                            } else {
                                barrycentricCoordinates.push(
                                    // face 1
                                    0, 1, 1, nextCycleOffset, 
                                    1, 1, 0, cycleOffset,
                                    1, 1, 0, nextRingCycleOffset
                                );    
                            }
                            if( ring == rings - 2 && !pointyTip ) {
                                barrycentricCoordinates.push(
                                    // face 2
                                    1, 0, 0, nextCycleOffset,
                                    0, 1, 1, nextRingCycleOffset,
                                    0, 0, 1, nextRingNextCycleOffset
                                );        
                            } else {
                                barrycentricCoordinates.push(
                                    // face 2
                                    1, 1, 0, nextCycleOffset,
                                    0, 1, 1, nextRingCycleOffset,
                                    1, 1, 0, nextRingNextCycleOffset
                                );        
                            }

                        } else {
                            barrycentricCoordinates.push(
                                // face 1
                                0, 1, 1, nextCycleOffset,
                                1, 1, 0, cycleOffset,
                                1, 1, 0, nextRingCycleOffset,
                                // face 2
                                1, 1, 0, nextCycleOffset,
                                0, 1, 1, nextRingCycleOffset,
                                1, 1, 0, nextRingNextCycleOffset
                            );        
                        }
                    } 

                    angleZ = nextAngleZ;
                }
                // add in the base
                let tips = [];
                let tipSpikiness = pointyTip?maxSpikiness:0;
                if( ring == 0 ) {
                    tips.push(tipZ);
                }
                if( ring == rings - 1 ) {
                    tips.push(-tipZ);
                }
                while( tips.length ) {
                    let tip = tips.splice(0, 1)[0];
                    indices.push( 
                        l++, l++, l++
                    );
                    let r = rng()+.5;
                    let cx = (rx + nextRx) * r/3;
                    let cy = (ry + nextRy) * r/3;
                    let cz = (ringZ * 2 + tip) * r/3;
                    // let normal: Vector3;
                    // centerPoints.push(
                    //     cx, cy, cz, r, 
                    //     cx, cy, cz, r, 
                    //     cx, cy, cz, r, 
                    // );

                    if( tip > 0 ) {
                        addPoint(rx, ry, ringZ, spikiness, cx, cy, cz);
                        addPoint(nextRx, nextRy, ringZ, nextSpikiness, cx, cy, cz);

                        // positions.push(
                        //     rx, ry, ringZ, spikiness,
                        //     nextRx, nextRy, ringZ, nextSpikiness,
                        //     0, 0, tip, tipSpikiness
                        // );    
                    } else {
                        addPoint(nextRx, nextRy, ringZ, nextSpikiness, cx, cy, cz);
                        addPoint(rx, ry, ringZ, spikiness, cx, cy, cz);
                        // normal = vector3GetNormal(nextRx, nextRy,  ringZ - tip, rx, ry, ringZ - tip);
                        // positions.push(
                        //     nextRx, nextRy, ringZ, nextSpikiness,
                        //     rx, ry, ringZ, spikiness, 
                        //     0, 0, tip, tipSpikiness
                        // );    
                    }
                    addPoint(0, 0, tip, tipSpikiness, cx, cy, cz);
                    // normal.push(r);
                    // normals.push.apply(normals, normal);
                    // normals.push.apply(normals, normal);
                    // normals.push.apply(normals, normal);

                    if( pointyTip ) {
                        if( equalRingOffset ) {
                            barrycentricCoordinates.push(
                                1, 0, 0, tip > 0 ? cycleOffset: nextCycleOffset, 
                                0, 1, 0, tip > 0 ? nextCycleOffset: cycleOffset, 
                                0, 0, 1, ring * cycleBase, 
                            );    
                        } else {
                            barrycentricCoordinates.push(
                                0, 1, 1, tip > 0 ? cycleOffset: nextCycleOffset, 
                                1, 1, 0, tip > 0 ? nextCycleOffset: cycleOffset, 
                                0, 1, 0, ring * cycleBase, 
                            );    
                        }    
                    } else {
                        barrycentricCoordinates.push(
                            0, 1, 0, tip > 0 ? cycleOffset: nextCycleOffset, 
                            0, 1, 0, tip > 0 ? nextCycleOffset: cycleOffset, 
                            1, 0, 1, 0, 
                        );    
                    }

                }
            }
            ringOffset=nextRingOffset;
        }
        
        let barrycentricCoordinatesBuffer = webglCreateArrayBuffer(gl, barrycentricCoordinates);
        let positionBuffer = webglCreateArrayBuffer(gl, positions);
        let offsetBuffer = webglCreateArrayBuffer(gl, offsets);
        let indicesBuffer = webglCreateElementArrayBuffer(gl, indices);

        if( FLAG_CHECK_FOR_BAD_BUFFERS && offsets.length != positions.length ) {
            throw 'not equal';
        }
        
        let behaviours: MonsterBehaviour[] = [];
        let deathBehaviours: MonsterDeathBehaviour[] = [];
        
        
        let lateralMovementFlags: number = MONSTER_BEHAVIOUR_FLAG_LATERAL_MOVEMENT;

        // accelerate toward target
        if( !acceleration ) {
            //acceleration = rng() * .00003 + .000002;
            acceleration = rng() * 3e-5 + 2e-6;
        }
        
        let lateralMover = function(targetX: number, targetY: number, maxSpeed: number, diff: number, urgency?: number) {
            let dx = targetX - monster.x;
            let dy = targetY - monster.y;
            if( dx || dy ) {
                let acc = diff * urgency?urgency*acceleration:acceleration;

                let angle = Math.atan2(dy, dx);
                let sin = Math.sin(angle);
                let cos = Math.cos(angle);

                let nangle = -angle;
                let nsin = Math.sin(nangle);
                let ncos = Math.cos(nangle);

                // rotate existing velocity to match direction
                let rvx = monster.vx * ncos - monster.vy * nsin;
                let rvy = monster.vy * ncos + monster.vx * nsin;

                if( rvx > maxSpeed ) {
                    // attempt to turn into the thing
                    if( rvy > 0 ) {
                        rvy -= acc;
                    } else {
                        rvy += acc;
                    }    
                } else {
                    // fly at it
                    rvx += acc;
                }
                monster.vx = rvx * cos - rvy * sin;
                monster.vy = rvy * cos + rvx * sin;
            }
        }
        // else car-like movement (turns for angle)

        // seek player
        let seekCount = shift(2);
        while( seekCount-- ) {
            //let speed = rng() * .005 + .0003 * (Math.random() + 1); //(shift(4)+1-Math.random()*.1)/2999
            let speed = rng() * 5e-3 + 3e-4 * (Math.random() + 1); 
            let radius = rng(9) + CONST_MAX_BUILDING_ACTIVATION_DISTANCE;
            behaviours.push(
                function(world: World, diff: number, takenFlags: number) {
                    if( !(takenFlags & lateralMovementFlags) ) {
                        let enemy = world.getNearestEnemy(monster, radius + world.previousAggro);
                        if( enemy ) {
                            lateralMover(enemy.x, enemy.y, speed, diff);
                            return lateralMovementFlags;

                        }
                    }
                }
            )            
        }
        // dodge bullets
        if( shift(1) ) {
            let speed = rng() * .009 + .001;//(shift(4)+1-Math.random()*.1)/1999;
            let radius = rng(4)+3;
            let radiusSquared = radius * radius;
            behaviours.push(
                function(world: World, diff: number, takenFlags: number) {
                    if( !(takenFlags & lateralMovementFlags) ) {
                        let enemy = world.getNearest(monster.x, monster.y, SIDE_NEUTRAL, radius);
                        if( enemy ) {
                            let dx = enemy.x - monster.x;
                            let dy = enemy.y - monster.y;
                            let dsq = dx * dx + dy * dy;
                            if( dsq < radiusSquared ) {
                                lateralMover(enemy.x, enemy.y, speed, diff, -(radiusSquared - dsq)/radiusSquared - 1);
                                return lateralMovementFlags;    
                            }
                        }
                    }
                }
            );     
        }
        // follow sibling
        if( shift(1) ) {

        }

        // move aimlessly
        if( shift(1) ) {
            //let speed = rng() * .005 + .0003;//(shift(4)+1-Math.random()*.1)/2999;
            let speed = rng() * 5e-3 + 3e-4;
            behaviours.push(function(world: World, diff: number, takenFlags: number) {
                if( !(takenFlags & MONSTER_BEHAVIOUR_FLAG_LATERAL_MOVEMENT ) ) {
                    if( Math.abs(monster.vx)<CONST_SMALL_NUMBER && Math.abs(monster.vy)<CONST_SMALL_NUMBER ) {
                        let a = rng() * CONST_DIRTY_PI_2;
                        monster.vx = Math.cos(a) * speed;
                        monster.vy = Math.sin(a) * speed;
                    }
                    lateralMover(monster.x + monster.vx * 999, monster.y + monster.vy * 999, speed, diff);
                    return lateralMovementFlags;
                }
            });
        }
        // jump
        if( !shift(2) ) {
            let impulse = rng() * .01 + .007;
            behaviours.push(function(world: World, diff: number, takenFlags: number) {
                if( !(takenFlags & MONSTER_BEHAVIOUR_FLAG_VERTICAL_MOVEMENT) ) {
                    // have we hit a floor?
                    for( let entity of recentCollisions ) {
                        if( !entity.entityType ) {
                            let surface = entity as Surface;
                            if( surface.normal[2] > CONST_SMALL_NUMBER ) {
                                monster.vz = impulse * surface.normal[2];
                                return MONSTER_BEHAVIOUR_FLAG_VERTICAL_MOVEMENT
                            }
                        }
                    }
                }
            })
        }
        
        if( behaviours.length ) {
            let i = behaviours.length;
            while( i-- ) {
                let behaviour = behaviours.splice(rng(behaviours.length), 1)[0];
                behaviours.push(behaviour);
            }    

            // die
            if( shift(4) == 1 ) {
                // push to front, will always (probably) be a dependant behavior
                behaviours.unshift(function(world: World) {
                    monster.die(world, monster);
                });
            }

            // be lazy 
            if( shift(2) == 1 ) {
                // push to front, will always (probably) be a dependant behavior
                let deceleration = rng()*.6 + .1;//(shift(2)+1)/5;
                behaviours.unshift(function(world: World, diff: number, takenFlags: number) {
                    if( !(takenFlags & MONSTER_BEHAVIOUR_FLAG_LATERAL_MOVEMENT ) ) {
                        // slow down to 0
                        let fraction = Math.pow(deceleration, diff/999);
                        monster.vx *= fraction;
                        monster.vy *= fraction;
                        // do not rotate on the X or Z axis while sleeping
                        return lateralMovementFlags;
                    }
                });
            }

            // if the world is not aggro'd
            if( shift(1) ) {
                let oldBehaviour = behaviours.splice(0, 1)[0];
                behaviours.push(function(world: World, diff: number, takenFlags: number) {
                    if( !world.previousAggro ) {
                        return oldBehaviour(world, diff, takenFlags);
                    }
                })
            }
            

            // do a previous behavior for a period of time
            if( shift(1) ) {
                let oldBehaviour = behaviours.splice(0, 1)[0];
                let repeat = rng(2);
                let interval = rng(4e3) + 999;//(shift(2)+3)*999;
                behaviours.push(function(world: World, diff: number, takenFlags: number) {
                    let step = (monster.age/interval) | 0;
                    
                    if( step%2 && repeat || step ) {
                        return oldBehaviour(world, diff, takenFlags);
                    }
                })
            }
            
            
            // change behavior when close to player
            if( shift(1) ) {
                let proximity = rng(9)+3;//(shift(2)+1)*9;
                let psq = proximity * proximity;
                let oldBehaviour = behaviours.splice(0, 1)[0];
                behaviours.push(function(world: World, diff: number, takenFlags: number) {
                    let enemy = world.getNearestEnemy(monster, proximity);
                    if( enemy ) {
                        return oldBehaviour(world, diff, takenFlags);
                    }
                });
                
            }
            // do only if the player is below or equal z 
            if( shift(1) ) {
                let oldBehaviour = behaviours.splice(0, 1)[0];
                let above = shift(1);
                let radius = rng(9)+3;
                behaviours.push(function(world: World, diff: number, takenFlags: number) {
                    let enemy = world.getNearestEnemy(monster, radius); 
                    if( enemy ) {
                        let enemyz = enemy.z - enemy.radius;
                        let monsterz = monster.z - monster.radius;
                        if( monsterz >= enemyz - 1 && above || monsterz <= enemyz + 1 && !above ) {
                            return oldBehaviour(world, diff, takenFlags);
                        }
                    }          
                });
    
            }
        }
        // fly toward player height
        if( gravityMultiplier<1 && shift(3) ) {
            //let acceleration = rng() * .000001 + .000001; //(shift(4)+1)/9999;
            let acceleration = rng() * 1e-7 + 1e-7;
            //let accelerationPerSecond = acceleration*999999; // 1000000
            let accelerationPerSecond = acceleration*1e7;
            behaviours.unshift(function(world: World, diff: number, takenFlags: number) {
                if( !(takenFlags & MONSTER_BEHAVIOUR_FLAG_VERTICAL_MOVEMENT ) ) {
                    let target = world.getNearestEnemy(monster, 9);
                    if( target ) {
                        let dz = target.z - monster.z;
                        if( dz ) {
                            let timeToHere = monster.vz/accelerationPerSecond;
                            let distanceToHere = accelerationPerSecond*timeToHere*timeToHere/2;
                            let totalDistance = Math.abs(dz) + distanceToHere;
                            let pastHalfWay = distanceToHere > totalDistance/2;
                            let acc;
                            if( pastHalfWay && dz > 0 || !pastHalfWay && dz < 0 ) {
                                // decelerate
                                acc = -acceleration;
                            } else {
                                // accelerate
                                acc = acceleration;
                            }
                            monster.vz += acc*diff;
                            return MONSTER_BEHAVIOUR_FLAG_VERTICAL_MOVEMENT;        
                        }                        
                    }
                }
            });          
        }  
        
        
        // die and spawn something else
        if( shift(3) == 1 && radius >= CONST_BASE_RADIUS ) {
            let quantity = (rng(2)+1) * radius;
            let spawnSeed: number;
            let spawnRadius: number;
            if( quantity & 1 ) {
                spawnSeed = seed;
                spawnRadius = radius * .7;
            } else {
                spawnSeed = seed >>> 6
                spawnRadius = radius;
            }
            quantity |= 1;
            // always do it when we die
            deathBehaviours.push(function(world: World, source: Entity) {
                let q = quantity;
                while( q-- && source ) {
                    let angle = q * CONST_DIRTY_PI_2 / quantity;
                    let child = monsterGenerator(
                        spawnSeed, 
                        monster.x + Math.cos(angle) * spawnRadius, monster.y + Math.sin(angle) * spawnRadius, monster.z, 
                        spawnRadius,
                        maxAge/2
                    );
                    world.addEntity(child);    
                }
            });
        }

        
        if( shift(1) ) {
            // rotate to face direction of travel
            behaviours.push(function(world: World, diff: number, takenFlags: number) {
                if( (monster.vx || monster.vy) &&!(takenFlags&MONSTER_BEHAVIOUR_FLAG_ROTATION_Z) ) {
                    let angle = Math.atan2(monster.vy, monster.vx);
                    monster.rz = angle;
                    return MONSTER_BEHAVIOUR_FLAG_ROTATION_Z;
                }
            });
            // rotate on X axis to match velocity
            if( shift(1) ) {
                behaviours.push(function(world: World, diff: number, takenFlags: number) {
                    if( (monster.vx || monster.vy) &&!(takenFlags&MONSTER_BEHAVIOUR_FLAG_ROTATION_X) ) {
                        let v = Math.sqrt(monster.vx*monster.vx + monster.vy*monster.vy);
                        monster.rx -= diff * v / monster.radius;
                        return MONSTER_BEHAVIOUR_FLAG_ROTATION_X;
                    }
                });
            }
        } else {
            // rotate constantly on Z axis
            let rz = rng()*.01 + .001;//(shift(4)+1)/999;
            behaviours.push(function(world: World, diff: number, takenFlags: number) {
                if(!(takenFlags&MONSTER_BEHAVIOUR_FLAG_ROTATION_Z)) {
                    let v = Math.sqrt(monster.vx*monster.vx + monster.vy*monster.vy);
                    monster.rz += rz * diff * (v+CONST_SMALL_NUMBER);
                    return MONSTER_BEHAVIOUR_FLAG_ROTATION_Z;
                }
            })
        } 

        if( !maxAge ) {
            //maxAge = rng(9999)+9999;
            maxAge = rng(1e4)+1e4;
        }


        let updater = function(this: Monster, world: World, diff: number) {
            //this.rz = this.age / 5000;
            //this.rx = -this.age / 10000;
            //this.y -= this.age / 1000000;
            let flag = 0;
            for( let behaviour of behaviours ) {
                let f = behaviour(world, diff, flag);
                if( f ) {
                    flag |= f;
                }
            }
            if( !FLAG_TEST_PHYSICS ) {
                if( pushCount ) {
                    // factor in pushes to make monsters spread out
                    if( pushX || pushY ) {
                        let angle = Math.atan2(pushY, pushX);
                        pushX /= pushCount;
                        pushY /= pushCount;
                        let pushLenSquared = 1 - pushX * pushX - pushY * pushY;
                        monster.vx += Math.cos(angle) * pushLenSquared / CONST_PUSH_DIVISOR;
                        monster.vy += Math.sin(angle) * pushLenSquared / CONST_PUSH_DIVISOR;    
                    }
                    pushCount = 0;
                    pushX = 0;
                    pushY = 0;
                } 
            }
            let dx = monster.x - world.cameraX;
            let dy = monster.y - world.cameraY;
            let dz = monster.z - world.cameraZ;
            let dsq = dx * dx + dy * dy + dz * dz;
            // monsters die faster if they are a long way from the camera and the aggo is high
            if( maxAge > 0 && monster.age > maxAge - (dsq * world.previousAggro)/9 ) {
                monster.die(world);
            }
            recentCollisions = [];
        }

        let recentCollisions: Entity[]  = [];
        let pushX = 0;
        let pushY = 0;
        let pushCount = 0;

        let soundLoop: SoundLoop3D;
        if( radius >= CONST_BASE_RADIUS ) {
            soundLoop = soundLoopFactory(seed, cycleLength, radius * CONST_RADIUS_SOUND_VOLUME_RATIO);
        }        
        let health = (radius * radius * 4) | 0;

		let bounds = function(): Rect3 {
			return {
				minimum: [monster.x - monster.radius, monster.y - monster.radius, monster.z - monster.radius], 
				maximum: [monster.x + monster.radius, monster.y + monster.radius, monster.z + monster.radius]
			}
		};
	
        let monster: Monster ={
            entityType: 1, 
            seed: seed,
            entityId: nextId++,
            radius: radius, 
            lineColor: lineColor, 
            filledColor: fillColor,
            x: x, 
            y: y, 
            z: z, 
            restitution: restitution,
            onUpdate: updater,
            onCollision: function(this: Monster, world: World, entity: Entity) {
                if( entity.entityType  ) {
                    if( !FLAG_TEST_PHYSICS && 
                        (entity.side == SIDE_NEUTRAL && monster.side == SIDE_ENEMY ||
                         entity.side == SIDE_PLAYER && monster.side == SIDE_POWERUPS 
                        )
                    ) {
                        health--;
                        monster.lastDamageAge = world.age;
                        if( health<0 ) {
                            monster.die(world, entity)
                        }
                    } 
                    if( monster.side == entity.side ) {
                        let collisionMonster = entity as Monster;
                        let dx = monster.x - collisionMonster.x;
                        let dy = monster.y - collisionMonster.y;
                        let d = collisionMonster.radius + monster.radius;
                        pushX += dx/d;
                        pushY += dy/d;
                        pushCount++;    
                    }
                } 
                recentCollisions.push(entity);
            },
            cleanup: function(this: Monster) {
                if( FLAG_CLEAN_UP_ENTITY ) {
                    gl.deleteBuffer(indicesBuffer);
                    gl.deleteBuffer(positionBuffer);
                    gl.deleteBuffer(offsetBuffer);
                    gl.deleteBuffer(barrycentricCoordinatesBuffer);
                }
                if( monster.sound ) {
                    monster.sound.stopLooping();
                }
            },
            die: function(this: Monster, world: World, deathSource: Entity) {
                if( !monster.deathAge ) {
                    monster.deathAge = monster.age;
                    for( let deathBehaviour of deathBehaviours ) {
                        deathBehaviour(world, deathSource);
                    }
                    if( onDie ) {
                        onDie(world);
                    }
                    if( deathSource && deathSource != monster && monster.side == SIDE_ENEMY ) {
                        // spawn some gems
                        let r = radius;
                        let max = rngFactory(monster.age)();

                        dieSound(monster.x, monster.y, monster.z);
                        
                        while( r > max ) {
                            let a = r*CONST_DIRTY_PI_2/radius;
                            let cos = Math.cos(a);
                            let sin = Math.sin(a);
                            let weapon = radius > CONST_BASE_RADIUS && r == radius;
                            let gem = monsterGenerator(
                                weapon?seed:CONST_BATTERY_SEED, 
                                monster.x + cos*CONST_SMALL_NUMBER, monster.y + sin*CONST_SMALL_NUMBER, monster.z, 
                                weapon?.2:.05, 
                                5e4, //5000
                                null, 
                                .001
                            );
                            gem.vx = cos * CONST_GEM_VELOCITY;
                            gem.vy = sin * CONST_GEM_VELOCITY;

                            gem.side = SIDE_POWERUPS;
                            gem.lineColor = CONST_FRIENDLY_BRIGHT_LINE_COLOR;
                            gem.filledColor = CONST_FRIENDLY_BRIGHT_FILL_COLOR;
                            world.addEntity(gem);
                            r--;
                        }
                    }
                }
            },
            side: SIDE_ENEMY,
            age: 0, 
            rx: 0, 
            ry: ry, 
            rz: 0, 
            vx: 0, 
            vy: 0, 
            vz: 0, 
            visible: 1, 
            gridCoordinateBuffer: barrycentricCoordinatesBuffer, 
            indicesBuffer: indicesBuffer, 
            indicesCount: indices.length, 
            positionBuffer: positionBuffer, 
            gravityMultiplier: gravityMultiplier,
            offsetBuffer: offsetBuffer,
            bounds: bounds, 
            cycleLength: cycleLength, 
            sound: soundLoop
        }
        return monster;
    }
    return monsterGenerator;
}