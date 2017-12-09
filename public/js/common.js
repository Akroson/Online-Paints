/**
 * Init variable
 */
var modal = document.getElementById('modal');
var nameSpan = document.getElementById('name-user');

var wraperCanvas = document.getElementById('canvas-wrapper');

var mainCanvas = document.getElementById('cnv');
var mainCtx = mainCanvas.getContext('2d');
mainCtx.lineCap = "round";

var shadowCanvas = document.getElementById('shadow-cnv');
var shadowCtx = shadowCanvas.getContext('2d');

var rangeInput = document.getElementById('rangeWidth');
var strokeWidth = rangeInput.value;
var preStrokeWidth;

var colorLine = '#000000';
var preColorLine;

var widthLine = document.getElementById('widthLine');
var WLWidth = widthLine.width;
var WLHeight = widthLine.height;
var widthLineCtx = widthLine.getContext('2d');
widthLineCtx.lineWidth = 2;

var drawFunc = 'line';

var DO_DRAW = false;
var PARSE_NOW = false;


/**
 * Draw canvas class
 */
function Draw() {
	this.socketReady = false;
	this.width = mainCanvas.width;
	this.height = mainCanvas.height;
	this.startX = null;
	this.startY = null;
	this.eraserSide;
	this.shadowCnvInfo = {};
	this.drawNow = false;
	this.fill = true;
	this.change = true;
	this.drawFigure = null;
	this.firstFrame = true;
	this.arrCrd = [[],[]];
}

Draw.prototype.init = function(x, y) {
	this.startX = x;
	this.startY = y;
	this.drawNow = true;

	if (this.drawFigure == 'line') {
		mainCtx.beginPath();
		mainCtx.moveTo(x, y);
		console.log('INIT');
		setTimeout(this.sendLineData.bind(this), 0);
	}
}

Draw.prototype.preparing = function(funcName) {
	if (!this.change) return;
	this.change = false; 
	this.drawFigure = funcName;

	if (funcName == 'line') {
	    this.initStyleCnv();
	    mainCtx.lineJoin = 'round';
	} else if (funcName == 'square' || funcName == 'circle') {
		mainCtx.lineJoin = 'miter';
		this.initStyleCnv();
	} else if (funcName == 'eraser') {
		preColorLine = false;
		preStrokeWidth = false;
		shadowCtx.lineWidth = 2;
		shadowCtx.strokeStyle = 'black';
		shadowCtx.fillStyle = 'white';
	}
}

Draw.prototype.line = function(x, y) {
	if (this.drawNow) {
		this.arrCrd[0].push(x);
		this.arrCrd[1].push(y);
		mainCtx.lineTo(x, y);
		mainCtx.stroke();
	} else {
		DO_DRAW = false;
		mainCtx.closePath();
	}
}

//neet to improve
Draw.prototype.sendLineData = function() {
	var arrX = this.arrCrd[0];
	var arrY = this.arrCrd[1];
	if (arrX.length && arrY.length) {
		if (this.firstFrame) {
			this.firstFrame = false;
			this.sendData({type: 'paint', data: {figure: 'line', x: this.startX,
				y: this.startY,  w: +strokeWidth, color: colorLine, 
				crdX: arrX.toString(), crdY: arrY.toString()}});
		} else {
			this.sendData({type: 'paint', data: {figure: 'line_crd', 
				crdX: arrX.toString(), crdY: arrY.toString()}});
		}
		this.arrCrd[0] = [];
		this.arrCrd[1] = [];
	}

	if (this.drawNow) 
		setTimeout(this.sendLineData.bind(this), 250);
	else this.firstFrame = true;
}

Draw.prototype.circle = function(x, y) {
	var startX = this.startX;
	var startY = this.startY;
	if (this.drawNow) {
		var radius = Math.pow(Math.pow(startX - x, 2) + Math.pow(startY - y, 2), 0.5);
		shadowCtx.clearRect(0, 0, this.width, this.height);
		shadowCtx.beginPath();
		shadowCtx.arc(startX, startY, radius, 0, 2*Math.PI);
		this.fill ? shadowCtx.fill() : shadowCtx.stroke();
		shadowCtx.closePath();
		this.shadowCnvInfo = {
			radius: radius
		};
	} else {
		mainCtx.beginPath();
		mainCtx.arc(this.startX, this.startY, this.shadowCnvInfo.radius, 0, 2*Math.PI);
		this.fill ? mainCtx.fill() : mainCtx.stroke();
		this.finishDrawing({figure: 'circle', x: startX, y: startY, 
			border: this.fill ? '' : strokeWidth, color: colorLine,
			r: Math.round(this.shadowCnvInfo.radius)});
	}
}

