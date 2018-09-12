function webAudioVibratoSoundLoop3DFactory(
    audioContext: AudioContext, 
    rngFactory: RandomNumberGeneratorFactory
) {
    let oscillatorTypes: OscillatorType[] = [
        'sine', 
        'sawtooth', 
        'triangle', 
        'square'
    ];
    return function(seed: number, cycleTime: number, size: number): SoundLoop3D {

        let oscillator: OscillatorNode;
        let gain: GainNode;
        let vibrato: OscillatorNode;
        let vibratoGain: GainNode;
        let panner: PannerNode;

        let rng = rngFactory(seed);

        let oscillatorType = oscillatorTypes[rng(4)];
        let vibratoType = oscillatorTypes[rng(3)]; 
        //let vibratoType: OscillatorType = 'square';
        
        return {
            startOrMove: function (x: number, y: number, z: number) {
                if( !oscillator ) {
                    oscillator = audioContext.createOscillator();
                    let frequency = rng(9);
                    oscillator.frequency.value = 40 - size * 4 + frequency * frequency * frequency;
                    oscillator.type = oscillatorType;
            
                    gain = audioContext.createGain();
                    gain.gain.value = .1 * size/2;
            
                    vibrato = audioContext.createOscillator();
                    vibrato.frequency.value = 999 * (rng(2)+1)/cycleTime;
                    vibrato.type = vibratoType;
            
                    vibratoGain = audioContext.createGain();
                    vibratoGain.gain.value = -999;

                    panner = audioContext.createPanner();
                    panner.refDistance = CONST_MAX_SOUND_RADIUS_SQRT * (size+1)/2;
                    if( FLAG_AUDIO_SET_DISTANCE_MODEL_EXPONENTIAL ) {
                        panner.distanceModel = 'exponential';
                    }
                    //panner.rolloffFactor = 1;
            
                    oscillator.connect(gain);
                    //gain.connect(vibratoGain);
                    vibrato.connect(vibratoGain);
                    vibratoGain.connect(oscillator.detune);
                    gain.connect(panner);
                    panner.connect(audioContext.destination);

                    vibrato.start();
                    oscillator.start();    
                    
                }
                panner.setPosition(x, y, z);
            }, 
            stopLooping: function() {
                if( oscillator ) {
					if( !FLAG_MINIMAL_AUDIO_CLEANUP ) {
                        [oscillator, gain, vibratoGain, panner].map(audioDisconnectSingleNode);
					} else {
                        [panner].map(audioDisconnectSingleNode);
                    }
                    oscillator.stop();
                    vibrato.stop();    
                    oscillator = null;
                }
            }
        }

    }
}

