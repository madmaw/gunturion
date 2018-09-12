function webAudioBoomSoundFactory(
    audioContext: AudioContext, 
    durationSeconds: number, 
    attackSeconds: number, 
    filterFrequency: number, 
    attackVolume: number, 
    sustainVolume: number
): Sound3D {
    var frameCount = durationSeconds * audioContext.sampleRate;
    var buffer = audioContext.createBuffer(1, frameCount, audioContext.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < frameCount; i++) {
        data[i] = m.random() * 2 - 1;
    }

    return function (x: number, y: number, z: number) {
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
		if( FLAG_AUDIO_SET_DISTANCE_MODEL_EXPONENTIAL ) {
			panner.distanceModel = 'exponential';
		}
		panner.setPosition(x, y, z);

		staticNode.connect(filter);
		filter.connect(gain);
		gain.connect(panner);
		panner.connect(audioContext.destination);

		staticNode.start();
		staticNode.stop(audioContext.currentTime + durationSeconds);
		staticNode.onended = function() {
			if( FLAG_MINIMAL_AUDIO_CLEANUP ) {
				[panner].map(audioDisconnectSingleNode);
			} else {
				[panner, gain, staticNode, filter].map(audioDisconnectSingleNode);
			}
		}
    }

}