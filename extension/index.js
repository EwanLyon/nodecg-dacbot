const fs = require('fs');
const Discord = require('discord.js');
// const Speaker = require('speaker');
// const AudioMixer = require('audio-mixer')
const command = require('./commands');

let silence, connection;

module.exports = function (nodecg) {

	let currentMembers = [];
	const memberList = nodecg.Replicant('memberList', { persistent: false });
	const addMember = nodecg.Replicant('addMember', { persistent: false });
	const removeMember = nodecg.Replicant('removeMember', { persistent: false });
	const changeMute = nodecg.Replicant('changeMute', { persistent: false });
	const speaking = nodecg.Replicant('speaking', { persistent: false });
	addMember.value = null;
	removeMember.value = null;
	changeMute.value = null;
	speaking.value = null;
	memberList.value = [];
	connection = undefined;

	let roleID = nodecg.bundleConfig.roleID;

	const hostStreamRep = nodecg.Replicant('hostStream', { persistent: false });

	const client = new Discord.Client();
	client.once('ready', () => {
		nodecg.log.info('DACBot is now online. For help, type @' + client.user.username + ' help')

		memberList.on('change', (newVal, oldVal) => {
			client.user.setPresence({ status: "online" });
			if (newVal.length <= 0)
				client.user.setActivity('voice channels...', { type: "WATCHING" });
			else
				client.user.setActivity(newVal.length + ' users...', { type: "LISTENING" });
		});

		command(client, 'help', roleID, (message) => {
			const helpEmbed = new Discord.MessageEmbed()
				.setTitle("DACBot Help")
				.setURL("https://github.com/nicnacnic/nodecg-DACBot")
				.setDescription("Does someone need some help?")
				.addField("Connecting to a Voice Channel", "<@" + client.user.id + "> connect\nThe bot will connect to the voice channel that the user is in and start capturing audio.")
				.addField("Disconnecting from a Voice Channel", "<@" + client.user.id + "> disconnect\nThe bot will stop capturing audio and disconnect from the voice channel.")
				.addField("Changing a User's Volume", "<@" + client.user.id + "> volume <user> <volumeLevel>\nThe bot will change the volume of the specified user. `volumeLevel` must be between 1 and 100.")
				.setThumbnail(client.user.displayAvatarURL())
				.setFooter("DACBot made by nicnacnic. Edited for AusSpeedruns by Clubwho.")
				.setTimestamp()
			message.channel.send(helpEmbed);
		})

		command(client, 'connect', roleID, (message) => {
			if (connection !== undefined)
				message.reply(`I\'m already in a voice channel! Please disconnect me first.`)
			else if (message.member.voice.channel !== undefined && message.member.voice.channel !== null) {
				message.channel.send('Connected to `' + message.member.voice.channel.name + '`.')
				record(message.member.voice.channel.id);
			}
			else
				message.reply(`you're not in a voice channel!`)
		})

		command(client, 'volume', roleID, (user, volume, message) => {
			if (connection !== undefined) {
				for (let i = 0; i < currentMembers.length; i++) {
					if (currentMembers[i].id === user) {
						// currentMembers[i].mixer.setVolume(volume)
						break;
					}
				}
				message.channel.send('`' + message.guild.members.cache.get(user).user.username + '`\'s volume changed to ' + volume + '.')
			}
			else
				message.reply(`I'm not in a voice channel!`)
		})

		command(client, 'disconnect', roleID, (message) => {
			if (connection !== undefined) {
				message.channel.send('Disconnected from `' + connection.channel.name + '`.')
				stopRecording(connection.channel.name);
			}
			else
				message.reply(`I'm not in a voice channel!`)
		});

		client.on('guildMemberSpeaking', (member, memberSpeaking) => {
			let speakState;
			if (memberSpeaking.bitfield == 1)
				speakState = true;
			else
				speakState = false;
			speaking.value = null;
			speaking.value = { id: member.id, speaking: speakState }
		});

		client.on('voiceStateUpdate', (oldMember, newMember) => {
			if (connection !== undefined && newMember.id !== client.user.id) {
				if (oldMember.channelID !== connection.channel.id && newMember.channelID === connection.channel.id) {
					let i = currentMembers.length;
					currentMembers.push({ id: newMember.id, audio: '' })
					currentMembers[i].audio = connection.receiver.createStream(currentMembers[i].id, { mode: 'pcm', end: 'manual' });
					// currentMembers[i].mixer = mixer.input({
					// 	volume: 100
					// });
					// currentMembers[i].audio.pipe(currentMembers[i].mixer);
					let username, muteState;
					if (newMember.member.nickname === null)
						username = newMember.member.user.username;
					else
						username = newMember.member.nickname;
					if (newMember.selfMute || newMember.selfDeaf || newMember.serverMute || newMember.serverDeaf)
						muteState = true;
					else
						muteState = false;
					addMember.value = null;
					addMember.value = { id: newMember.id, name: username, avatar: newMember.member.user.displayAvatarURL(), muted: muteState };
					memberList.value.push({ id: newMember.id, name: username, avatar: newMember.member.user.displayAvatarURL(), muted: muteState });
				}
				else if (oldMember.channelID === connection.channel.id && newMember.channelID !== connection.channel.id) {
					for (let i = 0; i < currentMembers.length; i++) {
						if (currentMembers[i].id === newMember.id) {
							currentMembers.splice(i, 1)
							break;
						}
					}
					for (let i = 0; i < memberList.value.length; i++) {
						if (memberList.value[i].id === newMember.id) {
							memberList.value.splice(i, 1)
							break;
						}
					}
					removeMember.value = null;
					removeMember.value = newMember.id;
				}
				else if (newMember.serverMute !== oldMember.serverMute || newMember.serverDeaf !== oldMember.serverDeaf || newMember.selfMute !== oldMember.selfMute || newMember.selfDeaf !== oldMember.selfDeaf) {
					for (let i = 0; i < currentMembers.length; i++) {
						if (currentMembers[i].id === newMember.id) {
							let muteState;
							if (newMember.serverMute || newMember.serverDeaf || newMember.selfMute || newMember.selfDeaf)
								muteState = true;
							else
								muteState = false;
							changeMute.value = null;
							changeMute.value = { id: newMember.id, muted: muteState }

							memberList.value[i].muted = muteState;
						}
					}
				}
			}
			else if (connection !== undefined && oldMember.channelID !== null) {
				stopRecording(oldMember.channel.name);
				if (newMember.channelID !== null) {
					let channelID = newMember.channelID;
					setTimeout(function () { record(channelID); }, 500);
				}
			}
		})
	});
	async function record(channelID) {
		connection = await client.channels.cache.get(channelID).join();

		// mixer = new AudioMixer.Mixer({
		// 	channels: 2,
		// 	bitDepth: 16,
		// 	sampleRate: 48000,
		// });

		// speaker = new Speaker({
		// 	channels: 2,
		// 	bitDepth: 16,
		// 	sampleRate: 48000,
		// 	device: nodecg.bundleConfig.outputDevice
		// });

		if (client.channels.cache.get(channelID).members.size > 1) {
			client.channels.cache.get(channelID).members.forEach((member) => {
				if (member.user.id !== client.user.id) {
					let username;
					if (member.nickname === null)
						username = member.user.username;
					else
						username = member.nickname;
					currentMembers.push({ id: member.user.id, audio: '' });
					let muteState;
					if (member.voice.selfMute || member.voice.selfDeaf || member.voice.serverMute || member.voice.serverDeaf)
						muteState = true;
					else
						muteState = false;
					addMember.value = null;
					addMember.value = { id: member.user.id, name: username, avatar: member.user.displayAvatarURL(), muted: muteState };
					memberList.value.push({ id: member.user.id, name: username, avatar: member.user.displayAvatarURL(), muted: muteState });
				}
			})

			if (currentMembers.length > 0) {
				hostStreamRep.value = connection.receiver.createStream(currentMembers[0].id, { mode: 'pcm', end: 'manual' });
			}
			// for (let i = 0; i < currentMembers.length; i++) {
			// 	currentMembers[i].audio = connection.receiver.createStream(currentMembers[i].id, { mode: 'pcm', end: 'manual' });
			// 	currentMembers[i].mixer = mixer.input({
			// 		volume: 100
			// 	});
			// 	currentMembers[i].audio.pipe(currentMembers[i].mixer);
			// }
			// mixer.pipe(speaker);
		}

		silence = setInterval(function () {
			connection.play(fs.createReadStream('./bundles/nodecg-dacbot/utils/silence.wav'));
		}, 270000)

		nodecg.log.info('Capture started for channel ' + connection.channel.name + ' on ' + Date());
	}
	function stopRecording(channelName) {
		if (connection !== undefined) {
			nodecg.log.info('Capture stopped for channel ' + channelName + ' on ' + Date())
			connection.channel.leave();
		}
		for (let i = 0; i < currentMembers.length; i++) {
			removeMember.value = null;
			removeMember.value = currentMembers[i].id;
		}
		memberList.value = [];
		currentMembers = [];
		// mixer = [];
		// speaker = [];
		hostStreamRep.value = undefined;
		connection = undefined;
		clearInterval(silence)
	}
	client.login(nodecg.bundleConfig.botToken);
};
