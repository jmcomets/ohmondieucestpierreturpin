"use strict";

var EventDispatcher = function() {
  this.acceptedIds = {};
  this.keyDown = false;
  this.listeners = {press: [], release: []};
};

EventDispatcher.prototype.accept = function(keys) {
  for (var i = 0; i < keys.length; i++) {
    this.acceptedIds[keys[i]] = true;
  }
};

EventDispatcher.prototype.bindTo = function($obj) {
  var self = this;

  var trigger = function(type, id) {
    var listeners = self.listeners[type];
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](id);
    }
  };

  $obj.on("keydown", function(e) {
    if (self.keyDown) {
      return;
    }
    self.keyDown = true;

    var id = e.which;
    if (self.acceptedIds[id]) {
      trigger("press", id)
    }
  });

  $obj.on("keyup", function(e) {
    self.keyDown = false;

    var id = e.which;
    if (self.acceptedIds[id]) {
      trigger("release", id)
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

var Controls = function() {
  this.baseId = 48;

  this.buttons = {
    1: "They're taking the Hobbits",
    2: "To Isengard",
    3: "Gard",
    4: "What did you say?",
    5: "The Hobbits",
    6: "Tell me where is Gandalf",
    7: "For I much desire to speak with him",
    8: "The Balrog of Morgoth",
    9: "Stupid fatsy Hobbit"
  };
};

function shuffleArray(array) {
  for (var i = array.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var temp = array[i];
    array[i] = array[j];
    array[j] = temp;
  }
}

Controls.prototype.$element = function() {
  var self = this;
  var $buttons = [];
  for (var id in this.buttons) {
    id = parseInt(id);
    var $btn = $("<button></button>");
    $btn.text(this.buttons[id] + " [" + id + "]");
    //$button.addClass("TODO");

    // JS = caca
    (function(id) {
      $btn.click(function() {
      self.hit(self.baseId + id);
      });
    })(id);

    $buttons.push($btn);
  }

  //shuffleArray($buttons);

  var $e = $("<div></div>");
  for (var i = 0; i < $buttons.length; i++) {
    $buttons[i].appendTo($e);
  }

  return $e;
};

Controls.prototype.hit = function(code) {
  console.log("hit:", code - this.baseId);
};

Controls.prototype.getKeyIds = function() {
  var keyIds = [];
  for (var id in this.buttons)
  {
    id = parseInt(id);
    keyIds.push(this.baseId + id);
  }
  return keyIds;
};

var KeyLogger = function() {
  this.startTime = 0;
  this.events = [];
};

KeyLogger.prototype.start = function() {
  this.startTime = getTimestamp();
};

KeyLogger.prototype.press = function(id) {
  this.hit(id, "press");
};

KeyLogger.prototype.release = function(id) {
  this.hit(id, "release");
};

KeyLogger.prototype.hit = function(id, type) {
  var t = getTimestamp() - this.startTime;
  this.events.push({ type: type, id: id, time: t });
};

var Animator = function(video, startTime, endTime) {
  this.video = video;

  this.startTime = startTime;
  this.endTime = endTime;

  this.endTimeoutId = -1;
};

Animator.prototype.setKeyLogger = function(keyLogger) {
  this.keyLogger = keyLogger;
};

Animator.prototype.start = function() {
  this.video.play();
  this.loop();
};

Animator.prototype.loop = function() {
  var self = this;
  var duration = self.endTime - self.startTime;

  var loopFn = function() {
    if (self.endTimeoutId != -1) {
      console.log({ events: self.keyLogger.events });
    }
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
  var $controls = $("#controls");

  var keyLogger = new KeyLogger();

  var startTime = 0 * 60 + 3.3;
  var endTime = 1 * 60 + 42.2;

  var animator = new Animator($video.get(0), startTime, endTime);
  animator.setKeyLogger(keyLogger);

  var controls = new Controls();

  // bind the key press dispatcher to the window
  var eventDispatcher = new EventDispatcher();
  eventDispatcher.onPress(function(code)   { controls.hit(code); });
  eventDispatcher.onPress(function(code) { keyLogger.press(code); });
  eventDispatcher.onRelease(function(code) { keyLogger.release(code); });
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

  $video.on("contextmenu", function(e) {
    return false;
  });

  // kick off
  $button.click(function() {
    $button.hide();

    // start handling events
    eventDispatcher.accept(controls.getKeyIds());
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

              controls.$element().appendTo($controls);
            });
          });
        }, flashDuration * 1000)
      });

    }, countDownDuration);
  });
});
