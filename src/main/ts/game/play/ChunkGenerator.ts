interface ChunkGenerator {
    (x: number, y: number): Entity[];
}

function flatChunkGeneratorFactory(gl: WebGLRenderingContext, chunkWidth: number, chunkHeight: number): ChunkGenerator {

    let surfaceId = -1;

    let floorPositions = [
        0, 0, 0, 0,  
        chunkWidth, 0, 0, 0, 
        chunkWidth, chunkHeight, 0, 0, 
        0, chunkHeight, 0, 0
    ];
    let floorPositionBuffer = webglCreateArrayBuffer(gl, floorPositions);
    let floorIndices = [
        // triangle 1
        0, 1, 2,
        // triangle 2
        0, 2, 3
    ];
    let floorIndicesBuffer = webglCreateElementArrayBuffer(gl, floorIndices);


    return function(tileY: number, tileX: number): Entity[] {

        let x = tileX * (chunkWidth+1);
        let y = tileY * (chunkHeight + 1);
        let z = 0;
        let floor: Surface = {
            isMonster: 0,
            id: surfaceId--,
            normal: [0, 0, 1],
            gridNormal: [0, 0, 1], 
            points: [[0, 0], [chunkWidth, 0], [chunkWidth, chunkHeight], [0, chunkHeight]],
            x: x, 
            y: y, 
            z: z, 
            lineColor: [.7, 0, .7], 
            lineWidth: 0.02,
            //fillColor: [Math.random(), Math.random(), Math.random()], 
            fillColor: [0.64, 0.4, 0.6], 
            positionBuffer: floorPositionBuffer, 
            indicesBuffer: floorIndicesBuffer,
            indicesCount: floorIndices.length,
            worldToPoints: matrix4Translate(-x, -y, -z), 
            pointsToWorld: matrix4Translate(x, y, z),
            worldToPointsRotation: matrix4Identity(), 
            pointsToWorldRotation: matrix4Identity(),
            bounds: function(this: Surface): Rect3 {
                return {
                    min: [this.x, this.y, this.z], 
                    max: [this.x + chunkWidth, this.y + chunkHeight, this.z]
                }
            }
        };
        return [floor];
    }
}