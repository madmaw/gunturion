interface ChunkGenerator {
    (x: number, y: number): Entity[];
}

function flatChunkGeneratorFactory(
    surfaceGenerator: SurfaceGenerator,
    monsterGenerator: MonsterGenerator, 
    rngFactory: RandomNumberGeneratorFactory
): ChunkGenerator {

    let floorLineColor = [.4, .4, .2];
    let floorFillColor = [.2, .2, .3];
    let wallLineColor = [.4, .4, .2];
    let wallFillColor = [.2, .2, .2];
    let badLineColor = [.4, .4, .2];
    let badFillColor = [.2, .2, .2];

    function getFloorHeight(chunkX: number, chunkY: number) {
        // a lot of tiles aren't actually random
        chunkX -= 9;
        let floorHeight: number;
        if( chunkX < 0 ) {
            floorHeight = 0;
        } else {
            let xOffset = Math.floor((chunkX + 3) / 4) * 3;
            floorHeight = Math.floor((chunkX + Math.abs(numberPositiveMod(chunkY + xOffset, 6) - 2)) / 4); 
        }
        return floorHeight * CONST_WALL_DEPTH;
    }

    return function(chunkX: number, chunkY: number): Entity[] {

        let x = chunkX * CONST_CHUNK_WIDTH;
        let y = chunkY * CONST_CHUNK_HEIGHT; 

        let monsterSeedPalette: number[] = [];
        let z = getFloorHeight(chunkX, chunkY);
        for( let dx = -1; dx <= 1; dx++ ) {
            for( let dy = -1; dy < 1; dy ++ ) {
                
                let chunkRng = rngFactory((Math.floor(chunkY/9)+dy) * CONST_BIG_NUMBER + Math.floor(chunkX/9)+dx);
                // caculate monster palette for area
                monsterSeedPalette.push(chunkRng(CONST_BIG_NUMBER));
            }
        }

        let eastZ = getFloorHeight(chunkX + 1, chunkY);
        let westZ = getFloorHeight(chunkX - 1, chunkY);
        let northZ = getFloorHeight(chunkX, chunkY + 1);
        let southZ = getFloorHeight(chunkX, chunkY - 1);

        let tileRng = rngFactory(chunkX*111 + chunkY * 37);
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
                chunkX, chunkY, 
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
                chunkX, chunkY, 
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
                chunkX, chunkY, 
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
                chunkX, chunkY, 
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
                chunkX, chunkY, 
                -Math.PI/2, 0,
                wallLineColor, 
                wallFillColor, 
                directedLightingRange
            );
            entities.push(wall);
        }
        let building = chunkX > 1 && !stairs && tileRng() < .2;
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
            let buildingDepth = tileRng(buildingDepthMax) + CONST_MIN_BUILDING_DEPTH;
            let minBuildingDimension = CONST_CHUNK_DIMENSION_MIN>>1;
            let maxBuildingDimension = CONST_CHUNK_DIMENSION_MIN - gap*2;
            let buildingDimension = tileRng(maxBuildingDimension - minBuildingDimension) + minBuildingDimension;
            let buildingWidth = buildingDimension;
            let buildingHeight = buildingDimension;
            let buildingZ = z;
            let buildingSegments = tileRng(buildingDepth/CONST_MIN_BUILDING_DEPTH) + 1;
            let buildingShift = tileRng(4)+1;
            let walls: Surface[] = [];
            let maxSpawnCount = 0;
            while( buildingSegments-- && buildingWidth > 1 && buildingHeight > 1 ) {

                let buildingX = x + ((CONST_CHUNK_WIDTH - buildingWidth)>>1);
                let buildingY = y + ((CONST_CHUNK_HEIGHT - buildingHeight)>>1);

                maxSpawnCount += buildingWidth * buildingHeight;

                let buildingWallWest = surfaceGenerator( 
                    buildingX, buildingY, buildingZ, 
                    buildingWidth, buildingDepth, 
                    chunkX, chunkY, 
                    Math.PI/2, 0, 
                    badLineColor, 
                    badFillColor, 
                    directedLightingRange

                );
                let buildingWallEast = surfaceGenerator( 
                    buildingX, buildingY + buildingHeight, buildingZ + buildingDepth, 
                    buildingWidth, buildingDepth, 
                    chunkX, chunkY, 
                    -Math.PI/2, 0, 
                    badLineColor, 
                    badFillColor,       
                    directedLightingRange
                );
                let buildingWallSouth = surfaceGenerator(
                    buildingX, buildingY, buildingZ, 
                    buildingDepth, buildingHeight, 
                    chunkX, chunkY, 
                    0, Math.PI/2, 
                    badLineColor, 
                    badFillColor, 
                    directedLightingRange
                );
                let buildingWallNorth = surfaceGenerator(
                    buildingX + buildingWidth, buildingY, buildingZ + buildingDepth, 
                    buildingDepth, buildingHeight, 
                    chunkX, chunkY, 
                    0, -Math.PI/2, 
                    badLineColor, 
                    badFillColor, 
                    directedLightingRange
                );
                let buildingRoof = surfaceGenerator(
                    buildingX, buildingY, buildingZ + buildingDepth, 
                    buildingWidth, buildingHeight, 
                    chunkX, chunkY, 
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
            let spawnJumpFrequency = 99;
            let spawnRestFrequency = 2000;
            let incubationTime = 999;
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
            let nextBirth: number = 0;            

            let spawnTypeCount = tileRng(3) + 1;
            while( spawnTypeCount-- ) {
                spawnTypes.push(monsterSeedPalette[tileRng(monsterSeedPalette.length)]);
            }

            let setWallLight = function(wall: Surface, bit: number, on?: number) {
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

            let spawn = function(now: number, target?: Monster): boolean {
                // find a surface facing the player
                let monsterRadius = CONST_BASE_RADIUS;
                let successfulSpawning: boolean;
                let attemptsRemaining = 3;
                while( !successfulSpawning && attemptsRemaining-- && spawnCount < maxSpawnCount ) {
                    if( spawning ) {
                        spawnGridX += tileRng(3) - 1;
                        spawnGridY += tileRng(3) - 1; 
                    } else {
                        spawnType = spawnTypes[tileRng(spawnTypes.length)];
                        spawnWall = walls[tileRng(walls.length)];
                        spawnGridX = tileRng(spawnWall.width);
                        spawnGridY = tileRng(spawnWall.height);    
                    }
                    successfulSpawning = spawnGridX >= 0 && spawnGridY >= 0 && spawnGridX < spawnWall.width && spawnGridY < spawnWall.height && spawnWall.normal[2] < CONST_SMALL_NUMBER;
                    if( successfulSpawning ) {
                        let monsterPosition = vector3TransformMatrix4(spawnGridX + .5, spawnGridY + .5, monsterRadius * 2, spawnWall.pointsToWorld);
                        if( target ) {
                            let targetPosition = [target.x, target.y, target.z];
                            let positionDiff = vector3Subtract(targetPosition, monsterPosition);
                            let distance = vector3Length(positionDiff);
                            let facing = vector3DotProduct(vector3Divide(positionDiff, distance), spawnWall.normal);    
                            successfulSpawning = distance < CONST_CHUNK_DIMENSION_MIN * 3 && facing > CONST_BUILDING_PLAYER_SPAWN_COS;    
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
                                monster.birthday = now + incubationTime + tileRng(incubationTime);
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

            let buildingCx = chunkX * CONST_CHUNK_WIDTH + CONST_CHUNK_WIDTH/2;
            let buildingCy = chunkY * CONST_CHUNK_HEIGHT + CONST_CHUNK_HEIGHT/2;
            
            let building: Building = {
                type: -1, 
                chunkX: chunkX, 
                chunkY: chunkY, 
                age: 0, 
                cleanup: function() {
                }, 
                power: 0, 
                side: SIDE_BUILDING, 
                update: function(world: World, diff: number) {
                    let player = world.getNearest(buildingCx, buildingCy, SIDE_PLAYER);
                    if( player ) {
                        nextSpawn -= diff;
                        if( nextSpawn < 0 ) {
                            let successfulSpawning = spawn(world.age, player);
                            if( successfulSpawning ) {
                                nextSpawn += spawnJumpFrequency;
                            } else {
                                if( spawning ) {
                                    nextSpawn = tileRng(spawnRestFrequency) + spawnJumpFrequency;
                                }
                            }
                            spawning = successfulSpawning;
                        }

                        // birth 
                        let positionDiff = vector3Subtract(
                            [player.x, player.y, player.z], 
                            [buildingCx, buildingCy, player.z]
                        );
                        let distance = vector3Length(positionDiff);
                        if( distance < CONST_BUILDING_ACTIVATION_DISTANCE && world.allEntities[SIDE_ENEMY].length < CONST_MAX_MONSTERS ) {
                            nextBirth -= diff;
                            if( nextBirth < 0 ) {
                                // find a suitable thing
                                let wallIndex = tileRng(walls.length);
                                let wall = walls[wallIndex];

                                if( vector3DotProduct(vector3Divide(positionDiff, distance), wall.normal) > CONST_BUILDING_PLAYER_SPAWN_COS ) {
                                    let wallSpawns = spawns[wall.id];
                                    for( let tileId in wallSpawns ) {
                                        let entity = wallSpawns[tileId]; 
                                        // don't spawn entites below player (no point)
                                        if( entity.birthday < world.age && entity.z >= player.z ) {
                                            delete wallSpawns[tileId];
                                            world.addEntity(entity);
                                            setWallLight(wall, parseInt(tileId));
                                            nextBirth = CONST_BASE_BUILDING_BIRTH_INTERVAL;
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
            if( FLAG_SPAWN_RANDOM_MONSTERS && tileRng() < .1 && chunkX > 2 ) {
                let monsterId = tileRng(CONST_BIG_NUMBER);
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