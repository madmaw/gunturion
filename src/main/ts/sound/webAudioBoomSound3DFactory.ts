function webAudioBoomSoundFactory(
    audioContext: AudioContext, 
    durationSeconds: number, 
    attackSeconds: number, 
    filterFrequency: number, 
    attackVolume: number, 
    sustainVolume: number,
    sound?: Sound3D
): Sound3D {
    var frameCount = durationSeconds * audioContext.sampleRate;
    var buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < frameCount; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    return function (x: number, y: number, z: number) {
        if (audioContext) {
            // set up the frequency

            var staticNode = audioContext.createBufferSource();
            staticNode.buffer = buffer;
            staticNode.loop = true;

            var filter = audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = 0;
            filter.frequency.value = filterFrequency;

            //decay
            var gain = audioContext.createGain();
            var decay = durationSeconds * .2;
            linearRampGain(gain, audioContext.currentTime, attackVolume, sustainVolume, attackSeconds, decay, null, durationSeconds);

            let panner = audioContext.createPanner();
            panner.refDistance = CONST_MAX_SOUND_RADIUS_SQRT * attackVolume * 9;
            panner.distanceModel = 'exponential';
            panner.setPosition(x, y, z);

            staticNode.connect(filter);
            filter.connect(gain);
            gain.connect(panner);
            panner.connect(audioContext.destination);


            // die
            setTimeout(function () {
                filter.disconnect();
                staticNode.disconnect();
                staticNode.stop();
            }, durationSeconds * 999);

            staticNode.start();
            if (sound) {
                sound(x, y, z);
            }

        }
    }

}