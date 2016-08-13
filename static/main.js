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

var Animator = function(startTime, endTime) {
  this.startTime = startTime;
  this.endTime = endTime;

  this.endTimeoutId = -1;
};

Animator.prototype.bindTo = function(video) {
  this.video = video;
};

Animator.prototype.start = function() {
  this.video.play();
  this.loop();
};

Animator.prototype.loop = function() {
  var self = this;
  var duration = self.endTime - self.startTime;

  var loopFn = function() {
    self.video.currentTime = self.startTime;
    self.endTimeoutId = setTimeout(loopFn, duration * 1000);
  };

  loopFn();
};

Animator.prototype.cancel = function() {
  if (this.endTimeoutId != -1) {
    clearTimeout(this.endTimeoutId);
  }
};

$(function() {
  // dom objects
  var $button = $("#trigger");
  var $counterDown = $("#counter-down");
  var $video = $("#video");
  var $info = $("#info");

  var keyLogger = new KeyLogger();

  var startTime = 0 * 60 + 3.3;
  var endTime = 1 * 60 + 42.2;

  var animator = new Animator(startTime, endTime);
  animator.bindTo($video.get(0));

  // bind the key press dispatcher to the window
  var eventDispatcher = new EventDispatcher();
  eventDispatcher.onPress(function() { keyLogger.hit("down"); });
  eventDispatcher.onRelease(function() { keyLogger.hit("up"); });
  eventDispatcher.bindTo($(window));

  var countDownDuration = 3000;
  var flashDuration = 3;

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

      // show a flash message
      $info.fadeIn(function() {
        setTimeout(function() {
          $info.fadeOut(function() {
            $video.fadeIn(function() {
              animator.start();
            });
          });
        }, flashDuration * 1000)
      });

    }, countDownDuration);
  });
});
