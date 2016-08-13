'use strict';

var KeyPressDispatcher = function() {
  this.keyDown = false;
  this.listeners = {keyDown: [], keyUp: []};
};

KeyPressDispatcher.prototype.bindTo = function(domObject) {
  var self = this;

  var trigger = function(evt) {
    var listeners = self.listeners[evt];
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]();
    }
  };

  domObject.addEventListener('keydown', function() {
    if (self.keyDown) {
      return;
    }
    self.keyDown = true;

    trigger('keyDown')
  });

  domObject.addEventListener('keyup', function() {
    self.keyDown = false;

    trigger('keyUp')
  });
};

KeyPressDispatcher.prototype.onKeyDown = function(fn) {
  this.listeners.keyDown.push(fn);
};

KeyPressDispatcher.prototype.onKeyUp = function(fn) {
  this.listeners.keyUp.push(fn);
};

function getTimestamp() {
  return new Date().getTime();
}

var KeyLogger = function() {
  this.startTime = 0;
};

KeyLogger.prototype.start = function() {
  this.startTime = getTimestamp();
};

KeyLogger.prototype.hit = function(id) {
  var t = getTimestamp();
  console.log(t - this.startTime);
};

window.onload = function() {
  var kl = new KeyLogger();

  // bind the key press dispatcher to the window
  var d = new KeyPressDispatcher();
  d.onKeyDown(function() { kl.hit('down'); });
  d.onKeyUp(function() { kl.hit('up'); });
  d.bindTo(window);

  // also add an event to the button to start
  var $button = document.getElementById('start-button');
  $button.addEventListener('click', function() {
    $button.setAttribute('style', 'display:none;');
    kl.start();
  });
};

