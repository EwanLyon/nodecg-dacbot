const audioContext = new window.AudioContext();
const source = audioContext.createBufferSource();
const viz = document.getElementById('visualiser');

let megaBuffer = new Int16Array(3840).buffer;

nodecg.listenFor('audio-buffer', (data) => {
	// megaBuffer = _appendBuffer(megaBuffer, data);
	// const buf = new Int16Array(data);
	// source.buffer = buf;
	// audioContext.decodeAudioData(data).then((decoded) => {
	// 	source.buffer = decoded;
	// }, (error) => {
	// 	console.log(error);
	// });

	// for (let i = 0; i < buf.length; i++) {
	// console.log(buf[i])
	// 	viz.style.height = buf[i]
	// }

	// play(data);

	// console.log()
	// audioContext.decodeAudioData(getWebPcm2WavArrayBuffer(data)).then((decoded) => {
	// 	source.buffer = decoded;
	// }, (error) => {
	// 	console.log(error);
	// });
});

var _appendBuffer = function (buffer1, buffer2) {
	var tmp = new Int16Array(buffer1.byteLength + buffer2.byteLength);
	tmp.set(new Int16Array(buffer1), 0);
	tmp.set(new Int16Array(buffer2), buffer1.byteLength);
	return tmp.buffer;
};

function startAudio() {
	audioContext.decodeAudioData(megaBuffer).then(
		(decoded) => {
			source.buffer = decoded;
		},
		(error) => {
			console.log(error);
		}
	);
	source.connect(audioContext.destination);
	source.start();
}

// const channels = 1
// function play(data){
// 	const buf = new Int16Array(data);
// 	// Create an empty two second stereo buffer at the
// 	// sample rate of the AudioContext
// 	const frameCount = 1920;

// 	var myAudioBuffer = audioContext.createBuffer(channels, frameCount, 16000);
// 	for (var channel = 0; channel < channels; channel++) {

// 		var nowBuffering = myAudioBuffer.getChannelData(channel,16,16000);
// 		for (var i = 0; i < frameCount; i++) {
// 			// audio needs to be in [-1.0; 1.0]
// 			// for this reason I also tried to divide it by 32767
// 			// as my pcm sample is in 16-Bit. It plays still the
// 			// same creepy sound less noisy.
// 			var word = (buf.charCodeAt(i * 2) & 0xff) + ((buf.charCodeAt(i * 2 + 1) & 0xff) << 8);
// 			nowBuffering[i] = ((word + 32768) % 65536 - 32768) / 32768.0;
// 		}
// 	}
// 	// Get an AudioBufferSourceNode.
// 	// This is the AudioNode to use when we want to play an AudioBuffer
// 	// var source = audioContext.createBufferSource();
// 	// set the buffer in the AudioBufferSourceNode
// 	source.buffer = myAudioBuffer;
// 	// connect the AudioBufferSourceNode to the
// 	// destination so we can hear the sound
// 	source.connect(audioContext.destination);
// 	// start the source playing
// 	source.start();
// }

const getWebPcm2WavArrayBuffer = (data) => {
	return addWavHeader(data, 16000, 16, 1); // Here is the current business needs, specific parameters, sample rate 16000, sample bit number 16, channel number 1
};

const addWavHeader = function (samples, sampleRateTmp, sampleBits, channelCount) {
	console.log(samples.byteLength)
	const dataLength = samples.byteLength;
	const buffer = new ArrayBuffer(44 + dataLength);
	const view = new DataView(buffer);
	function writeString(view, offset, string) {
		for (let i = 0; i < string.length; i++) {
			view.setUint8(offset + i, string.charCodeAt(i));
		}
	}

	let offset = 0;
	/* resource exchange file identifier */
	writeString(view, offset, 'RIFF');
	offset += 4;
	/* The total number of bytes from the next address to the end of the file, ie file size -8 */
	view.setUint32(offset, /* 32 */ 36 + dataLength, true);
	offset += 4;
	/* WAV file mark */
	writeString(view, offset, 'WAVE');
	offset += 4;
	/* Waveform format flag */
	writeString(view, offset, 'fmt ');
	offset += 4;
	/* Filter bytes, typically 0x10 = 16 */
	view.setUint32(offset, 16, true);
	offset += 4;
	/* Format category (sampled data in PCM format) */
	view.setUint16(offset, 1, true);
	offset += 2;
	/* Number of channels */
	view.setUint16(offset, channelCount, true);
	offset += 2;
	/* Sampling rate, number of samples per second, indicating the playback speed of each channel */
	view.setUint32(offset, sampleRateTmp, true);
	offset += 4;
	/* Waveform data transfer rate (average number of bytes per second) Number of channels × data bits per second × data bits per sample / 8 * /
	view.setUint32(offset, sampleRateTmp * channelCount * (sampleBits / 8), true); offset += 4
	/* Fast data adjustment number Number of bytes occupied at the time of sampling Number of channels × number of data bits per sample / 8 * /
	view.setUint16(offset, channelCount * (sampleBits / 8), true); offset += 2
	/* Number of data per sample */
	view.setUint16(offset, sampleBits, true);
	offset += 2;
	/* data identifier */
	writeString(view, offset, 'data');
	offset += 4;
	/* Total number of sampled data, ie the total size of the data -44 */
	view.setUint32(offset, dataLength, true);
	offset += 4;
	function floatTo32BitPCM(output, offset, input) {
		input = new Int32Array(input);
		for (let i = 0; i < input.length; i++, offset += 4) {
			output.setInt32(offset, input[i], true);
		}
	}
	function floatTo16BitPCM(output, offset, input) {
		input = new Int16Array(input);
		for (let i = 0; i < input.length; i++, offset += 2) {
			output.setInt16(offset, input[i], true);
		}
	}
	function floatTo8BitPCM(output, offset, input) {
		input = new Int8Array(input);
		for (let i = 0; i < input.length; i++, offset++) {
			output.setInt8(offset, input[i], true);
		}
	}
	if (sampleBits == 16) {
		floatTo16BitPCM(view, 44, samples);
	} else if (sampleBits == 8) {
		floatTo8BitPCM(view, 44, samples);
	} else {
		floatTo32BitPCM(view, 44, samples);
	}
	return view.buffer;
};
