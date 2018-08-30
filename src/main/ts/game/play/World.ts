const MAX_STEPS = 9;
const ERROR_MARGIN = 1e-5;
const MAX_COLLISIONS = 3;

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
    bonusMillis: number;

    private chunkDimensions: Vector2;

    constructor(
        private activeChunksWidth: number, 
        private activeChunksHeight: number, 
        private chunkWidth: number, 
        private chunkHeight: number,
        private chunkGenerator: ChunkGenerator,
        private monsterCreator: MonsterGenerator, 
        private deathAnimationTime: number
        
    ) {
        this.activeTiles = array2dCreate(
            activeChunksWidth, 
            activeChunksHeight, 
            function() {
                return [];
            }
        );
        this.updatableEntities = [];
        this.allEntities = [];
        this.age = 0;
        this.bonusMillis = 0;
        this.chunkDimensions = [chunkWidth, chunkHeight];
        this.setCameraPosition(0, 0, 1, 0, 0, 0); 
    }

    public update(amt: number) {
        if( FLAG_FIXED_STEP ) {
            let totalAmt = amt + this.bonusMillis;
            while( totalAmt >= FLAG_FIXED_STEP ) {
                this.doUpdate(FLAG_FIXED_STEP);
                totalAmt -= FLAG_FIXED_STEP;
            }
            this.bonusMillis = totalAmt;    
        } else {
            this.doUpdate(amt);
        }
    }

    public doUpdate(amt: number) {
        this.age += amt;
        let i=this.updatableEntities.length;
        while( i ) {
            i--;
            let updatableEntity = this.updatableEntities[i];

            updatableEntity.age += amt;
            if( updatableEntity.type == 1 && updatableEntity.deathAge ) {
                if( updatableEntity.age > updatableEntity.deathAge + this.deathAnimationTime ) {
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
                let done = updatableEntity.update(this, amt);

                // console.log('starting update');
                // console.log('original position', activeMonster.x, activeMonster.y, activeMonster.z);
                // console.log('velocity', activeMonster.vx, activeMonster.vy, activeMonster.vz);        
                if( done ) {
                    // it wants to be removed
                    this.removeEntity(updatableEntity);
                }

                if( updatableEntity.type == 1 ) {
                    updatableEntity.vz -= amt * .00005 * updatableEntity.gravityMultiplier;
                    let amtRemaining = amt;
                    let collisionsRemaining = MAX_COLLISIONS;
                    let updatableMonster = updatableEntity as Monster;

                    while( !done ) {
        
                        let originalX = updatableEntity.x;
                        let originalY = updatableEntity.y;
                        let originalZ = updatableEntity.z;

                        this.removeEntityPosition(updatableEntity); 

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
                        let suggestedPosition: Vector3;
        
                        this.iterateEntities(bounds, function(collisionEntity: Entity) {
                            let collisionTime: number;
                            let collisionPhysics: CollisionPhysics;
                            if( collisionEntity.type ) {
                                let monster = collisionEntity as Monster;
                                if( monster.side != updatableEntity.side ) {
                                    let dx = monster.x - updatableMonster.x;
                                    let dy = monster.y - updatableMonster.y;
                                    let dz = monster.z - updatableMonster.z;
                                    let dsq = dx * dx + dy * dy + dz * dz;
                                    let r = monster.radius + updatableMonster.radius;
                                    let velocitySquared = updatableMonster.vx*updatableMonster.vx + updatableMonster.vy*updatableMonster.vy + updatableMonster.vz*updatableMonster.vz;
                                    if( dsq < r * r && velocitySquared ) {
                                        // they're overlapping
                                        let d = Math.sqrt(dsq);
                                        // note that the time we calculate here probably isn't technically correct because both objects are moving, but it doesn't matter
                                        let overlap = r - d;
                                        // how long does it take to move overlap at our velocity?
                                        let velocity = Math.sqrt(velocitySquared);
                                        collisionTime = amt - overlap/velocity - ERROR_MARGIN;
                                        collisionPhysics = null;    
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
                                                    // kill it
                                                    updatableMonster.deathAge = updatableEntity.age;
                                                }    
                                            }                                        
                                        }

                                        if( planeIntersectionTime <= amtRemaining ) {
                                            let relativeOrigin = vector3TransformMatrix4(originalX, originalY, originalZ, surface.worldToPoints);
                                            let planeIntersection = vector3Mix(relativePosition, relativeOrigin, planeIntersectionTime/amtRemaining);

                                            if( velocityZ < 0 && vector2PolyContains(surface.points, planeIntersection[0], planeIntersection[1]) && planeIntersectionTime > 0 ) {
                                                collisionTime = planeIntersectionTime - ERROR_MARGIN;
                                            } else {
                                                // are we actually overlapping the polygon
                                                let intersectionRadius = Math.sqrt(updatableMonster.radius * updatableMonster.radius - intersectionZ * intersectionZ);
        
                                                collisionClosestPoint = vector2PolyEdgeOverlapsCircle(surface.points, relativePosition, intersectionRadius);

                                                if( collisionClosestPoint || vector2PolyContains(surface.points, relativePosition[0], relativePosition[1] ) ) {
                                                    // need to back this out
        
                                                    let minTime = Math.max(0, planeIntersectionTime - ERROR_MARGIN);
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

                                                        let collisionX = originalX + vx * minTime;
                                                        let collisionY = originalY + vy * minTime;
                                                        let collisionZ = originalZ + vz * minTime;

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
                            // move entity back to collision time
                            if( minCollisionTime >= 0 ) {
                                updatableEntity.x = originalX + updatableEntity.vx * minCollisionTime;
                                updatableEntity.y = originalY + updatableEntity.vy * minCollisionTime;
                                updatableEntity.z = originalZ + updatableEntity.vz * minCollisionTime;     
                                amtRemaining -= minCollisionTime;    
                            } else if ( suggestedPosition ) {
                                // console.log('adjusting', activeMonster.x, activeMonster.y, activeMonster.z, suggestedPosition, minCollisionTime);
                                // activeMonster.x = suggestedPosition[0];
                                // activeMonster.y = suggestedPosition[1];
                                // activeMonster.z = suggestedPosition[2];
                            }
                            
                            if( minCollisionEntity.type ) {
                                let monster = minCollisionEntity as Monster;
                                this.enactCollision(updatableEntity, monster);
                                this.enactCollision(monster, updatableEntity);
                                // if it's dead, remove it
                                if( monster.deathAge ) {
                                    this.removeEntityPosition(monster);
                                }
                            } else {
                                //activeMonster.vx = activeMonster.vy = activeMonster.vz = 0;
                                // bounce
                                let surface = minCollisionEntity as Surface;
                                updatableEntity.onCollision(minCollisionEntity);
                            }
                            if( minCollisionPhysics ) {
                                minCollisionPhysics();
                            }
                            done = !collisionsRemaining-- || amtRemaining <= ERROR_MARGIN || updatableEntity.deathAge;
                        } else {
                            this.addEntityPosition(updatableEntity);
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

    private enactCollision(monster: Monster, withMonster: Monster) {
        monster.onCollision(withMonster);
        monster.vx = monster.vy = monster.vz = 0;
    }

    public setCameraPosition(x: number, y: number, z: number, rotationX: number, rotationY: number, rotationZ: number) {

        this.cameraX = x;
        this.cameraY = y;
        this.cameraZ = z;

        this.cameraRotationX = rotationX;
        this.cameraRotationY = rotationY;
        this.cameraRotationZ = rotationZ;

        let minChunkX = Math.floor(x/this.chunkWidth - this.activeChunksWidth / 2);
        let minChunkY = Math.floor(y/this.chunkHeight - this.activeChunksHeight / 2);
        let maxChunkX = Math.floor(x/this.chunkWidth + this.activeChunksWidth / 2) - 1;
        let maxChunkY = Math.floor(y/this.chunkHeight + this.activeChunksHeight / 2) - 1;

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
                    f(entity);
                    iteratedEntities[entity.id] = 1;
                }
            }
        });
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
                    f(this.getEntitiesAt(x, y), x, y);
                }
            }
        }
        return overlap;
    }

    public getEntitiesAt(chunkX: number, chunkY: number): (Monster | Surface)[] {
        let result: (Monster | Surface)[];
        if( rect2Contains(this.activeTileArea, chunkX, chunkY) ) {
            let xm = numberPositiveMod(chunkX, this.activeChunksWidth);
            let ym = numberPositiveMod(chunkY, this.activeChunksHeight);
            result = this.activeTiles[xm][ym];
        }
        return result;
    }

}

