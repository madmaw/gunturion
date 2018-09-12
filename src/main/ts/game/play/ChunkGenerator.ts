interface ChunkGenerator {
    (x: number, y: number, world: World): Entity[];
}

function flatChunkGeneratorFactory(
    seed: number,
    surfaceGenerator: SurfaceGenerator,
    monsterGenerator: MonsterGenerator, 
    rngFactory: RandomNumberGeneratorFactory,
	audioContext: AudioContext, 
	say: (message: string, audioMessage?: string) => void
): ChunkGenerator {

	let monsterBirthSound = webAudioVibratoSound3DFactory(audioContext, .4, 0, .2, .1, 'sine', 777, 333);
	let buildingConversionSound = webAudioVibratoSound3DFactory(audioContext, .5, 0, .4, .2, 'square', 299, 999, 0, 'sine', 30);
	let buildingDamageSound = webAudioVibratoSound3DFactory(audioContext, .4, 0, .4, .2, 'sawtooth', -99, 299);


    function getFloorHeight(chunkX: number, chunkY: number) {
        // a lot of tiles aren't actually random
        let floorHeight: number;
        let wallDepth = CONST_MAX_WALL_DEPTH;
        let tileRng = rngFactory(chunkX*111 + chunkY * 37 + chunkX + chunkY);
        if( chunkX < CONST_FINISH_X_CHUNK ) {
            chunkX--;
            if( chunkX < 0 ) {
                floorHeight = 0;
            } else {
                let xOffset = (chunkX >> 2) * 3;
                floorHeight = ((chunkX + m.abs(numberPositiveMod(chunkY + xOffset, 6) - 2)) >> 2); 
                // make random
                // note we've already subtracted 1 from chunkX above
                let previousFloorHeight: number; 
                if( tileRng(2) && (previousFloorHeight = getFloorHeight(chunkX, chunkY)) < floorHeight * wallDepth ) {
                    floorHeight = previousFloorHeight;
                } else {
                    floorHeight *= wallDepth;
                }
    
            }
    
        } else {
            floorHeight = (CONST_FINISH_X_CHUNK>>2) * wallDepth;
            if( chunkX > CONST_FINISH_X_CHUNK || tileRng() < .1) {
                floorHeight += CONST_MAX_WALL_DEPTH * 0;
            }
        }
        return floorHeight;
    }

    return function(chunkX: number, chunkY: number, world: World): Entity[] {
                    //([A-Z]|^[a-z])[a-z]{2,}/g



        let x = chunkX * CONST_CHUNK_WIDTH;
        let y = chunkY * CONST_CHUNK_HEIGHT; 
        let tileKey = ''+seed+" "+chunkX+" "+chunkY;
        let tileRng = rngFactory(chunkX*111 + chunkY * 37 + chunkX + chunkY);

        let monsterSeedPalette: number[] = [];
        let z = getFloorHeight(chunkX, chunkY);
        let buildingIsWall = chunkX == CONST_FINISH_X_CHUNK;
        let makeATunnel = buildingIsWall && z >= getFloorHeight(chunkX+1, chunkY);

        for( let dx = -1; dx <= 1; dx++ ) {
            for( let dy = -1; dy < 1; dy ++ ) {
                
                let chunkRng = rngFactory((chunkY>>3+dy) * CONST_BIG_NUMBER + chunkX>>3+dx);
                // caculate monster palette for area
                monsterSeedPalette.push(chunkRng(CONST_BIG_NUMBER));
            }
        }

        let eastZ = getFloorHeight(chunkX + 1, chunkY);
        //let westZ = getFloorHeight(chunkX - 1, chunkY);
        let northZ = getFloorHeight(chunkX, chunkY + 1);
        let southZ = getFloorHeight(chunkX, chunkY - 1);

        let floor: Surface;
        let minZ = min(eastZ, southZ, northZ);
        
        let stairs = minZ > z && eastZ == minZ && !tileRng(z/9);
        
        let directedLightingRange: Vector4;
        if( stairs ) {
            let dz = minZ - z;
            let width = sqrt(CONST_CHUNK_WIDTH * CONST_CHUNK_WIDTH + dz * dz);
            let angle = atan2(dz, CONST_CHUNK_WIDTH); 
            directedLightingRange = [x, dz/CONST_CHUNK_WIDTH, z + CONST_DIRECTIONAL_LIGHT_EXTRA_Z, CONST_DIRECTIONAL_LIGHT_FADE_OUT];
            floor = surfaceGenerator(
                x, y, z, 
                width, CONST_CHUNK_HEIGHT, 
                chunkX, chunkY, 
                0, angle, 
                CONST_NEUTRAL_FILL_COLOR, 
                // adjust ratio so the lines match up with the walls
                2 / cos(angle), 2, 
                directedLightingRange
            );    
        } else {
            directedLightingRange = [x, 0, z + CONST_DIRECTIONAL_LIGHT_EXTRA_Z, CONST_DIRECTIONAL_LIGHT_FADE_OUT];
            floor = surfaceGenerator(
                x, y, z, 
                CONST_CHUNK_WIDTH, CONST_CHUNK_HEIGHT, 
                chunkX, chunkY, 
                0, 0, 
                CONST_NEUTRAL_FILL_COLOR, 
                2, 2,
                directedLightingRange
            );    
        }
        floor.floor = 1;

        let entities: Entity[] = [floor];
        if( eastZ > z && !stairs ) {
            let wallWidth = eastZ - z;
            let wall = surfaceGenerator(
                x + CONST_CHUNK_WIDTH, y, z, 
                wallWidth, CONST_CHUNK_HEIGHT, 
                chunkX, chunkY, 
                0, CONST_FAIRLY_ACCURATE_PI_DIV_2,  
                CONST_NEUTRAL_FILL_COLOR, 
                wallWidth, 2,
                directedLightingRange
            );
            entities.push(wall);
        }
        if( northZ > z ) {
            let wallHeight = northZ - z;
            let wall = surfaceGenerator(
                x, y + CONST_CHUNK_HEIGHT, z, 
                CONST_CHUNK_WIDTH, wallHeight, 
                chunkX, chunkY, 
                CONST_FAIRLY_ACCURATE_PI_DIV_2, 0,  
                CONST_NEUTRAL_FILL_COLOR, 
                2, wallHeight, 
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
                -CONST_FAIRLY_ACCURATE_PI_DIV_2, 0,
                CONST_NEUTRAL_FILL_COLOR, 
                2, wallDepth, 
                directedLightingRange
            );
            entities.push(wall);
        }
        let building = chunkX > 0 && tileRng(2) && !stairs || buildingIsWall;
        // let i = 9;
        // while( building && i ) {
        //     i--;
        //     let dx = i % 3 - 1;
        //     let dy = floor(i / 3) - 1;
        //     let tz = getFloorHeight(tileX + dx, tileY + dy);
        //     building = building && tz <= z;
        // }
        let liberated: any = (!tileRng(9+z) || ls.getItem(tileKey) || chunkX<3 || chunkX > CONST_FINISH_X_CHUNK ) && !buildingIsWall;
        
        if( building ) {
            let gap = 1;
            let buildingDepthMax = min(CONST_MIN_BUILDING_DEPTH + z/CONST_MIN_BUILDING_DEPTH, CONST_MAX_BUILDING_DEPTH) | 0;
            let minBuildingDimension = CONST_CHUNK_DIMENSION_MIN>>1;
            let maxBuildingDimension = CONST_CHUNK_DIMENSION_MIN - gap*2;
            let buildingDimension = tileRng(maxBuildingDimension - minBuildingDimension) + minBuildingDimension;
            let gridScale = buildingIsWall?4:tileRng(chunkX*3/CONST_FINISH_X_CHUNK)+1;
            let buildingWidth = buildingDimension - buildingDimension%gridScale;
            let buildingHeight = buildingIsWall?CONST_CHUNK_HEIGHT:buildingWidth;
            let ziggurat = !tileRng(30 - northZ - southZ + z * 2);
            let buildingDepth = buildingIsWall?CONST_MAX_BUILDING_DEPTH:(ziggurat?1:tileRng(buildingDepthMax) + CONST_MIN_BUILDING_DEPTH)*gridScale;
            
            let buildingZ = z;
            if( makeATunnel ) {
                buildingZ += gridScale;
            }
            let buildingSegments = buildingIsWall?1:ziggurat?buildingWidth:tileRng(buildingDepth/CONST_MIN_BUILDING_DEPTH) + 1;
            let buildingShift = tileRng(4)+1;
            let walls: Surface[] = [];
            let maxHealth = 0;
			let fillColor = buildingIsWall?CONST_NEUTRAL_FILL_COLOR:(liberated?CONST_GOOD_FILL_COLOR:CONST_BAD_FILL_COLOR);
            let onCollision = function(world: World, entity: Entity) {
				if( entity.side == SIDE_NEUTRAL && !buildingIsWall ) {
                    // it's a player's bullet
                    walls.map(function(wall) {
                        wall.lastDamageAge = world.age;
                    });
                    if( damage < maxHealth ) {
						damage++;
						if( damage >= maxHealth ) {
							buildingConversionSound(x, y, z);
							say("BUILDING LIBERATED");
						} else {
							buildingDamageSound(x, y, z);
						}
                    }
                }
            };
            let buildingRoof: Surface;
            let buildingWallSouth: Surface;
            let buildingFloor: Surface;
            while( buildingSegments-- && buildingWidth > 1 && buildingHeight > 1 ) {

                let buildingX = x + ((CONST_CHUNK_WIDTH - buildingWidth)>>1);
                let buildingY = y + ((CONST_CHUNK_HEIGHT - buildingHeight)>>1);
                

                maxHealth += buildingWidth * buildingHeight * buildingDepth/CONST_BUILDING_VOLUME_HEALTH_RATIO;

                let buildingWallWest = surfaceGenerator( 
                    buildingX, buildingY, buildingZ, 
                    buildingWidth, buildingDepth, 
                    chunkX, chunkY, 
                    CONST_FAIRLY_ACCURATE_PI_DIV_2, 0, 
                    fillColor, 
                    gridScale, gridScale, 
                    directedLightingRange, 
                    onCollision
                );
            
                let buildingWallEast = surfaceGenerator( 
                    buildingX, buildingY + buildingHeight, buildingZ + buildingDepth, 
                    buildingWidth, buildingDepth, 
                    chunkX, chunkY, 
                    -CONST_FAIRLY_ACCURATE_PI_DIV_2, 0, 
                    fillColor, 
                    gridScale, gridScale, 
                    directedLightingRange, 
                    onCollision
                );
                buildingWallSouth = surfaceGenerator(
                    buildingX, buildingY, buildingZ, 
                    buildingDepth, buildingHeight, 
                    chunkX, chunkY, 
                    0, CONST_FAIRLY_ACCURATE_PI_DIV_2, 
                    fillColor, 
                    gridScale, gridScale, 
                    directedLightingRange, 
                    onCollision
                );
                let buildingWallNorth = surfaceGenerator(
                    buildingX + buildingWidth, buildingY, buildingZ + buildingDepth, 
                    buildingDepth, buildingHeight, 
                    chunkX, chunkY, 
                    0, -CONST_FAIRLY_ACCURATE_PI_DIV_2, 
                    fillColor, 
                    gridScale, gridScale, 
                    directedLightingRange, 
                    onCollision
                );
                buildingRoof = surfaceGenerator(
                    buildingX, buildingY, buildingZ + buildingDepth, 
                    buildingWidth, buildingHeight, 
                    chunkX, chunkY, 
                    0, 0, 
                    fillColor, 
                    gridScale, gridScale, 
                    directedLightingRange, 
                    onCollision
                );
                walls.push(buildingWallEast, buildingWallWest, buildingWallSouth, buildingWallNorth, buildingRoof);
                if( buildingZ > z ) {
                    // we need a floor too!
                    buildingFloor = surfaceGenerator(
                        buildingX + buildingWidth, buildingY, buildingZ, 
                        buildingWidth, buildingHeight, 
                        chunkX, chunkY, 
                        0, CONST_FAIRLY_ACCURATE_PI, 
                        fillColor, 
                        gridScale, gridScale, 
                        directedLightingRange, 
                        onCollision
                    );
                    walls.push(buildingFloor);                    
                }
                
    
                buildingZ += buildingDepth;
                buildingDepth >>= buildingShift;
                buildingDepth -= buildingDepth % gridScale;
                if( buildingDepth <= 0 ) {
                    buildingDepth = gridScale;
                    buildingWidth-=gridScale*2;
                    buildingHeight-=gridScale*2;    
                } else {
                    buildingWidth-=gridScale*(tileRng(2)+1)*2;
                    buildingHeight-=gridScale*(tileRng(2)+1)*2;    
                }
            }
            let maxSpawnCount = maxHealth/(gridScale * gridScale) | 0;
            let incubationTime = 999;
            let spawnCount: number = 0;
            let spawnGridX: number;
            let spawnGridY: number;
            let spawning: boolean;
            let spawnWall: Surface;
            let nextSpawn = CONST_SPAWN_REST_INTERVAL;
            let spawnType: number;
            let spawnTypes = [];
            let spawns:{[_:number]:{[_:number]:Monster}} = {};
            let nextBirth: number = 0;            
            let damage = liberated?maxHealth:0;
            let friendliness = damage/maxHealth;
            let power = damage * friendliness/CONST_BUILDING_DAMAGE_POWER_DIV;
            let previousDamage = damage;


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

            let spawn = function(now: number, aggro: number, target?: Monster): boolean {
                // find a surface facing the player
                let monsterRadius = CONST_BASE_RADIUS * gridScale;
                let successfulSpawning: boolean;
                let attemptsRemaining = min(9, tileRng(9) + aggro/99 | 0);
                while( !successfulSpawning && attemptsRemaining-- && spawnCount < maxSpawnCount ) {
                    if( spawning ) {
                        spawnGridX += tileRng(3) - 1;
                        spawnGridY += tileRng(3) - 1; 
                    } else {
                        spawnType = spawnTypes[tileRng(spawnTypes.length)]; 
                        spawnWall = walls[tileRng(walls.length)];
                        spawnGridX = tileRng(spawnWall.surfaceWidth/gridScale);
                        spawnGridY = tileRng(spawnWall.surfaceHeight/gridScale);    
                    }
                    successfulSpawning = spawnGridX >= 0 && spawnGridY >= 0 && spawnGridX < spawnWall.surfaceWidth/gridScale && spawnGridY < spawnWall.surfaceHeight/gridScale && (spawnWall == buildingWallSouth && buildingIsWall || !buildingIsWall && spawnWall.normal[2] < CONST_SMALL_NUMBER || spawnWall == buildingRoof || spawnWall == buildingFloor);
                    if( successfulSpawning ) {
                        let monsterPosition = vector3TransformMatrix4((spawnGridX + .5) * gridScale, (spawnGridY + .5) * gridScale, monsterRadius+CONST_SMALL_NUMBER, spawnWall.pointsToWorld);
                        if( target ) {
                            let targetPosition = [target.x, target.y, target.z];
                            let positionDiff = vector3Subtract(targetPosition, monsterPosition);
                            let distance = vector3Length(positionDiff);
                            let facing = vector3DotProduct(vector3Divide(positionDiff, distance), spawnWall.normal);    
                            successfulSpawning = !aggro || facing > CONST_BUILDING_PLAYER_SPAWN_COS;    
                            if( positionDiff[2] > 0 || spawnWall == buildingRoof ) {
                                // make a flying variant
                                spawnType &= ~3;
                            }
                        }
                        if( successfulSpawning ) {
                            //world.addEntity(monster);    
                            let bit = spawnGridY * spawnWall.surfaceWidth + spawnGridX;
                            let wallSpawns = spawns[spawnWall.entityId];
                            if( !wallSpawns ) {
                                wallSpawns = {};
                                spawns[spawnWall.entityId] = wallSpawns;
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
                                // trick it into being brighter because it was born
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
            let buildingCx = chunkX * CONST_CHUNK_WIDTH + CONST_CHUNK_WIDTH/2;
            let buildingCy = chunkY * CONST_CHUNK_HEIGHT + CONST_CHUNK_HEIGHT/2;
            let player = world.getNearest(buildingCx, buildingCy, SIDE_PLAYER);
            while( !liberated && spawnCount < maxSpawnCount ) {
                spawn(0, 0, player);
            }
            
            let building: Building = {
                entityType: -1, 
                chunkX: chunkX, 
                chunkY: chunkY, 
                age: 0, 
                cleanup: function() {
                }, 
                power: power, 
                friendliness: buildingIsWall?-1:friendliness,
                side: SIDE_BUILDING, 
                onUpdate: function(world: World, diff: number) {
                    if( damage < maxHealth ) {
                        damage = max(0, damage - diff / 999);
                        world.aggro = max(damage, world.aggro);
                        
                        let player = world.getNearest(buildingCx, buildingCy, SIDE_PLAYER);
                        if( player ) {
                            nextSpawn -= diff;
                            if( nextSpawn < 0 ) {
                                let successfulSpawning = spawn(world.age, world.previousAggro, player);
                                if( successfulSpawning ) {
                                    nextSpawn += CONST_SPAWN_JUMP_INTERVAL;
                                } else {
                                    if( spawning ) {
                                        nextSpawn = CONST_SPAWN_REST_INTERVAL;
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
                            if( distance < CONST_MAX_BUILDING_ACTIVATION_DISTANCE + world.previousAggro/CONST_AGGRO_DISTANCE_DIVISOR && world.allEntities[SIDE_ENEMY].length < CONST_MAX_MONSTERS + world.previousAggro - distance && distance > CONST_MIN_BUILDING_ACTIVATION_DISTANCE ) {
                                nextBirth -= diff;
                                if( nextBirth < 0 ) {
                                    // find a suitable thing
                                    let wallIndex = tileRng(walls.length);
                                    let wall = walls[wallIndex];
    
                                    if( vector3DotProduct(vector3Divide(positionDiff, distance), wall.normal) > CONST_BUILDING_PLAYER_SPAWN_COS || wall == buildingRoof ) {
                                        let wallSpawns = spawns[wall.entityId];
                                        
                                        for( let tileId in wallSpawns ) {
                                            let entity = wallSpawns[tileId]; 
                                            if( entity.birthday < world.age ) {
                                                delete wallSpawns[tileId];
                                                entity.lastDamageAge = world.age + 99;
                                                world.addEntity(entity);
                                                monsterBirthSound(entity.x, entity.y, entity.z);
                                                setWallLight(wall, <any>tileId);
                                                nextBirth = CONST_BASE_BUILDING_BIRTH_INTERVAL;
                                                spawnCount--;                
                                                break;    
                                            }
                                        }
                                    } 
                                }        
                            } 
                        }
                    } else {
                        if( !liberated ) {
							liberated = 1;
                            // save the fact we converted this building
							ls.setItem(tileKey, 'x');
                            ls.setItem(''+seed, '['+buildingCx+','+buildingCy+','+buildingZ+']');
                            // turn off all the lights
                            walls.map(function(wall) {
                                wall.gridLighting = [0, 0, 0, 0];                                
                                wall.filledColor = CONST_GOOD_FILL_COLOR;
                            })
                        }            
                    }
                    if( previousDamage != damage ) {
                        // adjust the colours of the grids
                        let friendliness = min(1, damage/maxHealth);
                        friendliness *= friendliness;
                        building.friendliness = friendliness;
                        building.power = friendliness*maxHealth/CONST_BUILDING_DAMAGE_POWER_DIV;
                        previousDamage = damage;
                    }    
                }
            }
            entities.push.apply(entities, walls);
            entities.push(building);

        } else if( chunkX < CONST_FINISH_X_CHUNK ) {
            if( FLAG_SPAWN_RANDOM_MINIBOSSES && !liberated && !tileRng(9) && z ) {
                
                let monsterId = monsterSeedPalette[tileRng(monsterSeedPalette.length)];
                let r = min(CONST_CHUNK_DIMENSION_MIN/3, CONST_BASE_RADIUS * (sqrt(chunkX) + 1));
                let monster = monsterGenerator(
                    monsterId, 
                    //x + r + rng(chunkWidth - r*2), y + r + rng(chunkHeight - r*2), z + r * 2, 
                    x + CONST_CHUNK_WIDTH/2, y + CONST_CHUNK_HEIGHT/2, z + r + CONST_MAX_WALL_DEPTH, 
                    r, 
                    -1, 
                    // save the fact that we died
                    function() {
                        ls.setItem(tileKey, 'x');
                    }
                );                        
                entities.push(monster);    
            }
        }
        return entities;
    }
}