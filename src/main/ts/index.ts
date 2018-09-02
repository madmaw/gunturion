window.onload = function() {
    // init everything

    let chunkDimension = 10;  
    let activeChunksCount = 14;
    let offscreenCanvas = document.getElementById('a') as HTMLCanvasElement;

    let loadingElement = document.getElementById('l');

    // set up the webgl context
    let gl = offscreenCanvas.getContext('webgl');
    let seed: number;
    if( FLAG_WORLD_SEED ) {
        seed = FLAG_WORLD_SEED;
    } else {
        seed = Math.floor(Math.random() * 99999);
    }

    let rngFactory = sinRandomNumberGeneratorFactory(seed);
    let monsterGenerator = monsterGeneratorFactory(gl, rngFactory);
    let surfaceGenerator = surfaceGeneratorFactory(gl);
    let chunkGenerator = flatChunkGeneratorFactory(
        surfaceGenerator, 
        monsterGenerator, 
        rngFactory
    );

    let showPlay = initShowPlay(
        offscreenCanvas, 
        gl, 
        chunkGenerator, 
        monsterGenerator, 
        400, 
        [.4, .2, .4]
    );

    let showHome = initShowHome(showPlay);  

    //showHome();
    showPlay();

    //initTest();
    
    loadingElement.className = '';
    
};