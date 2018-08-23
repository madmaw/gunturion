const MAX_STEPS = 9;
const ERROR_MARGIN = 1e-5;
const MAX_COLLISIONS = 3;

interface CollisionPhysics {
    (): void;
}

class World {
    activeMonsters: Monster[];
    allEntities: Entity[];
    activeTiles: Entity[][][];
    private activeTileArea: Rect2;
    

    cameraX: number;
    cameraY: number;
    cameraZ: number;

    cameraRotationX: number;
    cameraRotationY: number;
    cameraRotationZ: number;

    age: number;

    constructor(
        private activeTilesWidth: number, 
        private activeTilesHeight: number, 
        private chunkWidth: number, 
        private chunkHeight: number,
        private chunkGenerator: ChunkGenerator,
        private monsterCreator: MonsterGenerator, 
        private deathAnimationTime: number
        
    ) {
        this.activeTiles = array2dCreate(
            activeTilesWidth, 
            activeTilesHeight, 
            function() {
                return [];
            }
        );
        this.activeMonsters = [];
        this.allEntities = [];
        this.setCameraPosition(0, 0, 1, 0, 0, 0); 
        this.age = 0;
    }

    public update(amt: number) {
        

        this.age += amt;
        let i=this.activeMonsters.length;
        while( i ) {
            i--;
            let activeMonster = this.activeMonsters[i];


            activeMonster.age += amt;
            if( activeMonster.deathAge ) {
                if( activeMonster.age > activeMonster.deathAge + this.deathAnimationTime ) {
                    // remove 
                    this.removeEntity(activeMonster);
                }
            } else {
                let done = activeMonster.update(this, amt);

                console.log('starting update');
                console.log('original position', activeMonster.x, activeMonster.y, activeMonster.z);
                console.log('velocity', activeMonster.vx, activeMonster.vy, activeMonster.vz);        

                if( !activeMonster.ignoreGravity ) {
                    activeMonster.vz -= amt * .00001;
                }
                if( done ) {
                    // it wants to be removed
                    this.removeEntity(activeMonster);
                }
                let amtRemaining = amt;
                let collisionsRemaining = MAX_COLLISIONS;
                while( !done ) {
    
                    let originalX = activeMonster.x;
                    let originalY = activeMonster.y;
                    let originalZ = activeMonster.z;
    

                    this.removeEntityPosition(activeMonster); 

                    let dx = activeMonster.vx * amtRemaining;
                    let dy = activeMonster.vy * amtRemaining;
                    let dz = activeMonster.vz * amtRemaining;

                    activeMonster.x += dx;
                    activeMonster.y += dy;
                    activeMonster.z += dz;
        

                    // check for collisions
                    let bounds = activeMonster.bounds();
                    let minCollisionTime: number;
                    let minCollisionEntity: Entity;
                    let minCollisionPhysics: CollisionPhysics;
                    let suggestedPosition: Vector3;
    
                    this.iterateEntities(bounds, function(collisionEntity: Entity) {
                        if( collisionEntity == activeMonster) {
                            return;
                        }
                        let collisionTime: number;
                        let collisionPhysics: CollisionPhysics;
                        if( collisionEntity.isMonster ) {
                            if( collisionEntity.side != activeMonster.side ) {
                                let dx = collisionEntity.x - activeMonster.x;
                                let dy = collisionEntity.y - activeMonster.y;
                                let dz = collisionEntity.z - activeMonster.z;
                                let dsq = dx * dx + dy * dy + dz * dz;
                                let r = collisionEntity.radius + activeMonster.radius;
                                let velocitySquared = activeMonster.vx*activeMonster.vx + activeMonster.vy*activeMonster.vy + activeMonster.vz*activeMonster.vz;
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
                                let relativePosition = vector3TransformMatrix4(activeMonster.x, activeMonster.y, activeMonster.z, surface.worldToPoints);
                                let intersectionZ = relativePosition[2];
                                if( intersectionZ < activeMonster.radius ) {
                                    // velocity z should be negative (moving into the plane), if it's not, we can ignore this result
                                    let collisionClosestPoint: Vector2;
                                    let collisionRelativePosition = relativePosition;
                                    let relativeOrigin = vector3TransformMatrix4(originalX, originalY, originalZ, surface.worldToPoints);
                                    
                                    let velocity = vector3TransformMatrix4(activeMonster.vx, activeMonster.vy, activeMonster.vz, surface.worldToPointsRotation);
                                    let velocityZ = velocity[2];

                                    let overlap = activeMonster.radius - intersectionZ;
                                    // note: velocityZ should be negative here
                                    //let planeIntersectionTime = amtRemaining + overlap/velocityZ;
                                    let planeIntersectionTime = amtRemaining * (1 - overlap / (relativeOrigin[2] - relativePosition[2]));

                                    // check if we are starting inside the polygon
                                    let closestOriginPoint = vector2PolyEdgeOverlapsCircle(surface.points, relativeOrigin, activeMonster.radius);
                                    if( closestOriginPoint ) {
                                        let odx = closestOriginPoint[0] - relativeOrigin[0];
                                        let ody = closestOriginPoint[1] - relativeOrigin[1];
                                        let odz = relativeOrigin[2];
                                        let odsq = odx*odx+ody*ody+odz*odz
                                        if( odsq < activeMonster.radius*activeMonster.radius || vector2PolyContains(surface.points, relativeOrigin[0], relativeOrigin[1]) && odz < activeMonster.radius ) {
                                            console.warn('started colliding with polygon, this will end badly');
                                        }    
                                    }
                                    

                                    if( planeIntersectionTime <= amtRemaining ) {
                                        let relativeOrigin = vector3TransformMatrix4(originalX, originalY, originalZ, surface.worldToPoints);
                                        let planeIntersection = vector3Mix(relativePosition, relativeOrigin, planeIntersectionTime/amtRemaining);




                                        if( velocityZ < 0 && vector2PolyContains(surface.points, planeIntersection[0], planeIntersection[1]) && planeIntersectionTime > 0 ) {
                                            collisionTime = planeIntersectionTime - ERROR_MARGIN;
                                        } else {
                                            // are we actually overlapping the polygon
                                            let intersectionRadius = Math.sqrt(activeMonster.radius * activeMonster.radius - intersectionZ * intersectionZ);
    
                                            collisionClosestPoint = vector2PolyEdgeOverlapsCircle(surface.points, relativePosition, intersectionRadius);

                                            if( collisionClosestPoint || vector2PolyContains(surface.points, relativePosition[0], relativePosition[1] ) ) {
                                                // need to back this out
    
                                                let minTime = Math.max(0, planeIntersectionTime - ERROR_MARGIN);
                                                let maxTime = amtRemaining;
                                                for( let i=0; i<MAX_STEPS; i++ ) {
                                                    let testTime = (minTime + maxTime)/2;
                                                    let testRelativePosition = vector3TransformMatrix4(
                                                        originalX + testTime * activeMonster.vx, 
                                                        originalY + testTime * activeMonster.vy, 
                                                        originalZ + testTime * activeMonster.vz, 
                                                        surface.worldToPoints
                                                    );
                                                    // we know it intersects with the plane
                                                    let testIntersectionZ = testRelativePosition[2];
                                                    let testIntersectionRadius = Math.sqrt(activeMonster.radius * activeMonster.radius - testIntersectionZ * testIntersectionZ);
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
                                                            if( dx* dx + dy*dy + dz*dz < activeMonster.radius * activeMonster.radius ) {
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
                                                    let angleX = Math.acos(collisionRelativePosition[2] / activeMonster.radius);
                                                    console.log('angle z/x', angleZ, angleX);
                                                    console.log('collision time', minTime);
                                                    let toMatrix = matrix4MultiplyStack([matrix4Rotate(1, 0, 0, angleX), matrix4Rotate(0, 0, 1, angleZ), surface.worldToPointsRotation]);
                                                    let vx = activeMonster.vx;
                                                    let vy = activeMonster.vy;
                                                    let vz = activeMonster.vz;
                                                    let velocity = vector3TransformMatrix4(vx, vy, vz, toMatrix);                                            
                                                    if( velocity[2] < 0 ) {
                                                        collisionTime = minTime;
                                                    }

                                                    if( minTime == 0 ) {
                                                        console.log('should bounce off');
                                                        // suggestedPosition = vector3TransformMatrix4(planeIntersection[0], planeIntersection[1], activeMonster.radius, surface.pointsToWorld);
                                                    }
                                                } else {
                                                    // all these should be legit
                                                    collisionTime = minTime;
                                                }
        
        
                                            }
                                        }
                                        collisionPhysics = function() {
                                            let vx = activeMonster.vx;
                                            let vy = activeMonster.vy;
                                            let vz = activeMonster.vz;
                                            let restitution = activeMonster.restitution;
    
                                            let toMatrix: Matrix4;
                                            let fromMatrix: Matrix4;
                                            if( collisionClosestPoint ) {
                                                // bounce off closest point at angle
                                                console.log('closest collision point', collisionClosestPoint);
                                                console.log('collision relative position', collisionRelativePosition);
                                                console.log('dx/dy', collisionClosestPoint[0] - collisionRelativePosition[0], collisionClosestPoint[1] - collisionRelativePosition[1]);
                                                
                                                let angleZ = Math.atan2(
                                                    collisionClosestPoint[1] - collisionRelativePosition[1], 
                                                    collisionClosestPoint[0] - collisionRelativePosition[0]
                                                ) - Math.PI/2;
                                                let angleX = Math.acos(collisionRelativePosition[2] / activeMonster.radius);
                                                console.log('angle z/x', angleZ, angleX);
                                                console.log('collision time', minCollisionTime);
                                                toMatrix = matrix4MultiplyStack([matrix4Rotate(1, 0, 0, angleX), matrix4Rotate(0, 0, 1, angleZ), surface.worldToPointsRotation]);
                                                fromMatrix = matrix4MultiplyStack([matrix4Rotate(0, 0, 1, -angleZ), matrix4Rotate(1, 0, 0, -angleX), surface.pointsToWorldRotation]);
                                            } else {
                                                toMatrix = surface.worldToPointsRotation;
                                                fromMatrix = surface.pointsToWorldRotation;
                                            }
                                            let velocity = vector3TransformMatrix4(vx, vy, vz, toMatrix);                                            
                                            // always bounce back a bit
                                            let result = vector3TransformMatrix4(velocity[0], velocity[1], velocity[2] * -restitution, fromMatrix);
                                            if( collisionClosestPoint ) {
                                                console.log("result", result);
                                            }
                                            if( minCollisionTime <= 0 || minCollisionTime > amtRemaining ) {
                                                console.log("uh oh!!!", velocity);
                                            }
                                            activeMonster.vx = result[0];
                                            activeMonster.vy = result[1];
                                            activeMonster.vz = result[2];
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
                            activeMonster.x = originalX + activeMonster.vx * minCollisionTime;
                            activeMonster.y = originalY + activeMonster.vy * minCollisionTime;
                            activeMonster.z = originalZ + activeMonster.vz * minCollisionTime;     
                            amtRemaining -= minCollisionTime;    
                        } else if ( suggestedPosition ) {
                            // console.log('adjusting', activeMonster.x, activeMonster.y, activeMonster.z, suggestedPosition, minCollisionTime);
                            // activeMonster.x = suggestedPosition[0];
                            // activeMonster.y = suggestedPosition[1];
                            // activeMonster.z = suggestedPosition[2];
                        }
                        
                        if( minCollisionEntity.isMonster ) {
                            this.enactCollision(activeMonster, minCollisionEntity);
                            this.enactCollision(minCollisionEntity, activeMonster);
                            // if it's dead, remove it
                            if( minCollisionEntity.deathAge ) {
                                this.removeEntityPosition(minCollisionEntity);
                            }
                        } else {
                            //activeMonster.vx = activeMonster.vy = activeMonster.vz = 0;
                            // bounce
                            let surface = minCollisionEntity as Surface;
                            activeMonster.onCollision(minCollisionEntity);
                        }
                        if( minCollisionPhysics ) {
                            minCollisionPhysics();
                        }
                        done = activeMonster.deathAge || amtRemaining <= ERROR_MARGIN && collisionsRemaining--;
                    } else {
                        this.addEntityPosition(activeMonster);
                        done = true;
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

        let minTileX = Math.floor(x);
        let minTileY = Math.floor(y);
        let maxTileX = Math.floor(x + this.activeTilesWidth);
        let maxTileY = Math.floor(y + this.activeTilesHeight);

        if( this.activeTileArea == null ) {
            // generate everything
            this.activeTileArea = {
                min: [minTileX, minTileY], 
                max: [maxTileX, maxTileY]
            }
            // generate the chunks
            for( let chunkX=Math.floor(minTileX/this.chunkWidth); chunkX<Math.floor(maxTileX/this.chunkWidth); chunkX++) {
                for( let chunkY=Math.floor(minTileY/this.chunkHeight); chunkY<Math.floor(maxTileY/this.chunkHeight); chunkY++) {
                    let entities = this.chunkGenerator(chunkX, chunkY);
                    for( let entity of entities ) {
                        this.addEntity(entity);
                    }
                }
            }
        } else {
            // TODO work out which bits have fallen off the end and deactivate those entities
            // also re-add any entities which might share the new area
            // also remove any entities which are no longer on the map
        }
    }

    public addEntity(entity: Entity) {
        // is it actually in our bounds?
        let overlap = this.addEntityPosition(entity);
        if( overlap ) {
            this.allEntities.push(entity);
            if( entity.isMonster ) {
                this.activeMonsters.push(entity);
            }
        }
    }

    public addEntityPosition(entity: Entity): Rect2 {
        return this.iterateTiles(entity.bounds(), function(entities: Entity[]) {
            entities.push(entity);
        });
    }

    

    public removeEntity(entity: Entity) {
        if( entity.isMonster ) {
            arrayRemove(this.activeMonsters, entity);
        }
        arrayRemove(this.allEntities, entity);
        this.removeEntityPosition(entity);
        if( FLAG_CLEAN_UP_ENTITY ) {
            entity.cleanup();
        } 
    }

    public removeEntityPosition(entity: Entity) {
        return this.iterateTiles(entity.bounds(), function(entities: Entity[]) {
            arrayRemove(entities, entity);
        });
    }

    private iterateEntities(bounds: Rect2, f: (entity: Entity) => void ) {
        // let iteratedEntities: {[_:number]: number} = {};
        // this.iterateTiles(bounds, function(entities: Entity[]) {
        //     for( let entity of entities ) {
        //         if( !iteratedEntities[entity.id] ) {
        //             f(entity);
        //             iteratedEntities[entity.id] = 1;
        //         }
        //     }
        // });
        this.allEntities.forEach(f);
    }

    private iterateTiles(bounds: Rect2, f: (entities: Entity[], tileX?: number, tileY?: number) => void ): Rect2 {
        let overlap = rect2Overlap(bounds, this.activeTileArea);
        if( overlap ) {
            let minTileX = Math.min(this.activeTilesWidth - 1, Math.max(0, Math.floor(overlap.min[0] - this.activeTileArea.min[0])));
            let minTileY = Math.min(this.activeTilesWidth - 1, Math.max(0, Math.floor(overlap.min[1] - this.activeTileArea.min[1])));
            let maxTileX = Math.min(this.activeTilesWidth - 1, Math.max(0, Math.floor(overlap.max[0] - this.activeTileArea.min[0])));
            let maxTileY = Math.min(this.activeTilesWidth - 1, Math.max(0, Math.floor(overlap.max[1] - this.activeTileArea.min[1])));
    
            for( let x=minTileX; x<=maxTileX; x++ ) {
                for( let y=minTileY; y<=maxTileY; y++ ) {
                    f(this.activeTiles[x][y], x, y);
                }
            }
        }
        return overlap;
    }

}

