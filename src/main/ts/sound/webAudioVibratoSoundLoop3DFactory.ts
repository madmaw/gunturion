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
            start: function (x: number, y: number, z: number) {
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
                    panner.refDistance = CONST_MAX_SOUND_RADIUS_SQRT * size;
                    panner.distanceModel = 'exponential';
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
            stop: function() {
                if( oscillator ) {
					if( !FLAG_MINIMAL_AUDIO_CLEANUP ) {
						oscillator.disconnect();
						gain.disconnect();
						vibratoGain.disconnect();
					}
                    panner.disconnect();
                    oscillator.stop();
                    vibrato.stop();
                    oscillator = null;
                }
            }
        }

    }
}

