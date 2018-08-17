window.onload = function() {
    // init everything

    let chunkDimension = 20;
    let activeTilesDimension = chunkDimension * 5;
    let offscreenCanvas = document.getElementById('a') as HTMLCanvasElement;

    let loadingElement = document.getElementById('l');

    // set up the webgl context
    let gl = offscreenCanvas.getContext('webgl');

    let chunkGenerator = flatChunkGeneratorFactory(gl, chunkDimension, chunkDimension);

    let monsterGenerator = monsterGeneratorFactory(gl);

    let showPlay = initShowPlay(
        offscreenCanvas, 
        gl, 
        activeTilesDimension, 
        activeTilesDimension, 
        chunkDimension, 
        chunkDimension, 
        chunkGenerator, 
        monsterGenerator
    );

    let showHome = initShowHome(showPlay);  

    //showHome();
    showPlay();

    //initTest();
    
    loadingElement.className = '';
    
};