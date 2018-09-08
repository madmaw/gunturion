window.onload = function() {
    // init everything

    let offscreenCanvas = document.getElementById('a') as HTMLCanvasElement;

	let loadingElement: HTMLElement;
	if( !FLAG_NO_LOADING ) {
		loadingElement = document.getElementById('l');
	}

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
    let monsterGenerator = monsterGeneratorFactory(gl, rngFactory, audioContext);
    let surfaceGenerator = surfaceGeneratorFactory(gl);
    let chunkGenerator = flatChunkGeneratorFactory(
        seed,
        surfaceGenerator, 
        monsterGenerator, 
        rngFactory, 
        audioContext
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
    if( FLAG_HOME_SCREEN ) {
        let showHome = initShowHome(showPlay);  
        showHome();
    } else {
        let f = function() {
            showPlay(f);
        }
        f();
    }

    //initTest();
    if( !FLAG_NO_LOADING ) {
	    loadingElement.className = '';
	}
    
};