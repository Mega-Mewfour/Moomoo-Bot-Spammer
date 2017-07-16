var app = require('http').createServer(handler);
var io = require('socket.io')(app);
var fs = require('fs');

const cmd_prefix = '!';

var nameCount = 0;
var names = [];

app.listen(8001, '127.0.0.1');

function handler (req, res) {
  fs.readFile(__dirname + '/index.html',
  function (err, data) {
    if (err) {
      res.writeHead(500);
      return res.end('Error loading index.html');
    }
    res.writeHead(200);
    res.end(data);
  });
}

io.on('connection', function (socket) {
	nameCount++;
	(function get_name(){
		if (!names.includes(`Anonymous Person #${nameCount}`)){
			names.push(`Anonymous Person #${nameCount}`);
			socket.chatname = `Anonymous Person #${nameCount}`;
			socket.emit('name_request', {new_name: `Anonymous Person #${nameCount}`});
		}else{
			nameCount++;
			get_name();
		}
	})();
	io.emit('log', {info: `Welcome ${socket.chatname}! (${io.engine.clientsCount} CONNECTIONS)`});
	socket.emit('log', {info: `"!setname <name>" to set your name`});
	socket.emit('log', {info: `"!spam --link <link> --num <number> --name <bot name> --tribe <tribe name>[ --chat <chat msg>]" to bot spam`});
	socket.emit('log', {info: `"!endspam" to end all of your bot spams`});
	socket.emit('log', {info: `ANNOUNCEMENT: CHAT MSG IS SLOW, AND REDUCES PERFORMANCE!`});
	socket.on('disconnect', function () {
		names.splice(names.indexOf(socket.chatname), 1);
		io.emit('log', {info: `${socket.chatname} has left! (${io.engine.clientsCount} CONNECTIONS)`});
	});
	socket.on('chat', function (data) {
		data.sender = socket.chatname;
		io.emit('chat', data);
		if (data.msg.startsWith(cmd_prefix)){
			var command = data.msg.split(' ')[0].replace(cmd_prefix, '');
			var args = data.msg.split(' ').slice(1);
			if (command == 'setname'){
				var name = args.join(' ');
				if (names.includes(name)){
					io.emit('log', {error: `[ERROR] ${data.sender}: NAME ALREADY TAKEN`});
				}else{
					names.splice(names.indexOf(data.sender), 1);
					names.push(name);
					socket.chatname = name;
					socket.emit('name_request', {new_name: name});
					io.emit('log', {info: `${data.sender} is now known as ${name}!`});
				}
			}else if (command == 'spam'){
				var options = parse_flags(args.join(' '), ["--link", "--num", "--name", "--tribe", "--chat", "--reqspam"]);
				var object_keys = Object.keys(options);
				if (object_keys.includes("link")){
					var ip = getIP(options.link.value);
					if (!ip){
						io.emit('log', {error: `[ERROR] ${socket.chatname}: INVALID LINK`});
						return;
					}else{
						options.link.value = ip;
					}
				}else{
					io.emit('log', {error: `[ERROR] ${socket.chatname}: LINK REQUIRED`});
					return;
				}
				if (object_keys.includes("num")){
					if (options.num.value < 1){
						options.num.value = 1;
					}else if (options.num.value > 500){
						options.num.value = 500;
					}
				}else{
					options.num = {value: 50};
				}
				if (object_keys.includes("name")){
					if (options.name.value.length > 15){
						options.name.value = options.name.value.slice(0, 15);
					}
				}else{
					options.name = {value: "unknown"};
				}
				if (object_keys.includes("tribe")){
					if (options.tribe.value.length > 6){
						options.tribe.value = options.tribe.value.slice(0, 6);
					}
				}else{
					options.tribe = {value: "Bots"};
				}
				if (object_keys.includes("chat")){
					if (options.chat.value.length > 30){
						options.chat.value = options.chat.value.slice(0, 30);
					}
				}else{
					options.chat = {value: false};
				}
				if (object_keys.includes("reqspam")){
					if (options.reqspam.value == "true"){
						options.reqspam.value = true;
					}else{
						options.reqspam.value = false;
					}
				}else{
					options.reqspam = {value: false};
				}
				socket.emit('spam_init', options);
				io.emit('log', {info: `${socket.chatname} has started a bot spam on http://moomoo.io/?party=${options.link.value}!`});
			}else if (command == 'endspam'){
				socket.emit('spam_end', {info: "ok"});
				io.emit('log', {info: `${socket.chatname} has ended all spams!`});
			}
		}
	});
	socket.on('spam_init', (data) => {

	});
});

function parse_flags(string, flags_array){
	if (!Array.isArray(flags_array)){
		return {error: "Array of flags not found."};
	}
	var return_object = {};
	var flag_locations = [[-1, "null", []]];
	var string_array = string.split(' ');
	for (var i = 0; i < string_array.length; i++){
		if (flags_array.indexOf(string_array[i]) > -1){
			flag_locations.push([i, string_array[i], []]);
		}else{
			flag_locations[flag_locations.length - 1][2].push(string_array[i]);
		}
	}
	for (var i = 0; i < flag_locations.length; i++){
		return_object[flag_locations[i][1].replace(/^(-*)/g, '')] = {};
		return_object[flag_locations[i][1].replace(/^(-*)/g, '')].flagLocation = flag_locations[i][0];
		return_object[flag_locations[i][1].replace(/^(-*)/g, '')].value = flag_locations[i][2].join(' ');
	}
	return return_object;
}

function validIP(inputText){
	var ipformat = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
	if(inputText.match(ipformat)){
		return true;
	}else{
		return false;
	}
}

function getIP(link){
	link = /(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)/.exec(link)[0];
	if (validIP(link)){
		return link;
	}else{
		return false;
	}
}

process.on('SIGINT', function () {
  io.emit("APPLICATION SHUTTING DOWN");
  process.exit();
});

process.on('SIGTERM', function () {
  io.emit("APPLICATION SHUTTING DOWN");
  process.exit();
});
