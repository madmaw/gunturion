
interface EntityBase {
    x: number;
    y: number;
    z: number;
    bounds(): Rect3;
    lineColor: Vector3;
    fillColor: Vector3;
    lineWidth: number;
    positionBuffer: WebGLBuffer;
    indicesBuffer: WebGLBuffer;
    indicesCount: number;
}

interface Monster extends EntityBase {
    isMonster: 1;
    radius: number;
    vx: number;
    vy: number;
    vz: number;
    rx: number;
    ry: number; 
    rz: number;
    age: number;
    positions: number[];
    indices: number[];
    barycentricCoordinatesBuffer: WebGLBuffer;
    update(world: World, diff: number): void;
    visible: number;
    

}

interface Surface extends EntityBase {
    isMonster: 0; 
    normal: Vector3;
    gridNormal: Vector3;
    points: Vector2[];
}

type Entity = Monster | Surface;

interface MonsterGenerator {
    (
        seed: number,
        x: number, 
        y: number, 
        z: number
    ): Monster;
}

function monsterGeneratorFactory(gl: WebGLRenderingContext): MonsterGenerator {

    let fillColors = [
        [1, .5, .5], 
        [.5, 1, .5], 
        [.5, .5, 1], 
        [1, 0, 1], 
        [0, 1, 1], 
        [1, 0, 1], 
        [.5, 1, 1], 
        [.5, .7, .9]
    ]

    let lineColors = [
        [1, .8, .8], 
        [.8, 1, .8], 
        [.8, .8, 1], 
        [1, .5, 1], 
        [.5, 1, 1], 
        [1, 1, 1], 
        [1, 1, 1], 
        [1, 1, 1]
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
        z: number
    ): Monster {

        let s = [seed];
        let rings = fib(shift(3, s)); 
        let minPointCount = fib(shift(2, s)+1) + 1;
        let pointExponentIncrease = shift(2, s)/3;
        // TODO we don't have code for the other way 
        pointExponentIncrease = 0;
        let equalRingOffset = shift(1, s);
        //equalRingOffset = 1;
        let allowPointyTip = shift(1, s);
        

        let radius = 1;
        let lineColor = lineColors[shift(3, s)];
        let lineWidth = 1;
        let fillColor = fillColors[shift(3, s)];
        let updater = function(this: Monster, world: World, diff: number) {
            this.age += diff;
            this.rz = this.age / 1000;
            this.rx = -this.age / 10000;
            //this.y -= this.age / 1000000;
        }

        // generate
        let positions: number[] = [];
        let indices: number[] = [];
        let barrycentricCoordinates: number[] = [];

        let ringPointCounts: number[] = [];
        let ringAngles: number[] = [];
        let ringDiv: number;
        let angleYOffset: number;
        let tipZ: number;
        let pointyTip = (rings % 2 && minPointCount > 3 || !equalRingOffset) && allowPointyTip || rings == 1;
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
            let ringRadius = Math.sin(ringAngleY) * radius/Math.cos(Math.PI/ringPointCount);
            let ringZ = Math.cos(ringAngleY) * radius;
            for( let point = 0; point < ringPointCount; point ++ ) {
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
                    let nextRingRadius = Math.sin(nextRingAngleY) * radius/Math.cos(Math.PI/nextRingPointCount);
                    let nextRingZ = Math.cos(nextRingAngleY) * radius;
                    if( ringPointCount == nextRingPointCount ) {
                        let nextRingAngleZ = nextRingOffset * Math.PI / nextRingPointCount + point * Math.PI*2/nextRingPointCount;
                        let nextRingNextAngleZ = nextRingAngleZ + Math.PI*2 / nextRingPointCount;
                        let nextRingRx = Math.cos(nextRingAngleZ)*nextRingRadius;
                        let nextRingRy = Math.sin(nextRingAngleZ) * nextRingRadius;
                        let nextRingNextRx = Math.cos(nextRingNextAngleZ)*nextRingRadius;
                        let nextRingNextRy = Math.sin(nextRingNextAngleZ) * nextRingRadius;
                        indices.push(
                            // face 1
                            l++, l++, l++,
                            // face 2
                            l++, l++, l++

                        );
                        positions.push(
                            // face 1
                            nextRx, nextRy, ringZ, 
                            rx, ry, ringZ, 
                            nextRingRx, nextRingRy, nextRingZ,
                            // face 2
                            nextRx, nextRy, ringZ,
                            nextRingRx, nextRingRy, nextRingZ,
                            nextRingNextRx, nextRingNextRy, nextRingZ,
                        );
                        if( equalRingOffset ) {
                            barrycentricCoordinates.push(
                                // face 1
                                1, 0, 0, 
                                0, 1, 0, 
                                0, 0, 1, 
                                // face 2
                                1, 0, 0, 
                                0, 1, 0, 
                                0, 0, 1
                            );    
                        } else {
                            // remove the center line
                            barrycentricCoordinates.push(
                                // face 1
                                0, 1, 1, 
                                1, 1, 0, 
                                1, 1, 0, 
                                // face 2
                                1, 1, 0, 
                                0, 1, 1, 
                                1, 1, 0
                            );    
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
                while( tips.length ) {
                    let tip = tips.splice(0, 1)[0];
                    indices.push( 
                        l++, l++, l++
                    );
                    if( tip > 0 ) {
                        positions.push(
                            rx, ry, ringZ, 
                            nextRx, nextRy, ringZ, 
                            0, 0, tip
                        );    
                    } else {
                        positions.push(
                            nextRx, nextRy, ringZ, 
                            rx, ry, ringZ, 
                            0, 0, tip
                        );    
                    }
                    if( pointyTip ) {
                        if( equalRingOffset ) {
                            barrycentricCoordinates.push(
                                1, 0, 0, 
                                0, 1, 0,  
                                0, 0, 1, 
                            );    
                        } else {
                            barrycentricCoordinates.push(
                                0, 1, 1, 
                                1, 1, 0, 
                                0, 1, 0, 
                            );    
                        }    
                    } else {
                        barrycentricCoordinates.push(
                            0, 1, 0, 
                            0, 1, 0, 
                            1, 0, 1, 
                        );    
                    }

                }
            }
            ringOffset=nextRingOffset;
        }
        
        if( barrycentricCoordinates.length != positions.length ) {
            throw "somehow screwed up";
        }

        let barrycentricCoordinatesBuffer = webglCreateArrayBuffer(gl, barrycentricCoordinates);
        let positionBuffer = webglCreateArrayBuffer(gl, positions);
        let indicesBuffer = webglCreateElementArrayBuffer(gl, indices);
        
        return {
            isMonster: 1, 
            radius: radius, 
            lineColor: lineColor, 
            lineWidth: lineWidth,
            fillColor: fillColor, 
            x: x, 
            y: y, 
            z: z, 
            update: updater, 
            age: 0, 
            rx: 0, 
            ry: 0, 
            rz: 0, 
            vx: 0, 
            vy: 0, 
            vz: 0, 
            visible: 1, 
            barycentricCoordinatesBuffer: barrycentricCoordinatesBuffer, 
            indices: indices, 
            indicesBuffer: indicesBuffer, 
            indicesCount: indices.length, 
            positionBuffer: positionBuffer, 
            positions: positions, 
            bounds: bounds
        }
    }
}