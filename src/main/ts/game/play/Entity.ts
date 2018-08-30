const SURFACE_BUFFER = .1;

const SIDE_SCENERY = 0;
const SIDE_PLAYER = 1;
const SIDE_ENEMY = 2;
const SIDE_NEUTRAL = 3;
const SIDE_BUILDING = 4;

interface EntityBase {
    type: number;
    cleanup(): void;
    side: number;
}

interface Updatable {
    age: number;
    update(world: World, diff: number): any;
}

interface Bounded {
    id: number;
    bounds(): Rect3;
}

interface Rendered {
    lineColor: Vector3;
    fillColor: Vector3;
    lineWidth: number;
    positionBuffer: WebGLBuffer;
    gridCoordinateBuffer: WebGLBuffer;
    indicesBuffer: WebGLBuffer;
    indicesCount: number;
}

interface Monster extends EntityBase, Updatable, Bounded, Rendered {
    type: 1;
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
    specialMatrix?: Matrix4;
    deathAge?: number;
    birthday?: number,
    offsetBuffer: WebGLBuffer;
    onCollision(entity: Entity): any;
    restitution: number;
    visible: number;
    cycleLength: number;
    gravityMultiplier: number;
    previousPosition?: Vector3;
    previousVelocity?: Vector3;
}

interface Surface extends EntityBase, Bounded, Rendered {
    type: 0; 
    normal: Vector3;
    points: Vector2[];
    worldToPoints: Matrix4;
    pointsToWorld: Matrix4;
    chunkX: number;
    chunkY: number;
    worldToPointsRotation: Matrix4;
    pointsToWorldRotation: Matrix4;
    width: number;
    height: number;
    gridLighting: number[];
    directedLightingRange: Vector4;
}

interface Building extends EntityBase, Updatable {
    type: -1;
    chunkX: number;
    chunkY: number;
    power: number;
}

type Entity = Monster | Surface | Building;

interface MonsterGenerator {
    (
        seed: number,
        x: number, 
        y: number, 
        z: number, 
        radius: number
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
        gridColor: Vector3, 
        fillColor: Vector3, 
        directedLightingRange: Vector4
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
        lineColor: Vector3, 
        fillColor: Vector3, 
        directedLightingRange: Vector4
    ) {
        let surfaceId = --nextId;

        let floorPositions = [
            0, 0, 0, 0,  
            width, 0, 0, 0, 
            width, height, 0, 0, 
            0, height, 0, 0
        ];
        let floorPositionBuffer = webglCreateArrayBuffer(gl, floorPositions);
        
        let lineScale = 1;
        let lineX = width/lineScale;
        let lineY = height/lineScale;
        let aspectRatio = 1;
        let gridCoordinates = [
            0, 0, aspectRatio, 0,  
            lineX, 0, aspectRatio, 0, 
            lineX, lineY, aspectRatio, 0, 
            0, lineY, aspectRatio, 0
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
            min: [
                Math.min(x + minRotatedDimensions[0], x + maxRotatedDimensions[0]), 
                Math.min(y + minRotatedDimensions[1], y + maxRotatedDimensions[1]), 
                Math.min(z + minRotatedDimensions[2], z + maxRotatedDimensions[2])
            ], 
            max: [
                Math.max(x + minRotatedDimensions[0], x + maxRotatedDimensions[0]), 
                Math.max(y + minRotatedDimensions[1], y + maxRotatedDimensions[1]), 
                Math.max(z + minRotatedDimensions[2], z + maxRotatedDimensions[2])
            ]
        }
        let gridLighting = [0, 0, 0, 0];

        let surface: Surface = {
            type: 0,
            id: surfaceId--,
            normal: normal,
            points: [[0, 0], [width, 0], [width, height], [0, height]],
            chunkX: chunkX, 
            chunkY: chunkY,
            width: width, 
            height: height,
            lineColor: lineColor, 
            lineWidth: 0.02/lineScale,
            fillColor: fillColor, 
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
            }
        };
        return surface;
    }    
}

