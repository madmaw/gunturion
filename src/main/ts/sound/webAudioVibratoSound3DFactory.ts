function webAudioVibratoSound3DFactory(
    audioContext: AudioContext,
    durationSeconds: number,
    attackSeconds: number,
    attackVolume: number,
    sustainVolume: number, 
    oscillatorType: OscillatorType, 
    oscillatorStartFrequency: number,
    oscillatorEndFrequency: number,
    filterFrequency?: number,
    vibratoType?: OscillatorType,
    vibratoFrequency?: number
): Sound3D {

    return function (x: number, y: number, z: number) {
        let now = audioContext.currentTime;
        let oscillator = audioContext.createOscillator();
        oscillator.frequency.setValueAtTime(oscillatorStartFrequency, now);
        oscillator.frequency.linearRampToValueAtTime(oscillatorEndFrequency, now + durationSeconds);
        oscillator.type = oscillatorType;

        let gain = audioContext.createGain();
        var decay = durationSeconds * .2;
        linearRampGain(gain, now, attackVolume, sustainVolume, attackSeconds, decay, null, durationSeconds);

        let vibrato: OscillatorNode;
        let vibratoGain: GainNode;
        if( vibratoType ) {
            vibrato = audioContext.createOscillator();
            vibrato.frequency.value = vibratoFrequency;
            vibrato.type = vibratoType;
    
            vibratoGain = audioContext.createGain();
            vibratoGain.gain.value = -999;
    
            vibrato.connect(vibratoGain);
            vibratoGain.connect(oscillator.detune);

			vibrato.start();
			vibrato.stop(now + durationSeconds);
        }

        if( filterFrequency ) {
            var filter = audioContext.createBiquadFilter();
            filter.type = 'highpass';
            filter.Q.value = 0;
            filter.frequency.value = filterFrequency;    
            oscillator.connect(filter);
            filter.connect(gain);
        } else {
            oscillator.connect(gain);
        }


        let panner = audioContext.createPanner();
        panner.refDistance = CONST_MAX_SOUND_RADIUS_SQRT * attackVolume * 9;
        panner.distanceModel = 'exponential';
        //panner.rolloffFactor = 1;

        //gain.connect(vibratoGain);
        gain.connect(panner);
        panner.connect(audioContext.destination);

        panner.setPosition(x, y, z);

        oscillator.start();    
		oscillator.stop(now + durationSeconds);
		oscillator.onended = function() {
			panner.disconnect();
		}

    }
}

