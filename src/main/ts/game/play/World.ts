const MAX_STEPS = 9;

interface CollisionPhysics {
    (): void;
}

class World {
    updatableEntities: (Monster | Building)[];
    allEntities: {[_: number]: Entity[]};
    activeTiles: (Monster | Surface)[][][];
    private activeTileArea: Rect2;
    

    cameraX: number;
    cameraY: number;
    cameraZ: number;

    cameraRotationX: number;
    cameraRotationY: number;
    cameraRotationZ: number;

    age: number;
    ticks: number;
    bonusMillis: number;

    public aggro: number;
    public previousAggro: number;

    private chunkDimensions: Vector2;

    constructor(
        private chunkGenerator: ChunkGenerator,
        private monsterCreator: MonsterGenerator,
        cameraPosition: Vector3        
    ) {
        this.activeTiles = array2dCreate(
            CONST_ACTIVE_CHUNKS_WIDTH, 
            CONST_ACTIVE_CHUNKS_HEIGHT, 
            function() {
                return [];
            }
        );
        this.updatableEntities = [];
        this.allEntities = {
            0: [], 
            1: [], 
            2: [], 
            3: [], 
            4: [], 
            5: []
        };
        this.age = 0;
        this.ticks = 0;
        this.bonusMillis = 0;
        this.chunkDimensions = [CONST_CHUNK_WIDTH, CONST_CHUNK_HEIGHT];
        this.setCameraPosition(cameraPosition[0], cameraPosition[1], cameraPosition[2], 0, 0, 0); 
    }

    public updateWorld(amt: number) {
        if( CONST_FIXED_STEP ) {
            let totalAmt = amt + this.bonusMillis;
            while( totalAmt >= CONST_FIXED_STEP ) {
                this.doUpdate(CONST_FIXED_STEP);
                totalAmt -= CONST_FIXED_STEP;
            }
            this.bonusMillis = totalAmt;    
        } else {
            this.doUpdate(amt);
        }
    }

