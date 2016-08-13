'use strict';

var EventDispatcher = function() {
  this.active = false;
  this.keyDown = false;
  this.listeners = {press: [], release: []};
};

EventDispatcher.prototype.activate = function() {
  this.active = true;
};

EventDispatcher.prototype.deactivate = function() {
  this.active = false;
};

EventDispatcher.prototype.bindTo = function($obj) {
  var self = this;

  var trigger = function(evt) {
    var listeners = self.listeners[evt];
    for (var i = 0; i < listeners.length; i++) {
      listeners[i]();
    }
  };

  // mobile events
  $obj.on("touchstart", function() {
    if (self.active) {
      trigger("press")
    }
  });

  $obj.on("touchend", function() {
    if (self.active) {
      trigger("release")
    }
  });

  // keyboard events
  $obj.on("keydown", function() {
    if (self.keyDown) {
      return;
    }
    self.keyDown = true;

    if (self.active) {
      trigger("press")
    }
  });

  $obj.on("keyup", function() {
    self.keyDown = false;

    if (self.active) {
      trigger("release")
    }
  });
};

EventDispatcher.prototype.onPress = function(fn) {
  this.listeners.press.push(fn);
};

EventDispatcher.prototype.onRelease = function(fn) {
  this.listeners.release.push(fn);
};

function getTimestamp() {
  return new Date().getTime();
}

var KeyLogger = function() {
  this.startTime = 0;
  this.events = [];
};

KeyLogger.prototype.start = function() {
  this.startTime = getTimestamp();
};

KeyLogger.prototype.hit = function(id) {
  var t = getTimestamp();
  this.events.push(t - this.startTime);
};

$(function() {
  // dom objects
  var $button = $("#trigger");
  var $counterDown = $("#counter-down");
  var $video = $("#video");
  var $info = $("#info");

  var keyLogger = new KeyLogger();

  // bind the key press dispatcher to the window
  var eventDispatcher = new EventDispatcher();
  eventDispatcher.onPress(function() { keyLogger.hit("down"); });
  eventDispatcher.onRelease(function() { keyLogger.hit("up"); });
  eventDispatcher.bindTo($(window));

  var countDownDuration = 3000;
  var endTime = 1 * 60 + 42;

  $counterDown.text(countDownDuration);

  $counterDown.counter({
    autoStart: false,
    countTo: 0,
    duration: countDownDuration,
    easing: "easeOutCubic"
  });

  $video.on('contextmenu', function(e) {
    return false;
  });

  // kick off
  $button.click(function() {
    $button.hide();

    // start handling events
    eventDispatcher.activate();
    keyLogger.start();

    // show and start the countdown
    $counterDown.show();
    $counterDown.counter("start");

    // ~callback
    setTimeout(function() {
      $counterDown.hide();

      $video.fadeIn();

      // show a flash message
      var flashDuration = 3;
      $info.fadeIn();
      setTimeout(function() { $info.fadeOut(); }, flashDuration * 1000)

      // start the video
      var video = $video.get(0);
      video.play();
      // loop video
      setTimeout(function() { video.currentTime = 3; }, endTime * 1000);

    }, countDownDuration);
  });
});
