var server = require('karma').server;
var data = JSON.parse(process.argv[2]);
var client = data.client || (data.client = {});
var clientArgs = client.args || (client.args = []);

if (process.argv.indexOf("--debug") >= 0) clientArgs.push("--debug");

server.start(data);
