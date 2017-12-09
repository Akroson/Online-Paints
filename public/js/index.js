var xhr = new XMLHttpRequest();
var readySock = false;
var socket = new WebSocket('ws://'+ location.hostname +':3000' +'/');

socket.onopen = function() {
	readySock = true;
};

socket.onmessage = function(e) {
	console.log('message ' + e.data);
	validationRes(e.data, false);
};

document.getElementById('main-nav').addEventListener('click', function(e) {
	e.preventDefault();
	var target = e.target; 
	if (target.tagName == 'A') {
		var href = target.getAttribute('href');
		var get = null;
		if (href == '/join-room') {
			get = target.parentNode.querySelector('input').value;
			if (get === '' || !readySock) return;
			console.log(get);
			socket.send(JSON.stringify({type: 'connect', r: get}));
			return;
		}
		sendRequest(href, get);
	}
})

function sendRequest(href, get) {
	var request;
	if (get !== null) {
		request = createGetReq(href, get);
	} else {
		request = href;
	}
	xhr.open('GET', request, true);
	xhr.onload = function() {
		validationRes(this.responseText, true);
	}
	xhr.onerrror = xhr.onabort = function() {
		//handel error;
	}
	xhr.send();
}

function createGetReq(href, get) {
	return href + '?' + 'roomid=' + get;
}

function validationRes(obj, xhr) {
	obj = JSON.parse(obj)
	if (xhr) {
		if (obj.res) {
			window.location.href = obj.room;
		} else {
			console.log(obj.message)
		}
	} else {
		if (obj.type === 'confirm') {
			if (obj.res) {
				window.location.href = obj.room;
			} else {
				console.log(obj.message)
			}
		}
	}
}