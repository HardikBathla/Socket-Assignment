var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
var fs = require('fs');
exec = require('child_process').exec
util = require('util')

server.listen(3002);
// WARNING: app.listen(80) will NOT work here!
try{
app.get('/', function (req, res) {
  res.sendFile(__dirname + '/client/index.html');
});

io.on('connection', function (socket) {
	console.log("socket connected")
  socket.emit('news', { hello: 'world' });
  socket.on('my other event', function (data) {
  });
  var Files={};
  socket.on('Start', function (data) { //data contains the variables that we passed through in the html file
	var Name = data['Name'];
	Files[Name] = {  //Create a new Entry in The Files Variable
		FileSize : data['Size'],
		Data     : "",
		Downloaded : 0
	}
	var Place = 0;
	try{
		var Stat = fs.statSync('Temp/' +  Name);
		if(Stat.isFile())
		{
			Files[Name]['Downloaded'] = Stat.size;
			Place = Stat.size / 524288;
		}
	}
	catch(er){} //It's a New File
	fs.open("Temp/" + Name, "a", 0755, function(err, fd){
		if(err)
		{
			console.log(err);
		}
		else
		{
			Files[Name]['Handler'] = fd; //We store the file handler so we can write to it later
			socket.emit('MoreData', { 'Place' : Place, Percent : 0 });
		}
	});
});
socket.on('Upload', function (data){
	var Name = data['Name'];
	Files[Name]['Downloaded'] += data['Data'].length;
	Files[Name]['Data'] += data['Data'];
	if(Files[Name]['Downloaded'] == Files[Name]['FileSize']) //If File is Fully Uploaded
	{
		fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
			//Get Thumbnail Here
			var readS = fs.createReadStream("Temp/" + Name);
		var writeS = fs.createWriteStream("Video/" + Name);
		readS.pipe(writeS);

		readS.on("end", function() {
			fs.unlink("Temp/" + Name, function () { //This Deletes The Temporary File
				exec("ffmpeg -i Video/" + Name  + " -ss 01:30 -r 1 -an -vframes 1 -f mjpeg Video/" + Name  + ".jpg", function(err){
					socket.emit('Done', {'Image' : 'Video/' + Name + '.jpg'});
				});
			//Moving File Completed
		});
   // Operation done
});
});
		
	}
	else if(Files[Name]['Data'].length > 10485760){ //If the Data Buffer reaches 10MB
		fs.write(Files[Name]['Handler'], Files[Name]['Data'], null, 'Binary', function(err, Writen){
			Files[Name]['Data'] = ""; //Reset The Buffer
			var Place = Files[Name]['Downloaded'] / 524288;
			var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
			socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
		});
	}
	else
	{
		var Place = Files[Name]['Downloaded'] / 524288;
		var Percent = (Files[Name]['Downloaded'] / Files[Name]['FileSize']) * 100;
		socket.emit('MoreData', { 'Place' : Place, 'Percent' :  Percent});
	}
});
});

//onsole.log(`server is running at ${server.info.url}`)
}catch(error){
console.log(error)
};
