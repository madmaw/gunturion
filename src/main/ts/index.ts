window.onload = function() {
    // init everything

    let offscreenCanvas = document.getElementById('a') as HTMLCanvasElement;

    let loadingElement = document.getElementById('l');

    let audioContext = new AudioContext();

    // set up the webgl context
    let gl = offscreenCanvas.getContext('webgl');
    let seed: number;
    if( CONST_WORLD_SEED ) {
        seed = CONST_WORLD_SEED;
    } else {
        seed = Math.floor(Math.random() * CONST_BIG_NUMBER);
    }

    let rngFactory = sinRandomNumberGeneratorFactory(seed);
    let soundLoopFactory = webAudioVibratoSoundFactory(audioContext, rngFactory);
    let monsterGenerator = monsterGeneratorFactory(gl, rngFactory, soundLoopFactory);
    let surfaceGenerator = surfaceGeneratorFactory(gl);
    let chunkGenerator = flatChunkGeneratorFactory(
        seed,
        surfaceGenerator, 
        monsterGenerator, 
        rngFactory
    );

    let showPlay = initShowPlay(
        seed,
        rngFactory,
        offscreenCanvas, 
        gl, 
        chunkGenerator, 
        monsterGenerator, 
        audioContext
    );

    let showHome = initShowHome(showPlay);  

    //showHome();
    showPlay();

    //initTest();
    
    loadingElement.className = '';
    
};