function monsterGeneratorFactory(gl: WebGLRenderingContext): MonsterGenerator {

    let nextId = 0;

    let fillColors = [
        [.4, .1, .1], 
        [.2, .5, .2], 
        [.1, .1, .4], 
        [.1, .4, .4]  
    ]

    let lineColors = [
        [1, .2, .2], 
        [.2, 1, .2], 
        [.2, .2, 1], 
        [0, 1, 1]
    ]

    let bounds = function(this: Monster): Rect3 {
        return {
            min: [this.x - this.radius, this.y - this.radius, this.z - this.radius], 
            max: [this.x + this.radius, this.y + this.radius, this.z + this.radius]
        }
    };

    function shift(bits: number, out: number[]): number {
        let mask = Math.pow(2, bits) - 1;
        let b = out[0] & mask;
        out[0] >>= bits;
        return b;
    }   

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

    return function(
        seed: number,
        x: number, 
        y: number, 
        z: number, 
        radius: number
    ): Monster {

        let s = [seed];
        let ringsBase = shift(3, s);
        let rings = fib(ringsBase)%11; // 1, 2, 3, 5, 8, 13(2), 21(10), 34(1)
        let minPointCount = fib(shift(2, s)+1) + Math.max(1, ringsBase-1); // 2, 3, 5, 8 + rings
        let horizontalScale = (shift(1, s)+minPointCount)/(minPointCount+1);
        // TODO we don't have code for the other way 
        let pointExponentIncrease = shift(2, s)/3;
        pointExponentIncrease = 0;
        let equalRingOffset = shift(1, s);
        //equalRingOffset = 1;
        let allowPointyTip = shift(1, s);
        let cycleLength = (shift(5, s)+32) * 66;  
        let maxSpikiness = (shift(2, s))/(14 - rings);
        
        let cycleBase = (shift(4, s)) * Math.PI * 2/minPointCount;

        let patternBits = 2;
        let pattern = shift(patternBits, s);        

        // reset
        s = [seed];

        let colorIndex = shift(2, s);
        let fillColor = fillColors[colorIndex];
        let lineColor = lineColors[colorIndex];
        let lineWidth = 2;

        let rx = shift(1, s) * Math.PI/2;
        let ry = shift(1, s) * Math.PI/2;        

        let updater = function(this: Monster, world: World, diff: number) {
            this.rz = this.age / 5000;
            //this.rx = -this.age / 10000;
            //this.y -= this.age / 1000000;
        }

        // generate
        let positions: number[] = [];
        let indices: number[] = [];
        let barrycentricCoordinates: number[] = [];
        let offsets: number[] = [];
        function addPoint(x: number, y: number, z: number, spikiness: number, cx: number, cy: number, cz: number) {
            let length = vector3Length([x, y, z]);
            offsets.push(cx, cy, cz, spikiness);
            positions.push(x, y, z, length);
        }


        let ringPointCounts: number[] = [];
        let ringAngles: number[] = [];
        let ringDiv: number;
        let angleYOffset: number;
        let tipZ: number;
        let pointyTip = (rings % 2 && minPointCount > 3 
            || !equalRingOffset) && allowPointyTip 
            || rings == 1;
        if( pointyTip ) {
            ringDiv = rings + 1;
            angleYOffset = Math.PI/ringDiv;
            tipZ = radius;
        } else {
            ringDiv = rings;
            angleYOffset = Math.PI/(ringDiv*2);
            tipZ = Math.cos(angleYOffset) * radius;
        }
        let angleY = angleYOffset;
        let pointExponent = 0;
        for( let ring=0; ring<rings; ring++ ) {
            ringAngles.push(angleY);
            ringPointCounts.push(minPointCount * Math.pow(2, pointExponent | 0));
            if( ring < (rings-2)/2 ) {
                pointExponent += pointExponentIncrease;
            } else if (ring > (rings-2)/2) {
                pointExponent -= pointExponentIncrease;
            }
            angleY += Math.PI/ringDiv;
        }
        let ringOffset = 0;
        for( let ring=0; ring<rings; ring++ ) {
            let ringPointCount = ringPointCounts[ring];
            let ringAngleY = ringAngles[ring];
            let nextRingOffset = ringOffset + equalRingOffset;
            let ringRadius = Math.sin(ringAngleY) * radius * horizontalScale/Math.cos(Math.PI/ringPointCount);
            let ringZ = Math.cos(ringAngleY) * radius;
            
            for( let point = 0; point < ringPointCount; point ++ ) {
                let cycleOffset = (point + ring) * cycleBase;
                let nextCycleOffset = ((point+1)%ringPointCount + ring) * cycleBase;
                let ringSpikiness = maxSpikiness*Math.sin(ringAngleY);
                let spikiness = (pattern >> (point)%patternBits)&1?ringSpikiness:0;
                let nextSpikiness = (pattern >> ((point+1)%ringPointCount)%patternBits)&1?ringSpikiness:0;

                let angleZ = ringOffset * Math.PI / ringPointCount + point * Math.PI*2/ringPointCount;  
                let nextAngleZ = angleZ + Math.PI*2/ringPointCount;
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
    
                    let nextRingRadius = Math.sin(nextRingAngleY) * radius * horizontalScale/Math.cos(Math.PI/nextRingPointCount);
                    let nextRingZ = Math.cos(nextRingAngleY) * radius;
                    if( ringPointCount == nextRingPointCount ) {
                        let nextRingAngleZ = nextRingOffset * Math.PI / nextRingPointCount + point * Math.PI*2/nextRingPointCount;
                        let nextRingNextAngleZ = nextRingAngleZ + Math.PI*2 / nextRingPointCount;
                        let nextRingRx = Math.cos(nextRingAngleZ)*nextRingRadius;
                        let nextRingRy = Math.sin(nextRingAngleZ) * nextRingRadius;
                        let nextRingNextRx = Math.cos(nextRingNextAngleZ)*nextRingRadius;
                        let nextRingNextRy = Math.sin(nextRingNextAngleZ) * nextRingRadius;


                        let r1 = Math.random()+.5;
                        let r2 = Math.random()+.5;

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
                    } 

                    angleZ = nextAngleZ;
                }
                // add in the base
                let tips = [];
                if( ring == 0 ) {
                    tips.push(tipZ);
                }
                if( ring == rings - 1 ) {
                    tips.push(-tipZ);
                }
                let tipSpikiness = pointyTip?maxSpikiness:0;
                while( tips.length ) {
                    let tip = tips.splice(0, 1)[0];
                    indices.push( 
                        l++, l++, l++
                    );
                    let r = Math.random()+.5;
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

        if( offsets.length != positions.length ) {
            throw 'not equal';
        }
        
        return {
            type: 1, 
            id: nextId++,
            radius: radius, 
            lineColor: lineColor, 
            lineWidth: lineWidth,
            fillColor: fillColor, 
            x: x, 
            y: y, 
            z: z, 
            restitution: 0.01,
            update: updater,
            onCollision: function(this: Monster, entity: Entity) {
                if( entity.type && entity.side > this.side ) {
                    this.deathAge = this.age;
                }
            },
            cleanup: function(this: Monster) {
                if( FLAG_CLEAN_UP_ENTITY ) {
                    gl.deleteBuffer(indicesBuffer);
                    gl.deleteBuffer(positionBuffer);
                    gl.deleteBuffer(offsetBuffer);
                    gl.deleteBuffer(barrycentricCoordinatesBuffer);
                }
            },
            side: SIDE_ENEMY,
            age: 0, 
            rx: rx, 
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
            gravityMultiplier: 1,
            offsetBuffer: offsetBuffer,
            bounds: bounds, 
            cycleLength: cycleLength
        }
    }
}