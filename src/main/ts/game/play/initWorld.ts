const MAX_STEPS = 9;

interface CollisionPhysics {
    (): void;
}

interface World {
    updatableEntities: (Monster | Building)[];
    allEntities: {[_: number]: Entity[]};
	
	cameraX?: number;
    cameraY?: number;
    cameraZ?: number;

    cameraRotationX?: number;
    cameraRotationY?: number;
    cameraRotationZ?: number;

    age: number;

    aggro: number;
    previousAggro: number;

	updateWorld(diff: number);
	setCameraPosition(x: number, y: number, z: number, rotationX: number, rotationY: number, rotationZ: number);
	addEntity(entity: Entity);
	getEntitiesAt(x: number, y: number): Entity[];
	getNearestEnemy(to: Monster, searchRadius?: number): Monster;
	getNearest(x: number, y: number, targetSide: number, searchRadius?: number): Monster;
}

function initWorld(
	chunkGenerator: ChunkGenerator,
    player: Monster        
): World {
	// let activeTiles = array2dCreate(
	// 	CONST_ACTIVE_CHUNKS_WIDTH, 
	// 	CONST_ACTIVE_CHUNKS_HEIGHT, 
	// 	function() {
	// 		return [];
	// 	}
    // );
    let activeTiles: (Monster|Surface)[][][] = [];
    for(let x=0; x<CONST_ACTIVE_CHUNKS_WIDTH; x++ ) {
        let a: (Monster|Surface)[][] = [];
        for( let y=0; y<CONST_ACTIVE_CHUNKS_HEIGHT; y++ ) {
            a.push([]);
        }
        activeTiles.push(a);
    }
    

	let activeTileArea: Rect2;
	
	let bonusMillis = 0;
	let chunkDimensions = [CONST_CHUNK_WIDTH, CONST_CHUNK_HEIGHT];

	function iterateTiles(bounds: Rect2, f: (entities: (Monster | Surface)[], tileX?: number, tileY?: number) => void ): Rect2 {
        let overlap = rect2Overlap(bounds, activeTileArea, chunkDimensions);
        if( overlap ) {
            let minTileX = overlap.minimum[0];
            let minTileY = overlap.minimum[1];
            let maxTileX = overlap.maximum[0];
            let maxTileY = overlap.maximum[1];
            
            for( let x=minTileX; x<=maxTileX; x++ ) {
                for( let y=minTileY; y<=maxTileY; y++ ) {
                    
                    f(world.getEntitiesAt(x, y) as (Monster | Surface)[], x, y);
                }
            }
        }
        return overlap;
    }

	function addEntityPosition(entity: Monster | Surface): Rect2 {
        return iterateTiles(entity.bounds(), function(entities: (Monster | Surface)[], tx: number, ty: number) {
            if( !entity.entityType && (entity as Surface).chunkX == tx && (entity as Surface).chunkY == ty && (entity as Surface).floor ) {
                // floor tiles come first so we can get the reference grade
                entities.unshift(entity);
            } else{
                entities.push(entity);
            }
        });
    }

    function removeEntity(entity: Entity) {
        if( entity.entityType ) {
            arrayRemove(world.updatableEntities, entity);
            if( entity.entityType == 1 && entity.sound ) {
                entity.sound.stopLooping();
            }
        }
        let sideEntities = world.allEntities[entity.side];
        if( sideEntities ) {
            arrayRemove(sideEntities, entity);
        }
        if( entity.entityType != -1 ) {
            removeEntityPosition(entity);
        }
        if( FLAG_CLEAN_UP_ENTITY ) {
            entity.cleanup();
        } 
    }

    function removeEntityPosition(entity: Monster | Surface) {
        return iterateTiles(entity.bounds(), function(entities: Entity[]) {
            arrayRemove(entities, entity);
        });
    }

	function doUpdate(amt: number) {
        world.previousAggro = world.aggro;
        world.aggro = 0;
        world.age += amt;
        let i=world.updatableEntities.length;
        while( i ) {
            i--;
            let updatableEntity = world.updatableEntities[i];

            updatableEntity.age += amt;
            if( updatableEntity.entityType == 1 && updatableEntity.deathAge ) {
                if( updatableEntity.age > updatableEntity.deathAge + CONST_DEATH_ANIMATION_TIME ) {
                    // remove 
                    removeEntity(updatableEntity);
                }
            } else if( 
                updatableEntity.entityType == 1 && !rect2Overlap(updatableEntity.bounds(), activeTileArea, chunkDimensions) || 
                updatableEntity.entityType == -1 && !rect2Contains(activeTileArea, updatableEntity.chunkX, updatableEntity.chunkY)
            ) {
                // it's outside the active area, kill it
                removeEntity(updatableEntity);
            } else {
                let done: boolean | number;
                updatableEntity.onUpdate(world, amt);

                // console.log('starting update');
                // console.log('original position', activeMonster.x, activeMonster.y, activeMonster.z);
                // console.log('velocity', activeMonster.vx, activeMonster.vy, activeMonster.vz);        

                if( updatableEntity.entityType > 0 ) {
                    let updatableMonster = updatableEntity as Monster;
                    updatableMonster.vz -= amt * CONST_GRAVITY_ACCELERATION * updatableMonster.gravityMultiplier;
                    let amtRemaining = amt;
                    let collisionsRemaining = CONST_MAX_COLLISIONS;
                    let maxVelocity = updatableMonster.radius * 2/amt;
                    let maxVelocitySquared = maxVelocity * maxVelocity;

                    let previousCollisionEntityId: number;

                    while( !done ) {
        
                        let originalX = updatableMonster.x;
                        let originalY = updatableMonster.y;
                        let originalZ = updatableMonster.z;
                        let dx = updatableMonster.vx * amtRemaining;
                        let dy = updatableMonster.vy * amtRemaining;
                        let dz = updatableMonster.vz * amtRemaining;


                        removeEntityPosition(updatableMonster); 

                        // ensure velocity is sensible
                        if(FLAG_CHECK_MAX_VELOCITY ) {
                            let velocitySquared = updatableMonster.vx * updatableMonster.vx + updatableMonster.vy * updatableMonster.vy + updatableMonster.vz * updatableMonster.vz;
                            if( velocitySquared > maxVelocitySquared ) {
                                let velocity = sqrt(velocitySquared);

                                if( FLAG_WARN_MAX_VELOCITY_EXCEEDED ) {
                                    console.warn('maximum velocity exceeded', velocity, maxVelocity, updatableEntity);
                                }

                                updatableMonster.vx *= maxVelocity/velocity;
                                updatableMonster.vy *= maxVelocity/velocity;
                                updatableMonster.vz *= maxVelocity/velocity;
                                
                            }    
                        }
                        

                        updatableMonster.x += dx;
                        updatableMonster.y += dy;
                        updatableMonster.z += dz;
            

                        // check for collisions
                        let bounds = updatableMonster.bounds();
                        let minCollisionTime: number;
                        let minCollisionEntity: Entity;
                        let minCollisionPhysics: CollisionPhysics;

                        let iteratedEntities: {[_:number]: number} = {};
                        iterateTiles(bounds, function(entities: (Monster | Surface)[]) {
                            let i = entities.length;
                            // reverse loop so if we are removed, we don't skip an entity
                            while( i-- ) {
                                let collisionEntity = entities[i];

                                if( !iteratedEntities[collisionEntity.entityId] && !updatableMonster.deathAge ) {
                                    iteratedEntities[collisionEntity.entityId] = 1;
                                    let collisionTime: number;
                                    let collisionPhysics: CollisionPhysics;
                                    if( collisionEntity.entityType ) {
                                        let monster = collisionEntity as Monster;
                                        if( monster.side != updatableEntity.side || FLAG_COLLIDE_WITH_SIDE ) {
                                            let dx = monster.x - updatableMonster.x;
                                            let dy = monster.y - updatableMonster.y;
                                            let dz = monster.z - updatableMonster.z;
                                            let dsq = dx * dx + dy * dy + dz * dz;
                                            let r = monster.radius + updatableMonster.radius;
                                            let velocitySquared = updatableMonster.vx*updatableMonster.vx + updatableMonster.vy*updatableMonster.vy + updatableMonster.vz*updatableMonster.vz;
                                            if( dsq < r * r && velocitySquared ) {
                                                // they're overlapping
                                                if( FLAG_SPHERE_PHYSICS ) {
                                                    let d = sqrt(dsq);
                                                    // note that the time we calculate here probably isn't technically correct because both objects are moving, but it doesn't matter
                                                    let overlap = r - d;
                                                    // how long does it take to move overlap at our velocity?
                                                    let velocity = sqrt(velocitySquared);
                                                    collisionTime = amt - overlap/velocity - CONST_SMALL_NUMBER;
                                                    if( collisionTime >= 0 ) {
                                                        collisionPhysics = function() {
                                                            // note, updatable monster position will have changed since we calculated it above
                                                            let d = vector3Normalize([monster.x - updatableMonster.x, monster.y - updatableMonster.y, monster.z - updatableMonster.z]);
                                                            let dv = vector3Normalize([monster.vx - updatableMonster.vx, monster.vy - updatableMonster.vy, monster.vz - updatableMonster.vz]);
                                                            if( vector3DotProduct(d, dv) < 0 ) 
                                                            {
                                                                // they're moving toward eachother on the plane
                                                                let to = [0, 0, 1];
                                                                let axis = vector3Normalize(vector3CrossProduct(to, d));
                                                                let angle = m.acos(vector3DotProduct(to, d));
                                                                let rotationMatrix = matrix4Rotate(axis[0], axis[1], axis[2], angle);
                                                                //let rotationMatrix = matrix4Multiply(matrix4Rotate(0, axis[1], 0, angle), matrix4Rotate(axis[0], 0, 0, angle));
                                                                let rotatedMonsterVelocity = vector3TransformMatrix4(monster.vx, monster.vy, monster.vz, rotationMatrix);
                                                                let rotatedUpdatableMonsterVelocity = vector3TransformMatrix4(updatableMonster.vx, updatableMonster.vy, updatableMonster.vz, rotationMatrix);
                                                                // let dv = rotatedUpdatableMonsterVelocity[2] + rotatedMonsterVelocity[2];
                                                                // if( dv < 0 ) 
                                                                {
                                                                    //let unrotationMatrix = matrix4Rotate(axis[0], axis[1], axis[2], -angle);
                                                                    let unrotationMatrix = matrix4Invert(rotationMatrix);
                                                                    // they're moving toward eachother
                                                                    let restitution = max(monster.restitution, updatableMonster.restitution);
                                                                    let totalRadius = monster.radius + updatableMonster.radius;
                                                                    let combinedVelocity = (rotatedMonsterVelocity[2] * monster.radius + rotatedUpdatableMonsterVelocity[2] * updatableMonster.radius) / totalRadius;
                                                                    let restitutionVelocity = restitution * combinedVelocity;
                                                                    let resultingVelocity = vector3TransformMatrix4(
                                                                        rotatedMonsterVelocity[0], 
                                                                        rotatedMonsterVelocity[1], 
                                                                        combinedVelocity + restitutionVelocity * updatableMonster.radius/totalRadius, 
                                                                        unrotationMatrix
                                                                    );
                                                                    let resultingUpdatableMonsterVelocity = vector3TransformMatrix4(
                                                                        rotatedUpdatableMonsterVelocity[0], 
                                                                        rotatedUpdatableMonsterVelocity[1], 
                                                                        combinedVelocity - restitutionVelocity * monster.radius/totalRadius, 
                                                                        unrotationMatrix
                                                                    );
                                                                    monster.vx = resultingVelocity[0];
                                                                    monster.vy = resultingVelocity[1];
                                                                    monster.vz = resultingVelocity[2];
                    
                                                                    updatableMonster.vx = resultingUpdatableMonsterVelocity[0];
                                                                    updatableMonster.vy = resultingUpdatableMonsterVelocity[1];
                                                                    updatableMonster.vz = resultingUpdatableMonsterVelocity[2];
                                                                }
                                                            }
            
                                                        };        
                                                    } else {
                                                        // if you can't collide with your side, someone is going to die so you don't need physics
                                                        collisionPhysics = null;
                                                    }
                                                } else {
                                                    // just report the collision to the entities (may not be accurate, but probably good enough)
                                                    monster.onCollision(world, updatableEntity);
                                                    if( monster.deathAge ) {
                                                        removeEntityPosition(monster);
                                                    }
                                                    updatableMonster.onCollision(world, monster);
                                                }
        
                                            }
                                        }
        
                                    } else {
                                        let surface = collisionEntity as Surface;
                                        // does it overlap?
                                        if( rect3Overlap(surface.bounds(), bounds) ) {
                                            // is the sphere overlapping the plane?
                                            let relativePosition = vector3TransformMatrix4(updatableMonster.x, updatableMonster.y, updatableMonster.z, surface.worldToPoints);
                                            let intersectionZ = relativePosition[2];
                                            if( m.abs(intersectionZ) < updatableMonster.radius ) {
                                                // velocity z should be negative (moving into the plane), if it's not, we can ignore this result
                                                let collisionClosestPoint: Vector2;
                                                let collisionRelativePosition = relativePosition;
                                                let relativeOrigin = vector3TransformMatrix4(originalX, originalY, originalZ, surface.worldToPoints);
                                                
                                                let velocity = vector3TransformMatrix4(updatableMonster.vx, updatableMonster.vy, updatableMonster.vz, surface.worldToPointsRotation);
                                                let velocityZ = velocity[2];
        
                                                let overlapTime: number;
                                                if( velocityZ > 0 ) {
                                                    let overlap = updatableMonster.radius + intersectionZ;
                                                    overlapTime = overlap / velocityZ;
                                                } else {
                                                    let overlap = updatableMonster.radius - intersectionZ;
                                                    overlapTime = overlap / -velocityZ;
                                                }
        
                                                let planeIntersectionTime = amtRemaining - overlapTime;
                                                //let planeIntersectionTime = amtRemaining * (1 - overlap / (relativeOrigin[2] - relativePosition[2]));
        
                                                // check if we are starting inside the polygon
                                                if( FLAG_CHECK_INVALID_START_POSITION ) {
                                                    let closestOriginPoint = vector2PolyEdgeOverlapsCircle(surface.points, relativeOrigin, updatableMonster.radius);
                                                    if( closestOriginPoint ) {
                                                        let odx = closestOriginPoint[0] - relativeOrigin[0];
                                                        let ody = closestOriginPoint[1] - relativeOrigin[1];
                                                        let odz = relativeOrigin[2];
                                                        let odsq = odx*odx+ody*ody+odz*odz
                                                        if( odsq < updatableMonster.radius*updatableMonster.radius || vector2PolyContains(surface.points, relativeOrigin[0], relativeOrigin[1]) && odz < updatableMonster.radius ) {
                                                            if( FLAG_WARN_INVALID_START_POSITION ) {
                                                                console.warn(
                                                                    'started colliding with polygon, this will end badly', 
                                                                    {
                                                                        currentPosition: [originalX, originalY, originalZ], 
                                                                        currentVelocity: [updatableMonster.vx, updatableMonster.vy, updatableMonster.vz], 
                                                                        previousPosition: updatableMonster.previousPosition, 
                                                                        previousVelocity: updatableMonster.previousVelocity,
                                                                        entity: updatableEntity 
                                                                    }
                                                                );	
                                                            }
                                                            // kill it
                                                            if( updatableMonster.side != SIDE_PLAYER ) {
                                                                updatableMonster.die(world);
                                                            }
                                                        }    
                                                    }                                        
                                                }
        
                                                if( planeIntersectionTime <= amtRemaining ) {
                                                    let relativeOrigin = vector3TransformMatrix4(originalX, originalY, originalZ, surface.worldToPoints);
                                                    let planeIntersection = vectorMix(relativePosition, relativeOrigin, planeIntersectionTime/amtRemaining, 3);
        
                                                    if( velocityZ < 0 && vector2PolyContains(surface.points, planeIntersection[0], planeIntersection[1]) && planeIntersectionTime > 0 ) {
                                                        collisionTime = planeIntersectionTime - CONST_SMALL_NUMBER;
                                                    } else {
                                                        // are we actually overlapping the polygon
                                                        let intersectionRadius = sqrt(updatableMonster.radius * updatableMonster.radius - intersectionZ * intersectionZ);
                
                                                        collisionClosestPoint = vector2PolyEdgeOverlapsCircle(surface.points, relativePosition, intersectionRadius);
        
                                                        if( collisionClosestPoint || vector2PolyContains(surface.points, relativePosition[0], relativePosition[1] ) ) {
                                                            // need to back this out
                
                                                            let minTime = max(0, planeIntersectionTime - CONST_SMALL_NUMBER);
                                                            let maxTime = amtRemaining;
                                                            for( let i=0; i<MAX_STEPS; i++ ) {
                                                                let testTime = (minTime + maxTime)/2;
                                                                let testRelativePosition = vector3TransformMatrix4(
                                                                    originalX + testTime * updatableMonster.vx, 
                                                                    originalY + testTime * updatableMonster.vy, 
                                                                    originalZ + testTime * updatableMonster.vz, 
                                                                    surface.worldToPoints
                                                                );
                                                                // we know it intersects with the plane
                                                                let testIntersectionZ = testRelativePosition[2];
                                                                let testIntersectionRadius = sqrt(updatableMonster.radius * updatableMonster.radius - testIntersectionZ * testIntersectionZ);
                                                                if( vector2PolyContains(surface.points, testRelativePosition[0], testRelativePosition[1] ) && velocityZ < 0 ) {
                                                                    maxTime = testTime;
                                                                    // bounce up
                                                                    collisionRelativePosition = testRelativePosition;
                                                                    collisionClosestPoint = null;    
                                                                } else {
                                                                    let closestPoint = vector2PolyEdgeOverlapsCircle(surface.points, testRelativePosition, testIntersectionRadius);
                                                                    if( closestPoint ) {
                                                                        let dx = closestPoint[0] - testRelativePosition[0];
                                                                        let dy = closestPoint[1] - testRelativePosition[1];
                                                                        let dz = testRelativePosition[2];
                                                                        let rsq = dx*dx + dy*dy + dz*dz;
                                                                        if( rsq < updatableMonster.radius * updatableMonster.radius ) {
                                                                            collisionRelativePosition = testRelativePosition;
                                                                            collisionClosestPoint = closestPoint;
        
                                                                            maxTime = testTime;
                                                                        } else {
                                                                            minTime = testTime;
                                                                        }
                    
                                                                    } else {
                                                                        minTime = testTime;
                                                                    }
                                                                }
                                                            }
                                                            if( collisionClosestPoint ) {
                                                                // check velocity at collision point (must actually be travelling toward the edge)
                                                                let angleZ = atan2(
                                                                    collisionClosestPoint[1] - collisionRelativePosition[1], 
                                                                    collisionClosestPoint[0] - collisionRelativePosition[0]
                                                                ) - CONST_FAIRLY_ACCURATE_PI_DIV_2;
                                                                let angleX = m.acos(collisionRelativePosition[2] / updatableMonster.radius);
                                                                // console.log('angle z/x', angleZ, angleX);
                                                                // console.log('collision time', minTime);
                                                                let toMatrix = matrix4MultiplyStack([matrix4Rotate(1, 0, 0, angleX), matrix4Rotate(0, 0, 1, angleZ), surface.worldToPointsRotation]);
                                                                let vx = updatableMonster.vx;
                                                                let vy = updatableMonster.vy;
                                                                let vz = updatableMonster.vz;
                                                                let collisionRelativeVelocity = vector3TransformMatrix4(vx, vy, vz, toMatrix);                                            
                                                                if( collisionRelativeVelocity[2] < 0 ) {
                                                                    collisionTime = minTime;
                                                                }
        
                                                            } else {
                                                                // all these should be legit
                                                                collisionTime = minTime;
                                                            }
                                                        }
                                                    }
                                                    collisionPhysics = function() {
                                                        let vx = updatableMonster.vx;
                                                        let vy = updatableMonster.vy;
                                                        let vz = updatableMonster.vz;
                                                        let restitution = updatableMonster.restitution;
                
                                                        let toMatrix: Matrix4;
                                                        let fromMatrix: Matrix4;
                                                        if( collisionClosestPoint ) {
                                                            // bounce off closest point at angle
                                                            // console.log('closest collision point', collisionClosestPoint);
                                                            // console.log('collision relative position', collisionRelativePosition);
                                                            // console.log('dx/dy', collisionClosestPoint[0] - collisionRelativePosition[0], collisionClosestPoint[1] - collisionRelativePosition[1]);
                                                            
                                                            let angleZ = atan2(
                                                                collisionClosestPoint[1] - collisionRelativePosition[1], 
                                                                collisionClosestPoint[0] - collisionRelativePosition[0]
                                                            ) - CONST_FAIRLY_ACCURATE_PI_DIV_2;
                                                            let angleX = m.acos(collisionRelativePosition[2] / updatableMonster.radius);
                                                            // console.log('angle z/x', angleZ, angleX);
                                                            // console.log('collision time', minCollisionTime);
                                                            toMatrix = matrix4MultiplyStack([matrix4Rotate(1, 0, 0, angleX), matrix4Rotate(0, 0, 1, angleZ), surface.worldToPointsRotation, ]);
                                                            //fromMatrix = matrix4Invert(toMatrix);
                                                            fromMatrix = matrix4MultiplyStack([surface.pointsToWorldRotation, matrix4Rotate(0, 0, 1, -angleZ), matrix4Rotate(1, 0, 0, -angleX), ]);
                                                        } else {
                                                            toMatrix = surface.worldToPointsRotation;
                                                            fromMatrix = surface.pointsToWorldRotation;
                                                        }
                                                        let velocity = vector3TransformMatrix4(vx, vy, vz, toMatrix);                                            
                                                        // always bounce back a bit
                                                        let result = vector3TransformMatrix4(velocity[0], velocity[1], velocity[2] * -restitution, fromMatrix);
                                                        // if( collisionClosestPoint ) {
                                                        //     console.log("result", result);
                                                        // }
                                                        // if( minCollisionTime <= 0 || minCollisionTime > amtRemaining ) {
                                                        //     console.log("uh oh!!!", velocity);
                                                        // }
                                                        updatableMonster.vx = result[0];
                                                        updatableMonster.vy = result[1];
                                                        updatableMonster.vz = result[2];
                                                    }
                                                }
                                            }                                
                                        }
                                    }
                                    if( collisionTime != null && (minCollisionTime == null || minCollisionTime > collisionTime) ) {
                                        minCollisionEntity = collisionEntity;
                                        minCollisionTime = collisionTime;
                                        minCollisionPhysics = collisionPhysics;
                                    }   
                                }
                            }
                        });
                        
                        if( minCollisionTime != null ) {
                            if( FLAG_DETECT_MULTIPLE_COLLISIONS ) {
                                let id = (minCollisionEntity as Bounded).entityId
                                if( id == previousCollisionEntityId && minCollisionEntity.entityType == 0 ) {
                                    console.warn('already just collided with this surface', updatableEntity, minCollisionEntity);
                                }
                                previousCollisionEntityId = id;
                            }
                            // move entity back to collision time   
                            let backTo = max(0, minCollisionTime);
                            updatableMonster.x = originalX + updatableMonster.vx * backTo;
                            updatableMonster.y = originalY + updatableMonster.vy * backTo;
                            updatableMonster.z = originalZ + updatableMonster.vz * backTo;     
                            amtRemaining -= backTo;    

                            if( minCollisionEntity.entityType && FLAG_SPHERE_PHYSICS ) {
                                let monster = minCollisionEntity as Monster;
                                updatableMonster.onCollision(world, monster);
                                monster.onCollision(world, updatableEntity);
                                // if it's dead, remove it
                                if( monster.deathAge ) {
                                    removeEntityPosition(monster);
                                }
                            } else {
                                //activeMonster.vx = activeMonster.vy = activeMonster.vz = 0;
                                // bounce
                                let surface = minCollisionEntity as Surface;
                                if( surface.onCollision ) {
                                    surface.onCollision(world, updatableEntity);                                    
                                }
                                updatableMonster.onCollision(world, minCollisionEntity);
                            }
                            if( minCollisionPhysics ) {
                                minCollisionPhysics();
                            }
                            done = !collisionsRemaining-- || amtRemaining <= CONST_SMALL_NUMBER || updatableMonster.deathAge;
                        } else {
                            if( !updatableMonster.deathAge ) {
                                addEntityPosition(updatableMonster);
                                // check that we are near the camera
                                if( updatableMonster.sound ) {
                                    let dx = world.cameraX - updatableMonster.x;
                                    let dy = world.cameraY - updatableMonster.y;
                                    let dz = world.cameraZ - updatableMonster.z;
                                    let dsq = dx*dx+dy*dy+dz*dz;
                                    if( dsq < CONST_MAX_SOUND_RADIUS_SQUARED * updatableMonster.radius * updatableMonster.radius * CONST_RADIUS_SOUND_VOLUME_RATIO_SQUARED) {
                                        updatableMonster.sound.startOrMove(updatableMonster.x, updatableMonster.y, updatableMonster.z);                                        
                                    } else {
                                        updatableMonster.sound.stopLooping();
                                    }    
                                }
                            }                            
                            done = true;
                        }
                    }
                    if( FLAG_CHECK_INVALID_START_POSITION ) {
                        updatableMonster.previousPosition = [updatableMonster.x, updatableMonster.y, updatableMonster.z];
                        updatableMonster.previousVelocity = [updatableMonster.vx, updatableMonster.vy, updatableMonster.vz];
                    }
                }
            }
        }

	}
    
	let world: World = {
		age: 0,
		updatableEntities: [player], 
		allEntities: {
			0: [], 
			1: [player], 
			2: [], 
			3: [], 
			4: [], 
			5: []
		},
		aggro: 0, 
		previousAggro: 0,
		getEntitiesAt(chunkX: number, chunkY: number): (Monster | Surface)[] {
			let result: (Monster | Surface)[];
			if( rect2Contains(activeTileArea, chunkX, chunkY) ) {
				let xm = numberPositiveMod(chunkX, CONST_ACTIVE_CHUNKS_WIDTH);
				let ym = numberPositiveMod(chunkY, CONST_ACTIVE_CHUNKS_HEIGHT);
				result = activeTiles[xm][ym];
			}
			return result;
		},
		getNearestEnemy:function(to: Monster, searchRadius?: number): Monster {
			let targetSide = to.side%2 + 1;
			return world.getNearest(to.x, to.y, targetSide, searchRadius);
		},	
		getNearest: function(x: number, y: number, targetSide: number, searchRadius?: number): Monster {        
			let targets = world.allEntities[targetSide];
			if( !searchRadius ) {
				searchRadius = CONST_ACTIVE_CHUNKS_DIMENSION_MIN * CONST_CHUNK_DIMENSION_MAX;
			}
			let result: Monster;
            let minDistanceSquared = searchRadius * searchRadius;
            targets.map(function(target) {
                let targetMonster = target as Monster;
                let dx = x - targetMonster.x;
                let dy = y - targetMonster.y;
                let dsq = dx*dx+dy*dy;
                if( dsq < minDistanceSquared || !minDistanceSquared ) {
                    result = targetMonster;
                    minDistanceSquared = dsq;
                }
            });
            // for( let target of targets ) {
            //     let targetMonster = target as Monster;
            //     let dx = x - targetMonster.x;
            //     let dy = y - targetMonster.y;
            //     let dsq = dx*dx+dy*dy;
            //     if( dsq < minDistanceSquared || !minDistanceSquared ) {
            //         result = targetMonster;
            //         minDistanceSquared = dsq;
            //         if( dsq < 1 ) {
            //             // close enough
            //             break;
            //         }
            //     }
            // }    
			return result;
		},
		addEntity: function(entity: Entity) {
			// is it actually in our bounds?
			let overlap: any;
			if( entity.entityType == -1 ) {
				overlap = rect2Contains(activeTileArea, entity.chunkX, entity.chunkY);
			} else {
				overlap = addEntityPosition(entity);
			}
			if( overlap ) {
				let entities = world.allEntities[entity.side];
				if( entities ) {
					entities.push(entity);
				} else {
					world.allEntities[entity.side] = [entity];
				}
				if( entity.entityType ) {
					world.updatableEntities.push(entity);
				}
			}
		},
		updateWorld: function(amt: number) {
			if( CONST_FIXED_STEP ) {
				let totalAmt = amt + bonusMillis;
				while( totalAmt >= CONST_FIXED_STEP ) {
					doUpdate(CONST_FIXED_STEP);
					totalAmt -= CONST_FIXED_STEP;
				}
				bonusMillis = totalAmt;    
			} else {
				doUpdate(amt);
			}
		}, 
		setCameraPosition: function(x: number, y: number, z: number, rotationX: number, rotationY: number, rotationZ: number) {

			world.cameraX = x;
			world.cameraY = y;
			world.cameraZ = z;
	
			world.cameraRotationX = rotationX;
			world.cameraRotationY = rotationY;
			world.cameraRotationZ = rotationZ;
	
			let minChunkX = floor(x/CONST_CHUNK_WIDTH - CONST_ACTIVE_CHUNKS_WIDTH / 2);
			let minChunkY = floor(y/CONST_CHUNK_HEIGHT - CONST_ACTIVE_CHUNKS_HEIGHT / 2);
			let maxChunkX = floor(x/CONST_CHUNK_WIDTH + CONST_ACTIVE_CHUNKS_WIDTH / 2) - 1;
			let maxChunkY = floor(y/CONST_CHUNK_HEIGHT + CONST_ACTIVE_CHUNKS_HEIGHT / 2) - 1;
	
			if( activeTileArea == null ) {
				// generate everything
				activeTileArea = {
					minimum: [minChunkX, minChunkY], 
					maximum: [maxChunkX, maxChunkY]
				}
				// generate the chunks
				for( let chunkX=minChunkX; chunkX<=maxChunkX; chunkX++) {
					for( let chunkY=minChunkY; chunkY<=maxChunkY; chunkY++) {
                        let entities = chunkGenerator(chunkX, chunkY, world);
                        entities.map(world.addEntity);
					}
				}
			} else if( FLAG_FOLLOW_CAMERA ) {
				if( minChunkX != activeTileArea.minimum[0] || minChunkY != activeTileArea.minimum[1] ) {
					let previousActiveTileArea = activeTileArea;
					// TODO work out which bits have fallen off the end and deactivate those entities
					// also remove any entities which are no longer on the map
					activeTileArea = {
						minimum: [minChunkX, minChunkY], 
						maximum: [maxChunkX, maxChunkY]
					}
					for( let chunkX=minChunkX; chunkX<=maxChunkX; chunkX++) {
						for( let chunkY=minChunkY; chunkY<=maxChunkY; chunkY++) {
							if( rect2Contains(previousActiveTileArea, chunkX, chunkY) ) {
								// TODO re-add any entities which might share the new area
	
							} else {
                                let toRemove = world.getEntitiesAt(chunkX, chunkY);
                                toRemove.map(function(entity) {
									if( !entity.entityType ) {
										let surface = entity as Surface;
										if( !rect2Contains(activeTileArea, surface.chunkX, surface.chunkY ) ) {
											removeEntity(surface);
										}
									}

                                });
								toRemove.length = 0;								
                                let entities = chunkGenerator(chunkX, chunkY, world);
                                entities.map(world.addEntity);
							}                     
						}
					}
				}
			}
		} 
	}

    world.setCameraPosition(player.x, player.y, player.z, 0, 0, 0); 
    addEntityPosition(player);

	return world;
}
