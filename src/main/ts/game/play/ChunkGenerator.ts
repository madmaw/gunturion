interface ChunkGenerator {
    (x: number, y: number): Entity[];
}

function flatChunkGeneratorFactory(
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

    function getFloorHeight(tileX: number, tileY: number) {
        // a lot of tiles aren't actually random
        let floorHeight: number;
        if( tileX < 0 ) {
            floorHeight = 0;
        } else {
            let xOffset = Math.floor((tileX + 3) / 4) * 3;
            floorHeight = Math.floor((tileX + Math.abs(numberPositiveMod(tileY + xOffset, 6) - 2)) / 4); 
        }
        return floorHeight * CONST_WALL_DEPTH;
    }

    return function(tileX: number, tileY: number): Entity[] {

        let x = tileX * CONST_CHUNK_WIDTH;
        let y = tileY * CONST_CHUNK_HEIGHT; 


        let z = getFloorHeight(tileX, tileY);
        let eastZ = getFloorHeight(tileX + 1, tileY);
        let westZ = getFloorHeight(tileX - 1, tileY);
        let northZ = getFloorHeight(tileX, tileY + 1);
        let southZ = getFloorHeight(tileX, tileY - 1);

        let rng = rngFactory(tileX*111 + tileY * 37);
        let floor: Surface;
        let stairs = eastZ > z && northZ > z && southZ > z;
        
        let directedLightingRange: Vector4;
        if( stairs ) {
            let dz = eastZ - z;
            let width = Math.sqrt(CONST_CHUNK_WIDTH * CONST_CHUNK_WIDTH + dz * dz);
            let angle = Math.atan2(dz, CONST_CHUNK_WIDTH); 
            directedLightingRange = [x, dz/CONST_CHUNK_WIDTH, z + CONST_DIRECTIONAL_LIGHT_EXTRA_Z, CONST_DIRECTIONAL_LIGHT_FADE_OUT];
            floor = surfaceGenerator(
                x, y, z, 
                width, CONST_CHUNK_HEIGHT, 
                tileX, tileY, 
                0, angle, 
                floorLineColor, 
                floorFillColor, 
                directedLightingRange
            );    
        } else {
            directedLightingRange = [x, 0, z + CONST_DIRECTIONAL_LIGHT_EXTRA_Z, CONST_DIRECTIONAL_LIGHT_FADE_OUT];
            floor = surfaceGenerator(
                x, y, z, 
                CONST_CHUNK_WIDTH, CONST_CHUNK_HEIGHT, 
                tileX, tileY, 
                0, 0, 
                floorLineColor, 
                floorFillColor, 
                directedLightingRange
            );    
        }

        let entities: Entity[] = [floor];
        if( eastZ > z && !stairs ) {
            let wall = surfaceGenerator(
                x + CONST_CHUNK_WIDTH, y, z, 
                eastZ - z, CONST_CHUNK_HEIGHT, 
                tileX, tileY, 
                0, Math.PI/2,  
                wallLineColor, 
                wallFillColor, 
                directedLightingRange
            );
            entities.push(wall);
        }
        if( northZ > z ) {
            let wall = surfaceGenerator(
                x, y + CONST_CHUNK_HEIGHT, z, 
                CONST_CHUNK_WIDTH, northZ - z, 
                tileX, tileY, 
                Math.PI/2, 0,  
                wallLineColor, 
                wallFillColor, 
                directedLightingRange
            );
            entities.push(wall);
        }
        if( southZ > z ) {
            let wallDepth = southZ - z;
            let wall = surfaceGenerator(
                x, y, z + wallDepth, 
                CONST_CHUNK_WIDTH, wallDepth, 
                tileX, tileY, 
                -Math.PI/2, 0,
                wallLineColor, 
                wallFillColor, 
                directedLightingRange
            );
            entities.push(wall);
        }
        let building = z > 0 && !stairs && rng() < .2;
        // let i = 9;
        // while( building && i ) {
        //     i--;
        //     let dx = i % 3 - 1;
        //     let dy = Math.floor(i / 3) - 1;
        //     let tz = getFloorHeight(tileX + dx, tileY + dy);
        //     building = building && tz <= z;
        // }
        
        if( building ) {
            let gap = 1;
            let buildingDepthMax = Math.min(CONST_MIN_BUILDING_DEPTH + z/CONST_MIN_BUILDING_DEPTH, CONST_MAX_BUILDING_DEPTH) | 0;
            let buildingDepth = rng(buildingDepthMax) + CONST_MIN_BUILDING_DEPTH;
            let minBuildingDimension = CONST_CHUNK_DIMENSION_MIN>>1;
            let maxBuildingDimension = CONST_CHUNK_DIMENSION_MIN - gap*2;
            let buildingDimension = rng(maxBuildingDimension - minBuildingDimension) + minBuildingDimension;
            let buildingWidth = buildingDimension;
            let buildingHeight = buildingDimension;
            let buildingZ = z;
            let buildingSegments = rng(buildingDepth/CONST_MIN_BUILDING_DEPTH) + 1;
            let buildingShift = rng(4)+1;
            let walls: Surface[] = [];
            let maxSpawnCount = 0;
            while( buildingSegments-- && buildingWidth > 1 && buildingHeight > 1 ) {

                let buildingX = x + ((CONST_CHUNK_WIDTH - buildingWidth)>>1);
                let buildingY = y + ((CONST_CHUNK_HEIGHT - buildingHeight)>>1);

                maxSpawnCount += buildingWidth * buildingHeight;

                let buildingWallWest = surfaceGenerator( 
                    buildingX, buildingY, buildingZ, 
                    buildingWidth, buildingDepth, 
                    tileX, tileY, 
                    Math.PI/2, 0, 
                    badLineColor, 
                    badFillColor, 
                    directedLightingRange

                );
                let buildingWallEast = surfaceGenerator( 
                    buildingX, buildingY + buildingHeight, buildingZ + buildingDepth, 
                    buildingWidth, buildingDepth, 
                    tileX, tileY, 
                    -Math.PI/2, 0, 
                    badLineColor, 
                    badFillColor,       
                    directedLightingRange
                );
                let buildingWallSouth = surfaceGenerator(
                    buildingX, buildingY, buildingZ, 
                    buildingDepth, buildingHeight, 
                    tileX, tileY, 
                    0, Math.PI/2, 
                    badLineColor, 
                    badFillColor, 
                    directedLightingRange
                );
                let buildingWallNorth = surfaceGenerator(
                    buildingX + buildingWidth, buildingY, buildingZ + buildingDepth, 
                    buildingDepth, buildingHeight, 
                    tileX, tileY, 
                    0, -Math.PI/2, 
                    badLineColor, 
                    badFillColor, 
                    directedLightingRange
                );
                let buildingRoof = surfaceGenerator(
                    buildingX, buildingY, buildingZ + buildingDepth, 
                    buildingWidth, buildingHeight, 
                    tileX, tileY, 
                    0, 0, 
                    badLineColor, 
                    badFillColor, 
                    directedLightingRange
                );
                
                walls.push(buildingWallEast, buildingWallWest, buildingWallSouth, buildingWallNorth, buildingRoof);
    
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
            let spawnJumpFrequency = 100;
            let spawnRestFrequency = 3000;
            let birthFrequency = 100;
            let incubationTime = 1000;
            let spawnCount: number = 0;
            let spawnGridX: number;
            let spawnGridY: number;
            let spawning: boolean;
            let spawnWall: Surface;
            let nextSpawn = spawnRestFrequency;
            let spawnType: number;
            let spawnTypes = [];
            let spawns:{[_:number]:{[_:number]:Monster}} = {};
            let active: boolean;
            let nextBirth: number = birthFrequency;

            let spawnTypeCount = rng(3) + 1;
            while( spawnTypeCount-- ) {
                spawnTypes.push(rng(CONST_BIG_NUMBER));
            }

            function setWallLight(wall: Surface, bit: number, on?: number) {
                let index = 0;
                while( bit >= CONST_GL_SAFE_BITS ) {
                    bit -= CONST_GL_SAFE_BITS;
                    index++;
                }
                let v = wall.gridLighting[index];
                if( on ) {
                    v |= (1 << bit);
                } else {
                    v &= ~(1 << bit)
                }
                wall.gridLighting[index] = v;
            }

            function spawn(now: number, target?: Monster): boolean {
                // find a surface facing the player
                let monsterRadius = CONST_BASE_RADIUS;
                let successfulSpawning: boolean;
                let attemptsRemaining = 3;
                while( !successfulSpawning && attemptsRemaining-- && spawnCount < maxSpawnCount ) {
                    if( spawning ) {
                        spawnGridX += rng(3) - 1;
                        spawnGridY += rng(3) - 1; 
                    } else {
                        spawnType = spawnTypes[rng(spawnTypes.length)];
                        spawnWall = walls[rng(walls.length)];
                        spawnGridX = rng(spawnWall.width);
                        spawnGridY = rng(spawnWall.height);    
                    }
                    successfulSpawning = spawnGridX >= 0 && spawnGridY >= 0 && spawnGridX < spawnWall.width && spawnGridY < spawnWall.height && spawnWall.normal[2] < ERROR_MARGIN;
                    if( successfulSpawning ) {
                        let monsterPosition = vector3TransformMatrix4(spawnGridX + .5, spawnGridY + .5, monsterRadius * 2, spawnWall.pointsToWorld);
                        if( target ) {
                            let targetPosition = [target.x, target.y, target.z];
                            let positionDiff = vector3Subtract(targetPosition, monsterPosition);
                            let distance = vector3Length(positionDiff);
                            let facing = vector3DotProduct(vector3Divide(positionDiff, distance), spawnWall.normal);    
                            successfulSpawning = distance < CONST_CHUNK_DIMENSION_MIN * 3 && facing > 0;    
                        }
                        if( successfulSpawning ) {
                            //world.addEntity(monster);    
                            let bit = spawnGridY * spawnWall.width + spawnGridX;
                            let wallSpawns = spawns[spawnWall.id];
                            if( !wallSpawns ) {
                                wallSpawns = {};
                                spawns[spawnWall.id] = wallSpawns;
                            }
                            successfulSpawning = !wallSpawns[bit];
                            if( successfulSpawning ) {
                                let monster = monsterGenerator(
                                    spawnType, 
                                    monsterPosition[0], monsterPosition[1], monsterPosition[2], 
                                    monsterRadius
                                );
                                monster.vx = spawnWall.normal[0] * .001;
                                monster.vy = spawnWall.normal[1] * .001;
                                monster.birthday = now + incubationTime + rng(incubationTime);
                                wallSpawns[bit] = monster;
                                setWallLight(spawnWall, bit, 1);                            
                                
                                spawnCount++;
                            }
                        }                    
                    }    
                }
                return successfulSpawning;
            }

            // spawn until our spawn count is high enough
            while( spawnCount < maxSpawnCount ) {
                spawn(0);
            }
            
            let building: Building = {
                type: -1, 
                chunkX: tileX, 
                chunkY: tileY, 
                age: 0, 
                cleanup: function() {
                }, 
                power: 0, 
                side: SIDE_BUILDING, 
                update: function(world: World, diff: number) {
                    let players = world.allEntities[SIDE_PLAYER];
                    if( players.length ) {
                        let player = players[0] as Monster;
                        nextSpawn -= diff;
                        if( nextSpawn < 0 ) {
                            let successfulSpawning = spawn(world.age, player);
                            if( successfulSpawning ) {
                                nextSpawn += spawnJumpFrequency;
                            } else {
                                if( spawning ) {
                                    nextSpawn = rng(spawnRestFrequency) + spawnJumpFrequency;
                                }
                            }
                            spawning = successfulSpawning;
                        }

                        // birth 
                        let targetPosition = [player.x, player.y, player.z];
                        let positionDiff = vector3Subtract(
                            targetPosition, 
                            [tileX * CONST_CHUNK_WIDTH + CONST_CHUNK_WIDTH/2, tileY * CONST_CHUNK_HEIGHT + CONST_CHUNK_HEIGHT/2, player.z]
                        );
                        let distance = vector3Length(positionDiff);
                        if( distance < CONST_CHUNK_WIDTH * 4 && world.allEntities[SIDE_ENEMY].length < CONST_MAX_MONSTERS ) {
                            nextBirth -= diff;
                            if( nextBirth < 0 ) {
                                // find a suitable thing
                                let wallIndex = rng(walls.length);
                                let wall = walls[wallIndex];

                                if( vector3DotProduct(vector3Divide(positionDiff, distance), wall.normal) > 0 ) {
                                    let wallSpawns = spawns[wall.id];
                                    for( let tileId in wallSpawns ) {
                                        let entity = wallSpawns[tileId];
                                        if( entity.birthday < world.age ) {
                                            delete wallSpawns[tileId];
                                            world.addEntity(entity);
                                            setWallLight(wall, parseInt(tileId));
                                            nextBirth += birthFrequency;
                                            spawnCount--;                
                                            break;    
                                        }
                                    }
                                } 
                            }        
                        }
                    }
                    

                }
            }
            entities.push.apply(entities, walls);
            entities.push(building);

        } else {
            if( rng() < .1 ) {
                let monsterId = rng(CONST_BIG_NUMBER);
                let r = CONST_BASE_RADIUS;
                let monster = monsterGenerator(
                    monsterId, 
                    //x + r + rng(chunkWidth - r*2), y + r + rng(chunkHeight - r*2), z + r * 2, 
                    x + CONST_CHUNK_WIDTH/2, y + CONST_CHUNK_HEIGHT/2, z + CONST_WALL_DEPTH, 
                    r
                );        
                entities.push(monster);    
            }
        }
        return entities;
    }
}