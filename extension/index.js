"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
exports.__esModule = true;
var fs_1 = require("fs");
var Discord = require("discord.js");
var commands_1 = require("./commands");
var silence;
var connection = undefined;
module.exports = function (nodecg) {
    var currentMembers = [];
    var memberList = nodecg.Replicant('memberList', { persistent: false, defaultValue: [] });
    var addMember = nodecg.Replicant('addMember', { persistent: false, defaultValue: null });
    var removeMember = nodecg.Replicant('removeMember', { persistent: false, defaultValue: null });
    var changeMute = nodecg.Replicant('changeMute', { persistent: false, defaultValue: null });
    var speaking = nodecg.Replicant('speaking', { persistent: false, defaultValue: [] });
    memberList.value = [];
    var roleID = nodecg.bundleConfig.roleID;
    var client = new Discord.Client();
    client.once('ready', function () {
        nodecg.log.info('DACBot is now online. For help, type @' + client.user.username + ' help');
        memberList.on('change', function (newVal) {
            client.user.setPresence({ status: 'online' });
            if (newVal.length <= 0) {
                client.user.setActivity('voice channels...', { type: 'WATCHING' });
            }
            else {
                client.user.setActivity(newVal.length + " user" + (newVal.length > 1 ? 's' : '') + "...", { type: 'LISTENING' });
            }
        });
        (0, commands_1.command)(client, 'help', roleID, function (message) {
            var helpEmbed = new Discord.MessageEmbed()
                .setTitle('DACBot Help')
                .setURL('https://github.com/nicnacnic/nodecg-DACBot')
                .setDescription('Does someone need some help?')
                .addField('Connecting to a Voice Channel', "<@" + client.user.id + "> connect\nThe bot will connect to the voice channel that the user is in and start capturing audio.")
                .addField('Disconnecting from a Voice Channel', "<@" + client.user.id + "> disconnect\nThe bot will stop capturing audio and disconnect from the voice channel.")
                .setThumbnail(client.user.displayAvatarURL())
                .setFooter('DACBot made by nicnacnic. Edited for AusSpeedruns by Clubwho.')
                .setTimestamp();
            message.channel.send(helpEmbed);
        });
        (0, commands_1.command)(client, 'connect', roleID, function (message) {
            if (connection) {
                message.reply("I'm already in a voice channel! Please disconnect me first.");
            }
            else if (message.member.voice.channel && message.member.voice.channel) {
                message.channel.send('Connected to `' + message.member.voice.channel.name + '`.');
                record(message.member.voice.channel);
            }
            else {
                message.reply("You're not in a voice channel!");
            }
        });
        (0, commands_1.command)(client, 'disconnect', roleID, function (message) {
            if (connection) {
                message.channel.send('Disconnected from `' + connection.channel.name + '`.');
                stopRecording(connection.channel.name);
            }
            else {
                message.reply("I'm not in a voice channel!");
            }
        });
        client.on('guildMemberSpeaking', function (member, memberSpeaking) {
            if (memberSpeaking.bitfield == 1) {
                speaking.value = __spreadArray(__spreadArray([], speaking.value, true), [{ id: member.id, speaking: true }], false);
            }
            else {
                var mutableSpeaking = __spreadArray([], speaking, true);
                var index = mutableSpeaking.findIndex(function (speaking) { return speaking.id === member.id; });
                if (index !== -1) {
                    mutableSpeaking.splice(index, 1);
                }
                speaking.value = mutableSpeaking;
            }
        });
        client.on('voiceStateUpdate', function (oldMember, newMember) {
            if (connection && newMember.id !== client.user.id) {
                if (oldMember.channelID !== connection.channel.id && newMember.channelID === connection.channel.id) {
                    currentMembers.push({ id: newMember.id, audio: '' });
                    var username = newMember.member.nickname || newMember.member.user.username;
                    var muteState = checkMute(newMember);
                    memberList.value.push({
                        id: newMember.id,
                        name: username,
                        avatar: newMember.member.user.displayAvatarURL(),
                        muted: muteState
                    });
                }
                else if (oldMember.channelID === connection.channel.id && newMember.channelID !== connection.channel.id) {
                    for (var i = 0; i < currentMembers.length; i++) {
                        if (currentMembers[i].id === newMember.id) {
                            currentMembers.splice(i, 1);
                            break;
                        }
                    }
                    for (var i = 0; i < memberList.value.length; i++) {
                        if (memberList.value[i].id === newMember.id) {
                            memberList.value.splice(i, 1);
                            break;
                        }
                    }
                    removeMember.value = newMember.id;
                }
                else if (newMember.serverMute !== oldMember.serverMute ||
                    newMember.serverDeaf !== oldMember.serverDeaf ||
                    newMember.selfMute !== oldMember.selfMute ||
                    newMember.selfDeaf !== oldMember.selfDeaf) {
                    for (var i = 0; i < currentMembers.length; i++) {
                        if (currentMembers[i].id === newMember.id) {
                            var muteState = checkMute(newMember);
                            changeMute.value = { id: newMember.id, muted: muteState };
                            memberList.value[i].muted = muteState;
                        }
                    }
                }
            }
            else if (connection && oldMember.channelID) {
                stopRecording(oldMember.channel.name);
                if (newMember.channelID) {
                    setTimeout(function () {
                        record(newMember.channel);
                    }, 500);
                }
            }
        });
    });
    function record(voiceChannel) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, voiceChannel.join()];
                    case 1:
                        // connection = client.channels.cache.get(channelID);
                        connection = _a.sent();
                        if (voiceChannel.members.size > 1) {
                            voiceChannel.members.forEach(function (member) {
                                if (member.user.id !== client.user.id) {
                                    var username = member.nickname || member.user.username;
                                    ;
                                    currentMembers.push({ id: member.user.id, audio: '' });
                                    var muteState = checkMute(member.voice);
                                    addMember.value = {
                                        id: member.user.id,
                                        name: username,
                                        avatar: member.user.displayAvatarURL(),
                                        muted: muteState
                                    };
                                    memberList.value.push({
                                        id: member.user.id,
                                        name: username,
                                        avatar: member.user.displayAvatarURL(),
                                        muted: muteState
                                    });
                                }
                            });
                        }
                        silence = setInterval(function () {
                            connection.play((0, fs_1.createReadStream)('./bundles/nodecg-dacbot/utils/silence.wav'));
                        }, 270000);
                        nodecg.log.info('Capture started for channel ' + connection.channel.name + ' on ' + Date());
                        return [2 /*return*/];
                }
            });
        });
    }
    function stopRecording(channelName) {
        if (connection) {
            nodecg.log.info('Capture stopped for channel ' + channelName + ' on ' + Date());
            connection.channel.leave();
        }
        for (var i = 0; i < currentMembers.length; i++) {
            removeMember.value = currentMembers[i].id;
        }
        memberList.value = [];
        currentMembers = [];
        connection = undefined;
        clearInterval(silence);
    }
    function delayedSpeaking(speakingNewVal) {
        setTimeout(function () {
            speaking.value = speakingNewVal;
        }, 2000);
    }
    client.login(nodecg.bundleConfig.botToken);
};
function checkMute(voiceState) {
    return voiceState.selfMute || voiceState.selfDeaf || voiceState.serverMute || voiceState.serverDeaf;
}