Draw.prototype.square = function(x, y) {
	var startX = this.startX;
	var startY = this.startY;
	if (this.drawNow) {
		var sqWidth = x - startX;
		var sqHeight = y - startY;
		shadowCtx.clearRect(0, 0, this.width, this.height);
		shadowCtx.beginPath();
		this.fill ? shadowCtx.fillRect(startX, startY, sqWidth, sqHeight) :
		shadowCtx.strokeRect(startX, startY, sqWidth, sqHeight);
		shadowCtx.closePath();
		this.shadowCnvInfo = {
			width: sqWidth,
			height: sqHeight
		};
	} else {
		var width = this.shadowCnvInfo.width;
		var height = this.shadowCnvInfo.height;
		mainCtx.beginPath();
		this.fill ? mainCtx.fillRect(startX, startY, width, height) :
		mainCtx.strokeRect(startX, startY, width, height);
		this.finishDrawing({figure: 'square', x: startX, y: startY, 
			border: this.fill ? '' : strokeWidth, color: colorLine,
			w: width, h: height});
	}
}

Draw.prototype.eraser = function(x, y) {
	var srqureSide = this.eraserSide;
	var coordX = x - (srqureSide / 2);
	var coordY = y - (srqureSide / 2);
	shadowCtx.clearRect(0, 0, this.width, this.height);
	shadowCtx.beginPath();
	shadowCtx.strokeRect(coordX, coordY, srqureSide, srqureSide);
	shadowCtx.fillRect(coordX, coordY, srqureSide, srqureSide);
	shadowCtx.closePath();
	
	if (this.drawNow) {
		mainCtx.clearRect(coordX, coordY, srqureSide, srqureSide);
		this.sendData({type: 'paint', data: {figure: 'eraser', x: coordX, y: coordY, s: srqureSide}})
	}
}

Draw.prototype.initStyleCnv = function(cnv) {
	if (preColorLine !== colorLine) {
		mainCtx.fillStyle = shadowCtx.fillStyle = colorLine;
		mainCtx.strokeStyle = shadowCtx.strokeStyle = colorLine;
		preColorLine = colorLine;
	}

	if (preStrokeWidth !== strokeWidth)  {
		mainCtx.lineWidth = shadowCtx.lineWidth = strokeWidth;
		preStrokeWidth = strokeWidth;
	}
}

Draw.prototype.finishDrawing = function(obj) {
	this.sendData({type: 'paint', data: obj})
	DO_DRAW = false;
	shadowCtx.clearRect(0, 0, this.width, this.height);
	mainCtx.closePath();
	this.shadowCnvInfo = {};
}

Draw.prototype.sendData = function(obj) {
	if (this.socketReady) {
		socket.send(JSON.stringify(obj));
	}
}

/**
 * Handler ws data class
 */
 //need to improve 'line draw bag'
 function Handler() {
 	this.color = null;
 	this.strWidth = null;
 	this.buffer = [];
 	this.loop = false;
 	this.arrCrd = [[],[]];
 	this.timer = null;
 	this.pauseLoop = false;
 	this.modalOpen = false;
 }

Handler.prototype.add = function(obj) {
	this.buffer.push(obj);
	if (!this.loop) this.startLoop();
}

Handler.prototype.startLoop = function() {
	this.loop = true;
	PARSE_NOW = true;

	while (this.loop && !this.pauseLoop) {
		if (this.buffer[0]) {
			var obj = JSON.parse(this.buffer.shift());
			switch (obj.type) {
				case 'paint':
					this.preparingDraw(obj.data);
					break;
				case 'connect':
					this.modalAlert(obj.u);
					break;
			}
		} else {
			this.loop = false;
			break;
		}
	}

	if (!this.pauseLoop) {
		this.backMainConf();
		PARSE_NOW = false;
	};
}

Handler.prototype.preparingDraw = function(obj) {
	this.color = colorLine;
	this.strWidth = strokeWidth;

	switch (obj.figure) {
		case 'line':
			this.initLine(obj);
			break;
		case 'line_crd':
			this.prepareDrawLine(obj.crdX, obj.crdY)
			break;
		case 'circle':
			this.drawCircle(obj);
			break;
		case 'square':
			this.drawSquare(obj);
			break;
		case 'eraser':
			this.eraser(obj);
			break;
	}
}

Handler.prototype.initLine = function(opt) {
	mainCtx.closePath();
	mainCtx.lineJoin = 'round';
	this.setStyle(opt.w, opt.color);
	mainCtx.beginPath();
	mainCtx.moveTo(opt.x, opt.y);
	this.prepareDrawLine(opt.crdX, opt.crdY)
}

//imrove
Handler.prototype.prepareDrawLine = function(arrX, arrY) {
	this.pauseLoop = true;
	this.arrCrd[0] = arrX.split(',');
	this.arrCrd[1] = arrY.split(',');
	var interval = 250 / this.arrCrd[0].length;
	this.time = setInterval(this.drawLine.bind(this), interval)
}

Handler.prototype.drawLine = function() {
	var crdX = this.arrCrd[0];
	var crdY = this.arrCrd[1];

	if (crdX.length && crdY.length) {
		mainCtx.lineTo(crdX.shift(), crdY.shift());
		mainCtx.stroke();
	} else {
		clearInterval(this.time);
		this.pauseLoop = false;
		this.startLoop();
	}
}

Handler.prototype.drawCircle = function(opt) {
	mainCtx.lineJoin = 'miter';
	var fill = this.setStyle(opt.border, opt.color);
	mainCtx.beginPath();
	mainCtx.arc(opt.x, opt.y, opt.r, 0, 2 * Math.PI);
	fill ? mainCtx.fill() : mainCtx.stroke();
}

