function webAudioBoomSoundFactory(audioContext: AudioContext, sampleDurationSeconds: number, sound?: Sound): Sound {
    var frameCount = sampleDurationSeconds * audioContext.sampleRate;
    var buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < frameCount; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    return function (intensity: number) {
        if (audioContext) {
            // set up the frequency
            var now = audioContext.currentTime;
            var durationSeconds = sampleDurationSeconds;

            var staticNode = audioContext.createBufferSource();
            staticNode.buffer = buffer;
            staticNode.loop = true;

            var filter = audioContext.createBiquadFilter();
            filter.type = 'lowpass';
            filter.Q.value = 0;
            filter.frequency.value = 999 * (2 - intensity);

            //decay
            var gain = audioContext.createGain();
            var decay = durationSeconds * .2;
            linearRampGain(gain, now, .3, .2, durationSeconds * .5 * (1 - intensity), decay, null, durationSeconds);

            staticNode.connect(filter);
            filter.connect(gain);
            gain.connect(audioContext.destination);


            // die
            setTimeout(function () {
                filter.disconnect();
                staticNode.disconnect();
                staticNode.stop();
            }, durationSeconds * 999);

            staticNode.start();
            if (sound) {
                sound(intensity);
            }

        }
    }

}