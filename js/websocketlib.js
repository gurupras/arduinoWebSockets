var events = require('events')
var textEncoding = require('text-encoding')
var TextEncoder = textEncoding.TextEncoder
var TextDecoder = textEncoding.TextDecoder


function print (msg) {
	console.log('[ws]: ' + msg)
}

var isNode = !process.browser

/**
 * Convert the byte array to an int starting from the given offset.
 *
 * @param b The byte array
 * @param offset The array offset
 * @return The integer
 */
function bufferToInt(buf, offset) {
	var dv = new DataView(buffer, 0);
	dv.getInt32(offset); //42
}

function intToBuffer(num) {
    arr = new ArrayBuffer(4) // an Int32 takes 4 bytes
    view = new DataView(arr)
    view.setUint32(0, num, false) // byteOffset = 0; litteEndian = false
    return arr
}

function stringToByteArray(str) {
	/*
	// TODO(user): Use native implementations if/when available
	var out = new ArrayBuffer(str.length)
	var view = new DataView(out)
	var p = 0
	for (var i = 0; i < str.length; i++) {
		var c = str.charCodeAt(i)
		if (c < 128) {
			view.setUint8(p++, c)
		} else if (c < 2048) {
			view.setUint8(p++, (c >> 6) | 192)
			view.setUint8(p++, (c & 63) | 128)
		} else if (
				((c & 0xFC00) == 0xD800) && (i + 1) < str.length &&
				((str.charCodeAt(i + 1) & 0xFC00) == 0xDC00)) {
			// Surrogate Pair
			c = 0x10000 + ((c & 0x03FF) << 10) + (str.charCodeAt(++i) & 0x03FF)
			view.setUint8(p++, (c >> 18) | 240)
			view.setUint8(p++, ((c >> 12) & 63) | 128)
			view.setUint8(p++, ((c >> 6) & 63) | 128)
			view.setUint8(p++, (c & 63) | 128)
		} else {
		view.setUint8(p++, (c >> 12) | 224)
		view.setUint8(p++, ((c >> 6) & 63) | 128)
		view.setUint8(p++, (c & 63) | 128)
		}
	}
	return out;
	*/
	return new TextEncoder('utf-8').encode(str)
}

function byteArrayToString(bytes) {
	return new TextDecoder('utf-8').decode(bytes)
}

function memcpy(dst, dstOffset, src, srcOffset, length) {
  var dstU8 = new Uint8Array(dst, dstOffset, length)
  var srcU8 = new Uint8Array(src, srcOffset, length)
  dstU8.set(srcU8)
}


function messageToBytes(msg) {
	var evt = msg.event
	var data = msg.data
	var evtLength = evt.length
	var dataLength = data.length
	var totalLength = 4 + evtLength + 4 + dataLength
	
	var evtBytes = stringToByteArray(evt)
	var dataBytes = stringToByteArray(data)
	
	var bytes = new ArrayBuffer(totalLength)
	var view = new DataView(bytes)
	view.setUint32(0, evtLength)
	memcpy(bytes, 4, evtBytes, 0, evtLength)
	view.setUint32(4+evtLength, dataLength)
	memcpy(bytes, 4+evtLength+4, dataBytes, 0, dataLength)
	return bytes
}

function bytesToMessage(bytes) {
	var view = new DataView(bytes)
	var evtLength = view.getUint32(0)
	var dataLength = view.getUint32(4 + evtLength)
	
	var evtBytes = new Uint8Array(bytes, 4, evtLength)
	var dataBytes = new Uint8Array(bytes, 4 + evtLength + 4, dataLength)
	
	var evt = byteArrayToString(evtBytes)
	var data = byteArrayToString(dataBytes)
	
	return {
		event: evt,
		data: data,
	}
}

;(function (root, factory) {
  'use strict'
  /* global define,module */

  if (typeof module === 'object' && typeof module.exports === 'object') {
    // Node, CommonJS-like
    module.exports = factory(root)
  } else if (typeof define === 'function' && define.amd) {
    // AMD
    define([], function () {
      return factory(root)
    })
  } else {
    // Browser globals (root is window)
    root.SimpleWebSocket = factory(root)
  }
}(typeof window !== 'undefined' ? window : this, function (window) {
	class SimpleWebSocket extends events.EventEmitter {
		constructor (url) {
			super()
			this._realEmitter = new events.EventEmitter()
		}

		emit(evt, data) {
			if (!this._websocket) {
				throw new Error('Not connected')
			}
			// TODO: Write the byte conversion logic
			var bytes = messageToBytes({
				event: evt,
				data: data,
			})
			this._websocket.send(bytes)
		}

		on(evt, handler) {
			this._realEmitter.on(evt, handler)
		}

		connect (addr) {
			if (!addr) {
				addr = 'ws://' + window.location.host + '/ws'
			}

			var ws = new WebSocket(addr)
			this.setupWebSocket(ws)
		}
		
		setupWebSocket(ws) {
			var socket = this
			// Set up binary type for msgpack ease-of-use
			ws.binaryType = 'arraybuffer'

			ws.onopen = function (evt) {
				print('OPEN')
				if (socket.onopen) {
					socket.onopen(evt)
				}
			}
			ws.onclose = function (evt) {
				print('CLOSE')
				if (socket.onclose) {
					socket.onclose(evt)
				}
			}
			ws.onmessage = function (evt) {
				// TODO: Write the conversion logic
				var msg = bytesToMessage(evt.data)
				print('Message: ' + msg.data)
				socket._realEmitter.emit(msg.event, msg.data)
				if (socket.onmessage) {
					socket.onmessage(evt)
				}
			}
			ws.onerror = function (evt) {
				print('ERROR: ' + evt.data)
				if (socket.onerror) {
					socket.onerror(evt)
				}
			}
			socket._websocket = ws
		}
	}
	if (isNode) {
		return SimpleWebSocket
	} else {
		window.SimpleWebSocket = SimpleWebSocket
	}
}))

