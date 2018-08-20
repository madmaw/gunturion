const MAX_STEPS = 9;

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
        let averageError = Math.pow(2, -30);

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
                } else {
                    // still apply velocity
                    activeMonster.x += activeMonster.vx * amt;
                    activeMonster.y += activeMonster.vy * amt;
                    activeMonster.z += activeMonster.vz * amt;
                }
            } else {
                if( !activeMonster.ignoreGravity ) {
                    activeMonster.vz -= amt * .00001;
                }
                let done: boolean = activeMonster.update(this, amt);
                if( done ) {
                    // it wants to be removed
                    this.removeEntity(activeMonster);
                }
                let amtRemaining = amt;
                while( !done ) {
    
                    let originalX = activeMonster.x;
                    let originalY = activeMonster.y;
                    let originalZ = activeMonster.z;
    
                    this.removeEntityPosition(activeMonster);
    
                    activeMonster.x += activeMonster.vx * amtRemaining;
                    activeMonster.y += activeMonster.vy * amtRemaining;
                    activeMonster.z += activeMonster.vz * amtRemaining;
        

                    // check for collisions
                    let bounds = activeMonster.bounds();
                    let minCollisionTime: number;
                    let minCollisionEntity: Entity;
                    let suggestedPosition: Vector3;
    
                    this.iterateEntities(bounds, function(collisionEntity: Entity) {
                        let collisionTime: number;
                        if( collisionEntity.isMonster ) {
                            if( collisionEntity.side != activeMonster.side ) {
                                let dx = collisionEntity.x - activeMonster.x;
                                let dy = collisionEntity.y - activeMonster.y;
                                let dz = collisionEntity.z - activeMonster.z;
                                let dsq = dx * dx + dy * dy + dz * dz;
                                let r = collisionEntity.radius + activeMonster.radius;
                                if( dsq < r * r ) {
                                    // they're overlapping
                                    let d = Math.sqrt(dsq);
                                    // note that the time we calculate here probably isn't technically correct because both objects are moving, but it doesn't matter
                                    let overlap = r - d;
                                    // how long does it take to move overlap at our velocity?
                                    let velocity = Math.sqrt(activeMonster.vx*activeMonster.vx + activeMonster.vy*activeMonster.vy + activeMonster.vz*activeMonster.vz);
                                    collisionTime = amt - overlap/velocity - averageError;
                                }
                            }
                        } else {
                            let surface = collisionEntity as Surface;
                            // does it overlap?
                            if( rect3Overlap(surface.bounds(), bounds) ) {
                                // is the sphere overlapping the plane?
                                let target = vector3TransformMatrix4(activeMonster.x, activeMonster.y, activeMonster.z, surface.worldToPoints);
                                let intersectionZ = target[2];
                                if( intersectionZ < activeMonster.radius ) {
                                    let velocity = vector3TransformMatrix4(activeMonster.vx, activeMonster.vy, activeMonster.vz, surface.worldToPointsRotation);
                                    // velocity z should be negative (moving into the plane), if it's not, we can ignore this result
                                    let velocityZ = velocity[2];
                                    if( velocityZ < 0 ) {
                                        let origin = vector3TransformMatrix4(originalX, originalY, originalZ, surface.worldToPoints);;
                                        let overlap = activeMonster.radius - intersectionZ;
                                        let planeIntersectionTime = amtRemaining + overlap/velocity[2];
                                        let planeIntersection = vector3Mix(target, origin, planeIntersectionTime/amt);
                                        if( vector2PolyContains(surface.points, planeIntersection) ) {
                                            collisionTime = planeIntersectionTime - averageError;
                                        } else {
                                            // TODO need to back this out
                                            //collisionTime = planeIntersectionTime;
                                        }
                                        if( collisionTime < 0 ) {
                                            suggestedPosition = vector3TransformMatrix4(planeIntersection[0], planeIntersection[1], activeMonster.radius, surface.pointsToWorld);
                                        }    
                                    }

                                }                                


                            }
                            
                        }
                        if( collisionTime != null && (minCollisionTime == null || minCollisionTime > collisionTime) ) {
                            minCollisionEntity = collisionEntity;
                            minCollisionTime = collisionTime;
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
                            console.log('adjusting', activeMonster.x, activeMonster.y, activeMonster.z, suggestedPosition, minCollisionTime);
                            activeMonster.x = suggestedPosition[0];
                            activeMonster.y = suggestedPosition[1];
                            activeMonster.z = suggestedPosition[2];
                        }
    
                        if( minCollisionEntity.isMonster ) {
                            //this.removeEntity(minCollisionEntity);
                            minCollisionEntity.deathAge = minCollisionEntity.age;
                            minCollisionEntity.vx = activeMonster.vx = minCollisionEntity.vy = activeMonster.vy = minCollisionEntity.vz = activeMonster.vz = 0;
                            //this.removeEntity(activeMonster);
                            activeMonster.deathAge = activeMonster.age;
                            done = true;
                        } else {
                            //activeMonster.vx = activeMonster.vy = activeMonster.vz = 0;
                            // bounce
                            let surface = minCollisionEntity as Surface;
                            let velocity = vector3TransformMatrix4(activeMonster.vx, activeMonster.vy, activeMonster.vz, surface.worldToPointsRotation);
                            
                            let adjustedVelocity = vector3TransformMatrix4(velocity[0], velocity[1], -velocity[2] * .1, surface.pointsToWorldRotation);
                            activeMonster.vx = adjustedVelocity[0];
                            activeMonster.vy = adjustedVelocity[1];
                            activeMonster.vz = adjustedVelocity[2];

                        }
    
    
                    } else {
                        this.addEntityPosition(activeMonster);
                        done = true;
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

        let minTileX = Math.floor(x - this.activeTilesWidth/2);
        let minTileY = Math.floor(y - this.activeTilesHeight/2);
        let maxTileX = Math.floor(x + this.activeTilesWidth/2);
        let maxTileY = Math.floor(y + this.activeTilesHeight/2);

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
    }

    public removeEntityPosition(entity: Entity) {
        return this.iterateTiles(entity.bounds(), function(entities: Entity[]) {
            arrayRemove(entities, entity);
        });
    }

    private iterateEntities(bounds: Rect2, f: (entity: Entity) => void ) {
        let iteratedEntities: {[_:number]: number} = {};
        this.iterateTiles(bounds, function(entities: Entity[]) {
            for( let entity of entities ) {
                if( !iteratedEntities[entity.id] ) {
                    f(entity);
                    iteratedEntities[entity.id] = 1;
                }
            }
        });
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

