///<reference path="math/Number.ts"/>
///<reference path="flags.ts"/>
///<reference path="constants.ts"/>
///<reference path="math/Matrix.ts"/>
///<reference path="math/Random.ts"/>
///<reference path="math/Rect.ts"/>
///<reference path="math/Vector.ts"/>
///<reference path="sound/audio.ts"/>
///<reference path="sound/linearRampGain.ts"/>
///<reference path="sound/Sound3D.ts"/>
///<reference path="sound/SoundLoop3D.ts"/>
///<reference path="sound/webAudioBoomSound3DFactory.ts"/>
///<reference path="sound/webAudioVibratoSound3DFactory.ts"/>
///<reference path="sound/webAudioVibratoSoundLoop3DFactory.ts"/>
///<reference path="sound/linearRampGain.ts"/>
///<reference path="util/Array.ts"/>
///<reference path="util/WebGL.ts"/>
///<reference path="game/play/Entity.ts"/>
///<reference path="game/play/ChunkGenerator.ts"/>
///<reference path="game/play/initWorld.ts"/>
///<reference path="game/play/initShowPlay.ts"/>

let audioContext: AudioContext;
if( FLAG_CHECK_WEBKIT_AUDIO_CONTEXT && window["webkitAudioContext"] ) {
    audioContext = new window["webkitAudioContext"]();
} else {
    audioContext = new AudioContext();
}

if( !FLAG_HOME_SCREEN ) {
    initShowPlay(audioContext)();
} else {
    onload = function() {
        // init everything
    
        let loadingElement: HTMLElement;
        if( !FLAG_NO_LOADING ) {
            loadingElement = d.getElementById('l');
        }
    
        let showPlay = initShowPlay(
            audioContext
        );
        let showHome = initShowHome(showPlay);  
        showHome();
    
        //initTest();
        if( !FLAG_NO_LOADING ) {
            loadingElement.className = '';
        }
        
    };
}