    public doUpdate(amt: number) {
        this.previousAggro = this.aggro;
        this.aggro = 0;
        this.age += amt;
        this.ticks++;
        let i=this.updatableEntities.length;
        while( i ) {
            i--;
            let updatableEntity = this.updatableEntities[i];

            updatableEntity.age += amt;
            if( updatableEntity.type == 1 && updatableEntity.deathAge ) {
                if( updatableEntity.age > updatableEntity.deathAge + CONST_DEATH_ANIMATION_TIME ) {
                    // remove 
                    this.removeEntity(updatableEntity);
                }
            } else if( 
                updatableEntity.type == 1 && !rect2Overlap(updatableEntity.bounds(), this.activeTileArea, this.chunkDimensions) || 
                updatableEntity.type == -1 && !rect2Contains(this.activeTileArea, updatableEntity.chunkX, updatableEntity.chunkY)
            ) {
                // it's outside the active area, kill it
                this.removeEntity(updatableEntity);
            } else {
                let done = updatableEntity.onUpdate(this, amt);

                // console.log('starting update');
                // console.log('original position', activeMonster.x, activeMonster.y, activeMonster.z);
                // console.log('velocity', activeMonster.vx, activeMonster.vy, activeMonster.vz);        
                if( done ) {
                    // it wants to be removed
                    this.removeEntity(updatableEntity);
                }

                if( updatableEntity.type == 1 ) {
                    updatableEntity.vz -= amt * CONST_GRAVITY_ACCELERATION * updatableEntity.gravityMultiplier;
                    let amtRemaining = amt;
                    let collisionsRemaining = CONST_MAX_COLLISIONS;
                    let updatableMonster = updatableEntity as Monster;
                    let maxVelocity = updatableMonster.radius * 2/amt;
                    let maxVelocitySquared = maxVelocity * maxVelocity;

                    let previousCollisionEntityId: number;

                    while( !done ) {
        
                        let originalX = updatableEntity.x;
                        let originalY = updatableEntity.y;
                        let originalZ = updatableEntity.z;

                        this.removeEntityPosition(updatableEntity); 

                        // ensure velocity is sensible
                        if(FLAG_CHECK_MAX_VELOCITY ) {
                            let velocitySquared = updatableEntity.vx * updatableEntity.vx + updatableEntity.vy * updatableEntity.vy + updatableEntity.vz * updatableEntity.vz;
                            if( velocitySquared > maxVelocitySquared ) {
                                let velocity = Math.sqrt(velocitySquared);

                                if( FLAG_WARN_MAX_VELOCITY_EXCEEDED ) {
                                    console.warn('maximum velocity exceeded', velocity, maxVelocity, updatableEntity);
                                }

                                updatableEntity.vx *= maxVelocity/velocity;
                                updatableEntity.vy *= maxVelocity/velocity;
                                updatableEntity.vz *= maxVelocity/velocity;
                                
                            }    
                        }
                        
                        let dx = updatableEntity.vx * amtRemaining;
                        let dy = updatableEntity.vy * amtRemaining;
                        let dz = updatableEntity.vz * amtRemaining;


                        updatableEntity.x += dx;
                        updatableEntity.y += dy;
                        updatableEntity.z += dz;
            

                        // check for collisions
                        let bounds = updatableEntity.bounds();
                        let minCollisionTime: number;
                        let minCollisionEntity: Entity;
                        let minCollisionPhysics: CollisionPhysics;
        
                        this.iterateEntities(bounds, function(this: World, collisionEntity: Entity) {
                            let collisionTime: number;
                            let collisionPhysics: CollisionPhysics;
                            if( collisionEntity.type ) {
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
                                            let d = Math.sqrt(dsq);
                                            // note that the time we calculate here probably isn't technically correct because both objects are moving, but it doesn't matter
                                            let overlap = r - d;
                                            // how long does it take to move overlap at our velocity?
                                            let velocity = Math.sqrt(velocitySquared);
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
                                                        let angle = Math.acos(vector3DotProduct(to, d));
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
                                                            let restitution = Math.max(monster.restitution, updatableMonster.restitution);
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
                                            monster.onCollision(this, updatableEntity);
                                            if( monster.deathAge ) {
                                                this.removeEntityPosition(monster);
                                            }
                                            updatableMonster.onCollision(this, monster);
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
                                    if( Math.abs(intersectionZ) < updatableMonster.radius ) {
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
                                                    updatableMonster.die(this);
                                                }    
                                            }                                        
                                        }

                                        if( planeIntersectionTime <= amtRemaining ) {
                                            let relativeOrigin = vector3TransformMatrix4(originalX, originalY, originalZ, surface.worldToPoints);
                                            let planeIntersection = vector3Mix(relativePosition, relativeOrigin, planeIntersectionTime/amtRemaining);

                                            if( velocityZ < 0 && vector2PolyContains(surface.points, planeIntersection[0], planeIntersection[1]) && planeIntersectionTime > 0 ) {
                                                collisionTime = planeIntersectionTime - CONST_SMALL_NUMBER;
                                            } else {
                                                // are we actually overlapping the polygon
                                                let intersectionRadius = Math.sqrt(updatableMonster.radius * updatableMonster.radius - intersectionZ * intersectionZ);
        
                                                collisionClosestPoint = vector2PolyEdgeOverlapsCircle(surface.points, relativePosition, intersectionRadius);

                                                if( collisionClosestPoint || vector2PolyContains(surface.points, relativePosition[0], relativePosition[1] ) ) {
                                                    // need to back this out
        
                                                    let minTime = Math.max(0, planeIntersectionTime - CONST_SMALL_NUMBER);
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
                                                        let testIntersectionRadius = Math.sqrt(updatableMonster.radius * updatableMonster.radius - testIntersectionZ * testIntersectionZ);
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
                                                        let angleZ = Math.atan2(
                                                            collisionClosestPoint[1] - collisionRelativePosition[1], 
                                                            collisionClosestPoint[0] - collisionRelativePosition[0]
                                                        ) - Math.PI/2;
                                                        let angleX = Math.acos(collisionRelativePosition[2] / updatableMonster.radius);
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
                                                    
                                                    let angleZ = Math.atan2(
                                                        collisionClosestPoint[1] - collisionRelativePosition[1], 
                                                        collisionClosestPoint[0] - collisionRelativePosition[0]
                                                    ) - Math.PI/2;
                                                    let angleX = Math.acos(collisionRelativePosition[2] / updatableMonster.radius);
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
                        });
        
                        if( minCollisionTime != null ) {
                            if( FLAG_DETECT_MULTIPLE_COLLISIONS ) {
                                let id = (minCollisionEntity as Bounded).id
                                if( id == previousCollisionEntityId && minCollisionEntity.type == 0 ) {
                                    console.warn('already just collided with this surface', updatableEntity, minCollisionEntity);
                                }
                                previousCollisionEntityId = id;
                            }
                            // move entity back to collision time   
                            let backTo = Math.max(0, minCollisionTime);
                            updatableEntity.x = originalX + updatableEntity.vx * backTo;
                            updatableEntity.y = originalY + updatableEntity.vy * backTo;
                            updatableEntity.z = originalZ + updatableEntity.vz * backTo;     
                            amtRemaining -= backTo;    

                            if( minCollisionEntity.type && FLAG_SPHERE_PHYSICS ) {
                                let monster = minCollisionEntity as Monster;
                                updatableEntity.onCollision(this, monster);
                                monster.onCollision(this, updatableEntity);
                                // if it's dead, remove it
                                if( monster.deathAge ) {
                                    this.removeEntityPosition(monster);
                                }
                            } else {
                                //activeMonster.vx = activeMonster.vy = activeMonster.vz = 0;
                                // bounce
                                let surface = minCollisionEntity as Surface;
                                if( surface.onCollision ) {
                                    surface.onCollision(this, updatableEntity);                                    
                                }
                                updatableEntity.onCollision(this, minCollisionEntity);
                            }
                            if( minCollisionPhysics ) {
                                minCollisionPhysics();
                            }
                            done = !collisionsRemaining-- || amtRemaining <= CONST_SMALL_NUMBER || updatableEntity.deathAge;
                        } else {
                            if( !updatableMonster.deathAge ) {
                                this.addEntityPosition(updatableMonster);
                                // check that we are near the camera
                                if( updatableMonster.sound ) {
                                    let dx = this.cameraX - updatableMonster.x;
                                    let dy = this.cameraY - updatableMonster.y;
                                    let dz = this.cameraZ - updatableMonster.z;
                                    let dsq = dx*dx+dy*dy+dz*dz;
                                    if( dsq < CONST_MAX_SOUND_RADIUS_SQUARED * updatableMonster.radius * updatableMonster.radius * CONST_RADIUS_SOUND_VOLUME_RATIO_SQUARED) {
                                        updatableMonster.sound.start(updatableMonster.x, updatableMonster.y, updatableMonster.z);                                        
                                    } else {
                                        updatableMonster.sound.stop();
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

    public setCameraPosition(x: number, y: number, z: number, rotationX: number, rotationY: number, rotationZ: number) {

        this.cameraX = x;
        this.cameraY = y;
        this.cameraZ = z;

        this.cameraRotationX = rotationX;
        this.cameraRotationY = rotationY;
        this.cameraRotationZ = rotationZ;

        let minChunkX = Math.floor(x/CONST_CHUNK_WIDTH - CONST_ACTIVE_CHUNKS_WIDTH / 2);
        let minChunkY = Math.floor(y/CONST_CHUNK_HEIGHT - CONST_ACTIVE_CHUNKS_HEIGHT / 2);
        let maxChunkX = Math.floor(x/CONST_CHUNK_WIDTH + CONST_ACTIVE_CHUNKS_WIDTH / 2) - 1;
        let maxChunkY = Math.floor(y/CONST_CHUNK_HEIGHT + CONST_ACTIVE_CHUNKS_HEIGHT / 2) - 1;

        if( this.activeTileArea == null ) {
            // generate everything
            this.activeTileArea = {
                min: [minChunkX, minChunkY], 
                max: [maxChunkX, maxChunkY]
            }
            // generate the chunks
            for( let chunkX=minChunkX; chunkX<=maxChunkX; chunkX++) {
                for( let chunkY=minChunkY; chunkY<=maxChunkY; chunkY++) {
                    let entities = this.chunkGenerator(chunkX, chunkY);
                    for( let entity of entities ) {
                        this.addEntity(entity);
                    }
                }
            }
        } else if( FLAG_FOLLOW_CAMERA ) {
            if( minChunkX != this.activeTileArea.min[0] || minChunkY != this.activeTileArea.min[1] ) {
                let previousActiveTileArea = this.activeTileArea;
                // TODO work out which bits have fallen off the end and deactivate those entities
                // also remove any entities which are no longer on the map
                this.activeTileArea = {
                    min: [minChunkX, minChunkY], 
                    max: [maxChunkX, maxChunkY]
                }
                for( let chunkX=minChunkX; chunkX<=maxChunkX; chunkX++) {
                    for( let chunkY=minChunkY; chunkY<=maxChunkY; chunkY++) {
                        if( rect2Contains(previousActiveTileArea, chunkX, chunkY) ) {
                            // TODO re-add any entities which might share the new area

                        } else {
                            let toRemove = this.getEntitiesAt(chunkX, chunkY);
                            for( let entity of toRemove ) {
                                if( !entity.type ) {
                                    let surface = entity as Surface;
                                    if( !rect2Contains(this.activeTileArea, surface.chunkX, surface.chunkY ) ) {
                                        this.removeEntity(surface);
                                    }
                                }
                            }
                            toRemove.splice(0, toRemove.length);
                            
                            let entities = this.chunkGenerator(chunkX, chunkY);
                            for( let entity of entities ) {
                                this.addEntity(entity);
                            }    
                        }                     
                    }
                }
            }
        }
    }

    public addEntity(entity: Entity) {
        // is it actually in our bounds?
        let overlap: any;
        if( entity.type == -1 ) {
            overlap = rect2Contains(this.activeTileArea, entity.chunkX, entity.chunkY);
        } else {
            overlap = this.addEntityPosition(entity);
        }
        if( overlap ) {
            let entities = this.allEntities[entity.side];
            if( entities ) {
                entities.push(entity);
            } else {
                this.allEntities[entity.side] = [entity];
            }
            if( entity.type ) {
                this.updatableEntities.push(entity);
            }
        }
    }

    public addEntityPosition(entity: Monster | Surface): Rect2 {
        return this.iterateTiles(entity.bounds(), function(entities: Entity[]) {
            entities.push(entity);
        });
    }

    

    public removeEntity(entity: Entity) {
        if( entity.type ) {
            arrayRemove(this.updatableEntities, entity);
            if( entity.type == 1 && entity.sound ) {
                entity.sound.stop();
            }
        }
        let sideEntities = this.allEntities[entity.side];
        if( sideEntities ) {
            arrayRemove(sideEntities, entity);
        }
        if( entity.type != -1 ) {
            this.removeEntityPosition(entity);
        }
        if( FLAG_CLEAN_UP_ENTITY ) {
            entity.cleanup();
        } 
    }

    public removeEntityPosition(entity: Monster | Surface) {
        return this.iterateTiles(entity.bounds(), function(entities: Entity[]) {
            arrayRemove(entities, entity);
        });
    }

    private iterateEntities(bounds: Rect2, f: (entity: Monster | Surface) => void ) {
        let iteratedEntities: {[_:number]: number} = {};
        this.iterateTiles(bounds, function(entities: (Monster | Surface)[]) {
            for( let entity of entities ) {
                if( !iteratedEntities[entity.id] ) {
                    f.call(this, entity);
                    iteratedEntities[entity.id] = 1;
                }
            }
        });
    }

    public getNearestEnemy(to: Monster, searchRadius?: number): Monster {
        let targetSide = to.side%2 + 1;
        return this.getNearest(to.x, to.y, targetSide, searchRadius);
    } 

    public getNearest(x: number, y: number, targetSide: number, searchRadius?: number): Monster {        
        let targets = this.allEntities[targetSide];
        if( !searchRadius ) {
            searchRadius = CONST_ACTIVE_CHUNKS_DIMENSION_MIN * CONST_CHUNK_DIMENSION_MAX;
        }
        let result: Monster;
        let minDistanceSquared = searchRadius * searchRadius;
        if( targets.length ) {
            for( let target of targets ) {
                let targetMonster = target as Monster;
                let dx = x - targetMonster.x;
                let dy = y - targetMonster.y;
                let dsq = dx*dx+dy*dy;
                if( dsq < minDistanceSquared || !minDistanceSquared ) {
                    result = targetMonster;
                    minDistanceSquared = dsq;
                    if( dsq < 1 ) {
                        // close enough
                        break;
                    }
                }
            }    
        }
        return result;
    }

    private iterateTiles(bounds: Rect2, f: (entities: (Monster | Surface)[], tileX?: number, tileY?: number) => void ): Rect2 {
        let overlap = rect2Overlap(bounds, this.activeTileArea, this.chunkDimensions);
        if( overlap ) {
            let minTileX = overlap.min[0];
            let minTileY = overlap.min[1];
            let maxTileX = overlap.max[0];
            let maxTileY = overlap.max[1];
            
            for( let x=minTileX; x<=maxTileX; x++ ) {
                for( let y=minTileY; y<=maxTileY; y++ ) {
                    
                    f.call(this, this.getEntitiesAt(x, y), x, y);
                }
            }
        }
        return overlap;
    }

    public getEntitiesAt(chunkX: number, chunkY: number): (Monster | Surface)[] {
        let result: (Monster | Surface)[];
        if( rect2Contains(this.activeTileArea, chunkX, chunkY) ) {
            let xm = numberPositiveMod(chunkX, CONST_ACTIVE_CHUNKS_WIDTH);
            let ym = numberPositiveMod(chunkY, CONST_ACTIVE_CHUNKS_HEIGHT);
            result = this.activeTiles[xm][ym];
        }
        return result;
    }

}

