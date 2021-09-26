"use strict";
exports.__esModule = true;
exports.command = void 0;
function command(client, alias, roleID, callback) {
    client.on('message', function (message) {
        var content = message.content.split(' ');
        if (content.length > 1 && content[0] === "<@!" + client.user.id + ">" && content[1] === alias) {
            if (message.member.hasPermission('ADMINISTRATOR') || message.member.hasPermission('MANAGE_CHANNELS') || message.member.roles.cache.has(roleID)) {
                callback(message);
            }
            else
                message.reply("you do not have permission to execute this command!");
        }
    });
}
exports.command = command;
