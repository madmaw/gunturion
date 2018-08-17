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

    constructor(
        private activeTilesWidth: number, 
        private activeTilesHeight: number, 
        private chunkWidth: number, 
        private chunkHeight: number,
        private chunkGenerator: ChunkGenerator,
        private monsterCreator: MonsterGenerator
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
    }

    public update(amt: number) {
        for( let activeMonster of this.activeMonsters ) {
            activeMonster.update(this, amt);
        }
        // TODO check for collisions

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
        if( entity.isMonster ) {
            this.activeMonsters.push(entity);
        }
        this.allEntities.push(entity);
        let overlap = rect2Overlap(entity.bounds(), this.activeTileArea);
        if( overlap ) {
            if( entity.isMonster ) {
                this.activeMonsters.push(entity);
            }
            let minTileX = Math.floor(overlap.min[0] - this.activeTileArea.min[0]);
            let minTileY = Math.floor(overlap.min[1] - this.activeTileArea.min[1]);
            let maxTileX = Math.floor(overlap.max[0] - this.activeTileArea.min[0]);
            let maxTileY = Math.floor(overlap.max[1] - this.activeTileArea.min[1]);

            for( let x=minTileX; x<=maxTileX; x++ ) {
                for( let y=minTileY; y<=maxTileY; y++ ) {
                    this.activeTiles[x][y].push(entity);
                }
            }
        }
    }

    public removeEntity(entity: Entity) {
        
    }

}