Handler.prototype.drawSquare = function(opt) {
	mainCtx.lineJoin = 'miter';
	var fill = this.setStyle(opt.border, opt.color);
	mainCtx.beginPath();
	fill ? mainCtx.fillRect(opt.x, opt.y, opt.w, opt.h) :
	mainCtx.strokeRect(opt.x, opt.y, opt.w, opt.h);
}

Handler.prototype.eraser = function(opt) {
	mainCtx.clearRect(opt.x, opt.y, opt.s, opt.s);
}

Handler.prototype.setStyle = function(strWidth, color) {
	var fill = true;
	if (strWidth) {
		mainCtx.lineWidth = strWidth;
		mainCtx.strokeStyle = color;
		fill = false;
	} else {
		mainCtx.fillStyle = color;
	}

	return fill;
}

Handler.prototype.backMainConf = function() {
	mainCtx.closePath();
	mainCtx.fillStyle = this.color;
	mainCtx.strokeStyle = this.color;
	mainCtx.lineWidth = this.strWidth;
}

Handler.prototype.modalAlert = function(name) {
	nameSpan.appendChild(document.createTextNode(name));
	modal.style.display = 'block';
	this.modalOpen = true;
}

/**
 * Init Object and event
 */
var socket = new WebSocket('ws://'+ location.hostname +':3000' + location.pathname);
var draw = new Draw();
var handler = new Handler();

socket.onopen = function() {
	draw.socketReady = true;
};

socket.onmessage = function(e) {
	handler.add(e.data);
};

socket.onerror = function(e) {
	console.log('error')
}

drawWidthLine();

function drawWidthLine() {
	widthLineCtx.clearRect(0,0, WLWidth, WLHeight)
	if (drawFunc != 'eraser') {
		widthLineCtx.fillStyle = "black";
		widthLineCtx.beginPath();
		widthLineCtx.arc(WLWidth / 2, WLHeight / 2, strokeWidth, 0, 2*Math.PI);
		widthLineCtx.fill();
		widthLineCtx.closePath();
	} else {
		var srqureSide = (2 * strokeWidth) / Math.sqrt(2);
		widthLineCtx.fillStyle = 'white';
		widthLineCtx.strokeStyle = 'black';
		drawSqWL(WLWidth, WLHeight, srqureSide);
		draw.eraserSide = srqureSide;
	}
}

rangeInput.addEventListener('input', function() {
	strokeWidth = this.value;
	draw.change = true;
	if (drawFunc != 'eraser') {
		widthLineCtx.clearRect(0,0, WLWidth, WLHeight);
		widthLineCtx.beginPath();
		widthLineCtx.arc(widthLine.width / 2, WLHeight / 2, strokeWidth, 0, 2*Math.PI);
		widthLineCtx.fill();
		widthLineCtx.closePath();
	} else {
		var srqureSide = (2 * strokeWidth) / Math.sqrt(2);
		widthLineCtx.clearRect(0, 0, WLWidth, WLHeight);
		widthLineCtx.beginPath();
		drawSqWL(WLWidth, WLHeight, srqureSide);
		draw.eraserSide = srqureSide;
	}
})

modal.addEventListener('click', function(e) {
	var target = e.target;
	if (target.tagName == 'BUTTON') {
		if (handler.modalOpen) {
			var res = target.className == 'ok' ? true : false;
			var loc = res ? getRoomId() : '';
			
			socket.send(JSON.stringify({type: 'confirm',
				u: nameSpan.textContent, res: res, room: loc}));

			modal.style.display = 'none';
			nameSpan.textContent = '';
			handler.modalOpen = false;
		}
	}
})

function drawSqWL(width, height, side) {
	widthLineCtx.beginPath();
	widthLineCtx.strokeRect((width / 2) - side / 2,
							(height / 2) - side / 2,
							side, side);
	widthLineCtx.closePath();
}

function getRoomId() {
	var loc = location.pathname
	return loc.slice(loc.indexOf('/', 2) + 1);
}

document.getElementById('color').addEventListener('input', function() {
	colorLine = this.value;
	draw.change = true;
})

document.querySelector('.list-type-pants').addEventListener('click', function(e) {
	if (e.target.tagName == 'LABEL') {
		drawFunc = e.target.getAttribute('for');
		drawWidthLine();
		draw.change = true;
	}
});

document.getElementById('fill__checkbox').addEventListener('change', function() {
	draw.fill = !draw.fill;
});

wraperCanvas.onmousedown = function(e){
	if (!PARSE_NOW) {
		DO_DRAW = true;
		draw.init(e.offsetX, e.offsetY);
	}
}﻿

wraperCanvas.onmouseover = function(e) {
	draw.preparing(drawFunc);
}

wraperCanvas.onmousemove = function (e){
	if (DO_DRAW || drawFunc == 'eraser') {
		draw[drawFunc](e.offsetX, e.offsetY);
	}
}

wraperCanvas.onmouseup = wraperCanvas.onmouseout = function(e) {
	draw.drawNow = false;
}