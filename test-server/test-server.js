var express = require('express')
var morgan = require('morgan')
var app = express()
var fs = require('fs')
var compression = require('compression')

var SimpleWebSocket = require('../websocketlib.js')

var WebSocketServer = require('uws').Server
var http = require('http')

app.use(morgan('combined'))
app.use(compression())

var port = 7113

// create the server
var httpServer = http.Server(app)

app.get('/', function(req, res) {
	res.send(fs.readFileSync('./test-client.html', 'utf-8'))
});

app.get('/websocketlib.js', function (req, res) {
	res.send(fs.readFileSync('../simplewebsockets.min.js', 'utf-8'))
})



wsServer = new WebSocketServer({server: httpServer})

// WebSocket server
wsServer.on('connection', function(ws) {
	console.log(`Received connection`)

	var wsClient =  new SimpleWebSocket()
	wsClient.setupWebSocket(ws)

	wsClient.emit('msg', 'server says hello')
	wsClient.on('msg', function (msg) {
		console.log(`Client sent: ${msg}`)
		console.log(`Sending '${msg}' to client`)
		wsClient.emit('msg', `server-echo: ${msg}`)
	})
});

httpServer.listen(port, function() {
	console.log('HTTP listening on port ' + port)
})
