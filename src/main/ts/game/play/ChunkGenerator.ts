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
    
    let lineScale = 4;
    let x = chunkWidth/lineScale;
    let y = chunkHeight*2/lineScale;
    let aspectRatio = x/y;
    let gridCoordinates = [
        0, 0, aspectRatio, 0,  
        x, 0, aspectRatio, 0, 
        x, y, aspectRatio, 0, 
        0, y, aspectRatio, 0
    ];
    let gridCoordinateBuffer = webglCreateArrayBuffer(gl, gridCoordinates);

    let floorIndices = [
        // triangle 1
        0, 1, 2,
        // triangle 2
        0, 2, 3
    ];
    let floorIndicesBuffer = webglCreateElementArrayBuffer(gl, floorIndices);

    return function(tileY: number, tileX: number): Entity[] {

        let x = tileX * (chunkWidth+1);
        let y = tileY * (chunkHeight);
        let z = tileX/2;
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
            lineWidth: 0.02/lineScale,
            //fillColor: [Math.random(), Math.random(), Math.random()], 
            fillColor: [0.64, 0.4, 0.6], 
            positionBuffer: floorPositionBuffer, 
            gridCoordinateBuffer: gridCoordinateBuffer,
            indicesBuffer: floorIndicesBuffer,
            indicesCount: floorIndices.length,
            worldToPoints: matrix4Translate(-x, -y, -z), 
            pointsToWorld: matrix4Translate(x, y, z),
            worldToPointsRotation: matrix4Identity(), 
            pointsToWorldRotation: matrix4Identity(),
            cleanup: function() {
                // do nothing
            },
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