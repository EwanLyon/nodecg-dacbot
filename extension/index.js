const fs = require('fs');
const Discord = require('discord.js');
// const Speaker = require('speaker');
// const AudioMixer = require('audio-mixer')
const command = require('./commands');

let silence, connection;
let audioBuffer;

module.exports = function (nodecg) {

	let currentMembers = [];
	const memberList = nodecg.Replicant('memberList', { persistent: false });
	connection = undefined;

	let roleID = nodecg.bundleConfig.roleID;

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

		client.on('voiceStateUpdate', (oldMember, newMember) => {
			if (connection !== undefined && newMember.id !== client.user.id) {
				if (connection !== undefined && oldMember.channelID !== null) {
					stopRecording(oldMember.channel.name);
					if (newMember.channelID !== null) {
						let channelID = newMember.channelID;
						setTimeout(function () { record(channelID); }, 500);
					}
				}
			}
		});
	});

	async function record(channelID) {
		connection = await client.channels.cache.get(channelID).join();

		if (client.channels.cache.get(channelID).members.size > 1) {
			client.channels.cache.get(channelID).members.forEach((member) => {
				if (member.user.id !== client.user.id) {
					currentMembers.push({ id: member.user.id });
					memberList.push('Member')
				}
			})

			if (currentMembers.length > 0) {
				audioBuffer = connection.receiver.createStream(currentMembers[0].id, { mode: 'pcm', end: 'manual' });

				audioBuffer.on('data', (data) => {
					nodecg.sendMessage('audio-buffer', data);
				});
			}
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
		currentMembers = [];
		memberList.value = [];
		audioBuffer = undefined;
		connection = undefined;
		clearInterval(silence);
	}
	client.login(nodecg.bundleConfig.botToken);
};
