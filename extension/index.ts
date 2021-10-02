import { createReadStream } from 'fs';
import * as Discord from 'discord.js';
import { command } from './commands';

let silence: NodeJS.Timer;
let connection = undefined;

module.exports = (nodecg: any) => {
	let currentMembers = [];
	const memberList = nodecg.Replicant('memberList', { persistent: false, defaultValue: [] });
	const addMember = nodecg.Replicant('addMember', { persistent: false, defaultValue: null });
	const removeMember = nodecg.Replicant('removeMember', { persistent: false, defaultValue: null });
	const changeMute = nodecg.Replicant('changeMute', { persistent: false, defaultValue: null });
	const speaking = nodecg.Replicant('speaking', { persistent: false, defaultValue: [] });
	memberList.value = [];
	const roleID: string = nodecg.bundleConfig.roleID;

	const client = new Discord.Client();
	client.once('ready', () => {
		nodecg.log.info('DACBot is now online. For help, type @' + client.user.username + ' help');

		memberList.on('change', (newVal) => {
			client.user.setPresence({ status: 'online' });

			if (newVal.length <= 0) {
				client.user.setActivity('voice channels...', { type: 'WATCHING' });
			} else {
				client.user.setActivity(`${newVal.length} user${newVal.length > 1 ? 's': ''}...`, { type: 'LISTENING' });
			}
		});

		command(client, 'help', roleID, (message) => {
			const helpEmbed = new Discord.MessageEmbed()
				.setTitle('DACBot Help')
				.setURL('https://github.com/nicnacnic/nodecg-DACBot')
				.setDescription('Does someone need some help?')
				.addField(
					'Connecting to a Voice Channel',
					`<@${client.user.id}> connect\nThe bot will connect to the voice channel that the user is in and start capturing audio.`
				)
				.addField(
					'Disconnecting from a Voice Channel',
					`<@${client.user.id}> disconnect\nThe bot will stop capturing audio and disconnect from the voice channel.`
				)
				.setThumbnail(client.user.displayAvatarURL())
				.setFooter('DACBot made by nicnacnic. Edited for AusSpeedruns by Clubwho.')
				.setTimestamp();
			message.channel.send(helpEmbed);
		});

		command(client, 'connect', roleID, (message) => {
			if (connection) {
				message.reply(`I\'m already in a voice channel! Please disconnect me first.`);
			} else if (message.member.voice.channel && message.member.voice.channel) {
				message.channel.send('Connected to `' + message.member.voice.channel.name + '`.');
				record(message.member.voice.channel);
			} else {
				message.reply(`You're not in a voice channel!`);
			}
		});

		command(client, 'disconnect', roleID, (message) => {
			if (connection) {
				message.channel.send('Disconnected from `' + connection.channel.name + '`.');
				stopRecording(connection.channel.name);
			} else {
				message.reply(`I'm not in a voice channel!`);
			}
		});

		client.on('guildMemberSpeaking', (member, memberSpeaking) => {
			if (memberSpeaking.bitfield == 1) {
				speaking.value = [...speaking.value, { id: member.id, speaking: true }];
			} else {
				const mutableSpeaking = [...speaking];
				const index = mutableSpeaking.findIndex(speaking => speaking.id === member.id);
				
				if (index !== -1) {
					mutableSpeaking.splice(index, 1);
				}
				
				speaking.value = mutableSpeaking;
			}
		});

		client.on('voiceStateUpdate', (oldMember, newMember) => {
			if (connection && newMember.id !== client.user.id) {
				if (oldMember.channelID !== connection.channel.id && newMember.channelID === connection.channel.id) {
					currentMembers.push({ id: newMember.id, audio: '' });
					
					const username = newMember.member.nickname || newMember.member.user.username;

					const muteState = checkMute(newMember);

					memberList.value.push({
						id: newMember.id,
						name: username,
						avatar: newMember.member.user.displayAvatarURL(),
						muted: muteState,
					});
				} else if (oldMember.channelID === connection.channel.id && newMember.channelID !== connection.channel.id) {
					for (let i = 0; i < currentMembers.length; i++) {
						if (currentMembers[i].id === newMember.id) {
							currentMembers.splice(i, 1);
							break;
						}
					}
					for (let i = 0; i < memberList.value.length; i++) {
						if (memberList.value[i].id === newMember.id) {
							memberList.value.splice(i, 1);
							break;
						}
					}

					removeMember.value = newMember.id;
				} else if (
					newMember.serverMute !== oldMember.serverMute ||
					newMember.serverDeaf !== oldMember.serverDeaf ||
					newMember.selfMute !== oldMember.selfMute ||
					newMember.selfDeaf !== oldMember.selfDeaf
				) {
					for (let i = 0; i < currentMembers.length; i++) {
						if (currentMembers[i].id === newMember.id) {
							const muteState = checkMute(newMember);

							changeMute.value = { id: newMember.id, muted: muteState };

							memberList.value[i].muted = muteState;
						}
					}
				}
			} else if (connection && oldMember.channelID) {
				stopRecording(oldMember.channel.name);
				if (newMember.channelID) {
					setTimeout(function () {
						record(newMember.channel);
					}, 500);
				}
			}
		});
	});
	async function record(voiceChannel: Discord.VoiceChannel) {
		// connection = client.channels.cache.get(channelID);
		connection = await voiceChannel.join();

		if (voiceChannel.members.size > 1) {
			voiceChannel.members.forEach((member) => {
				if (member.user.id !== client.user.id) {
					const username = member.nickname || member.user.username;;

					currentMembers.push({ id: member.user.id, audio: '' });

					const muteState = checkMute(member.voice);

					addMember.value = {
						id: member.user.id,
						name: username,
						avatar: member.user.displayAvatarURL(),
						muted: muteState,
					};

					memberList.value.push({
						id: member.user.id,
						name: username,
						avatar: member.user.displayAvatarURL(),
						muted: muteState,
					});
				}
			});
		}

		silence = setInterval(function () {
			connection.play(createReadStream('./bundles/nodecg-dacbot/utils/silence.wav'));
		}, 270000);

		nodecg.log.info('Capture started for channel ' + connection.channel.name + ' on ' + Date());
	}

	function stopRecording(channelName) {
		if (connection) {
			nodecg.log.info('Capture stopped for channel ' + channelName + ' on ' + Date());
			connection.channel.leave();
		}

		for (let i = 0; i < currentMembers.length; i++) {
			removeMember.value = currentMembers[i].id;
		}

		memberList.value = [];
		currentMembers = [];
		connection = undefined;
		clearInterval(silence);
	}

	client.login(nodecg.bundleConfig.botToken);
};

function checkMute(voiceState: Discord.VoiceState) {
	return voiceState.selfMute || voiceState.selfDeaf || voiceState.serverMute || voiceState.serverDeaf;
}
