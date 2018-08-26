interface ChunkGenerator {
    (x: number, y: number): Entity[];
}

function flatChunkGeneratorFactory(
    chunkWidth: number, 
    chunkHeight: number,
    surfaceGenerator: SurfaceGenerator,
    monsterGenerator: MonsterGenerator, 
    rngFactory: RandomNumberGeneratorFactory
): ChunkGenerator {

    let floorLineColor = [.7, 0, .7];
    let floorFillColor = [.64, .4, .6];
    let wallLineColor = [0, .7, .7];
    let wallFillColor = [.4, .64, .6];
    let badLineColor = [.9, .1, .1];
    let badFillColor = [.7, .4, .4];
    let wallDepth = 5;

    function getFloorHeight(tileX: number, tileY: number) {
        // a lot of tiles aren't actually random
        let floorHeight: number;
        if( tileX < 0 ) {
            floorHeight = 0;
        } else {
            let xOffset = Math.floor((tileX + 3) / 4) * 3;
            floorHeight = Math.floor((tileX + Math.abs(numberPositiveMod(tileY + xOffset, 6) - 2)) / 4);
        }
        return floorHeight * wallDepth;
    }

    return function(tileX: number, tileY: number): Entity[] {

        let x = tileX * chunkWidth;
        let y = tileY * chunkHeight;


        let z = getFloorHeight(tileX, tileY);
        let eastZ = getFloorHeight(tileX + 1, tileY);
        let westZ = getFloorHeight(tileX - 1, tileY);
        let northZ = getFloorHeight(tileX, tileY + 1);
        let southZ = getFloorHeight(tileX, tileY - 1);

        let rng = rngFactory(tileX | tileY * 37);
        let monsterId = rng(9999999);
        let r = 1;
        let monster = monsterGenerator(
            monsterId, 
            x + r + rng(chunkWidth - r*2), y + r + rng(chunkHeight - r*2), z + r * 2, 
            r
        );        
        let floor: Surface;
        let stairs = eastZ > z && northZ > z && southZ > z;
        if( stairs ) {
            let dz = eastZ - z;
            let width = Math.sqrt(chunkWidth * chunkWidth + dz * dz);
            let angle = Math.atan2(dz, chunkWidth); 
            floor = surfaceGenerator(
                x, y, z, 
                width, chunkHeight, 
                tileX, tileY, 
                0, angle, 
                floorLineColor, 
                floorFillColor
            );    
        } else {
            floor = surfaceGenerator(
                x, y, z, 
                chunkWidth, chunkHeight, 
                tileX, tileY, 
                0, 0, 
                floorLineColor, 
                floorFillColor
            );    
        }

        let surfaces = [floor];
        if( eastZ > z && !stairs ) {
            let wall = surfaceGenerator(
                x + chunkWidth, y, z, 
                eastZ - z, chunkHeight, 
                tileX, tileY, 
                0, Math.PI/2,  
                wallLineColor, 
                wallFillColor
            );
            surfaces.push(wall);
        }
        if( northZ > z ) {
            let wall = surfaceGenerator(
                x, y + chunkHeight, z, 
                chunkWidth, northZ - z, 
                tileX, tileY, 
                Math.PI/2, 0,  
                wallLineColor, 
                wallFillColor
            );
            surfaces.push(wall);
        }
        if( southZ > z ) {
            let wallDepth = southZ - z;
            let wall = surfaceGenerator(
                x, y, z + wallDepth, 
                chunkWidth, wallDepth, 
                tileX, tileY, 
                -Math.PI/2, 0,
                wallLineColor, 
                wallFillColor
            );
            surfaces.push(wall);
        }
        let building = z > 0 && !stairs && rng() < .2;
        let i = 9;
        while( building && i ) {
            i--;
            let dx = i % 3 - 1;
            let dy = Math.floor(i / 3) - 1;
            let tz = getFloorHeight(tileX + dx, tileY + dy);
            building = building && tz <= z;
        }
        if( building ) {
            let gap = 2;
            let buildingDepthMax = Math.min(wallDepth + z/wallDepth, 20) | 0;
            let buildingDepth = rng(buildingDepthMax) + wallDepth;
            let minBuildingDimension = Math.min(chunkWidth, chunkHeight)>>1;
            let maxBuildingDimension = Math.min(chunkWidth, chunkHeight) - gap*2;
            let buildingDimension = rng(maxBuildingDimension - minBuildingDimension) + minBuildingDimension;
            let buildingWidth = buildingDimension;
            let buildingHeight = buildingDimension;
            let buildingZ = z;
            let buildingSegments = rng(buildingDepth/wallDepth) + 1;
            let buildingShift = rng(4)+1;
            while( buildingSegments-- && buildingWidth > 1 && buildingHeight > 1 ) {

                let buildingX = x + ((chunkWidth - buildingWidth)>>1);
                let buildingY = y + ((chunkHeight - buildingHeight)>>1);

                let buildingWallWest = surfaceGenerator( 
                    buildingX, buildingY, buildingZ, 
                    buildingWidth, buildingDepth, 
                    tileX, tileY, 
                    Math.PI/2, 0, 
                    badLineColor, 
                    badFillColor                
                );
                let buildingWallEast = surfaceGenerator( 
                    buildingX, buildingY + buildingHeight, buildingZ + buildingDepth, 
                    buildingWidth, buildingDepth, 
                    tileX, tileY, 
                    -Math.PI/2, 0, 
                    badLineColor, 
                    badFillColor                
                );
                let buildingWallSouth = surfaceGenerator(
                    buildingX, buildingY, buildingZ, 
                    buildingDepth, buildingHeight, 
                    tileX, tileY, 
                    0, Math.PI/2, 
                    badLineColor, 
                    badFillColor
                );
                let buildingWallNorth = surfaceGenerator(
                    buildingX + buildingWidth, buildingY, buildingZ + buildingDepth, 
                    buildingDepth, buildingHeight, 
                    tileX, tileY, 
                    0, -Math.PI/2, 
                    badLineColor, 
                    badFillColor
                );
                let buildingRoof = surfaceGenerator(
                    buildingX, buildingY, buildingZ + buildingDepth, 
                    buildingWidth, buildingHeight, 
                    tileX, tileY, 
                    0, 0, 
                    badLineColor, 
                    badFillColor
                );
    
                surfaces.push(buildingWallEast, buildingWallWest, buildingWallSouth, buildingWallNorth, buildingRoof);
    
                buildingZ += buildingDepth;
                buildingDepth >>= buildingShift;
                if( !buildingDepth ) {
                    buildingDepth = 1;
                    buildingWidth-=4;
                    buildingHeight-=4;    
                } else {
                    buildingWidth-=2;
                    buildingHeight-=2;    
                }
            }
        }
        return surfaces;
    }
}