const player = new PCMPlayer({
	encoding: '16bitInt',
	channels: 1,
	sampleRate: 100000,
	flushingTime: 5000
});

nodecg.listenFor('audio-buffer', (data) => {
	const buf = new Uint8Array(data);
	player.feed(buf);
});

// const audioBuffer = nodecg.Replicant('audioBuffer')

// audioBuffer.on('change', (data) => {
// 	// const buf = new Uint8Array(data);
// 	// console.log(data);
// 	player.feed(data);
// })