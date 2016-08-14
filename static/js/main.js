"use strict";

var Shortcuts = function() {
  this.acceptedIds = {};
  this.keyPressed = {};
  this.listeners = {press: [], release: []};
};

Shortcuts.prototype.disable = function() {
  this.acceptedIds = {};
};

Shortcuts.prototype.accept = function(keys) {
  for (var i = 0; i < keys.length; i++) {
    this.acceptedIds[keys[i]] = true;
  }
};

Shortcuts.prototype.bindTo = function($obj) {
  var self = this;

  var trigger = function(type, id) {
    var listeners = self.listeners[type];
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](id);
    }
  };

  $obj.on("keydown", function(e) {
    var id = e.which;
    if (self.keyPressed[id]) {
      return;
    }
    self.keyPressed[id] = true;

    if (self.acceptedIds[id]) {
      trigger("press", id)
    }
  });

  $obj.on("keyup", function(e) {
    var id = e.which;

    self.keyPressed[id] = false;

    if (self.acceptedIds[id]) {
      trigger("release", id)
    }
  });
};

Shortcuts.prototype.onPress = function(fn) {
  this.listeners.press.push(fn);
};

Shortcuts.prototype.onRelease = function(fn) {
  this.listeners.release.push(fn);
};

var Button = function(id, text) {
  this.id = id;
  this.text = text;
  this.listeners = [];
  this.statusCode = "";
  this.$e = this.makeElement();
  this.render();
};

Button.prototype.appendTo = function($container) {
  this.$e.appendTo($container);
};

Button.prototype.onHit = function(fn) {
  this.listeners.push(fn);
};

Button.prototype.notifyListeners = function(type) {
  var self = this;
  for (var i = 0; i < self.listeners.length; i++) {
    self.listeners[i](self.id, type);
  }
};

Button.prototype.clearStatus = function() {
  this.statusCode = "";
  this.render();
};

Button.prototype.setStatus = function(statusCode) {
  this.statusCode = statusCode;
  this.render();
};

Button.prototype.render = function() {
  var baseClasses = ["btn", "btn-default", "btn-lg"];
  this.$e.attr("class", baseClasses.join(" "));
  if (this.statusCode) {
    this.$e.addClass("btn-" + this.statusCode);
  }
};

Button.prototype.makeElement = function() {
  var self = this;

  var $btn = $("<button type=\"button\"></button>");
  $btn.html(
      "<span class=\"pull-left\">[" + self.id + "]</span>"
      + self.text
      );

  $btn.mousedown(function() { self.notifyListeners("press"); });
  $btn.mouseup(function() { self.notifyListeners("release"); });

  return $btn;
};

var Controls = function(buttonDefinitions, baseId) {
  this.baseId = baseId;
  this.buttonDefinitions = buttonDefinitions;

  this.listeners = [];

  this.buttons = this.makeButtons();
  this.$e = this.makeElement();
};

Controls.prototype.makeButtons = function() {
  var self = this;

  var buttons = {};
  for (var id in self.buttonDefinitions) {
    id = parseInt(id);

    var btn = new Button(id, self.buttonDefinitions[id]);

    // JS = caca
    btn.onHit(function(id, type) {
      self.hit(self.baseId + id);
    });

    buttons[id] = btn;
  }

  return buttons;
};

Controls.prototype.makeElement = function() {
  var $e = $("<div></div>");
  $e.addClass("btn-group-vertical");
  for (var id in this.buttons) {
    this.buttons[id].appendTo($e);
  }
  return $e;
};

Controls.prototype.appendTo = function($container) {
  this.$e.appendTo($container);
};

Controls.prototype.clearStatus = function(id) {
  var btn = this.buttons[id];
  if (btn) {
    btn.clearStatus();
  }
};

Controls.prototype.setStatus = function(id, statusCode) {
  var btn = this.buttons[id];
  if (btn) {
    btn.setStatus(statusCode);
  }
};

Controls.prototype.hit = function(code, type) {
  console.log("Controls::hit");
  var id = code - this.baseId;

  // clear the status when releasing the key
  if (type == "press") {
    this.notifyListeners(id);
  } else {
    this.clearStatus(id);
  }
};

Controls.prototype.notifyListeners = function(id) {
  for (var i = 0; i < this.listeners.length; i++) {
    this.listeners[i](id);
  }
};

Controls.prototype.onHit = function(fn) {
  this.listeners.push(fn);
};

Controls.prototype.getKeyIds = function() {
  var keyIds = [];
  for (var id in this.buttons) {
    id = parseInt(id);
    keyIds.push(this.baseId + id);
  }
  return keyIds;
};

var VideoController = function(video, startTime, endTime) {
  this.video = video;

  this.startTime = startTime;
  this.endTime = endTime;

  this.endTimeoutId = -1;
};

VideoController.prototype.start = function() {
  this.video.play();
  this.loop();
};

VideoController.prototype.loop = function() {
  var self = this;
  var duration = self.endTime - self.startTime;

  var loopFn = function() {
    self.video.currentTime = self.startTime;
    self.endTimeoutId = setTimeout(loopFn, duration * 1000);
  };

  loopFn();
};

VideoController.prototype.cancel = function() {
  if (this.endTimeoutId != -1) {
    clearTimeout(this.endTimeoutId);
  }
};

function getTimestamp() {
  return new Date().getTime();
}

var EventQueue = function(events) {
  this.index = -1;
  this.events = events;
  this.timeoutId = -1;
  this.listeners = {cancel: [], success: [], finished: []};
  this.startTime = 0;
  this.allowedError = 1000;
};

EventQueue.prototype.start = function() {
  this.startTime = getTimestamp();
  this.queueNextEvent();
};

EventQueue.prototype.handleEvent = function(id) {
  console.log("EventQueue::handleEvent", this.index);
  var t = getTimestamp() - this.startTime;
  var currentEvent = this.events[this.index];
  if (Math.abs(currentEvent.time - t) < this.allowedError) {
    this.success(id);
  } else {
    this.cancel(id);
  }
};

EventQueue.prototype.queueNextEvent = function() {
  console.log("EventQueue::queueNextEvent");
  this.index++;
  if (this.index < this.events.length) {
    var currentEvent = this.events[this.index];
    var currentTime = getTimestamp() - this.startTime;
    var t = currentEvent.time - currentTime;
    if (t > 0) {
      var self = this;
      this.timeoutId = setTimeout(function() { self.cancel(currentEvent.id); }, t);
    } else {
      console.error("could not set timeout, negative time");
    }
  }
};

EventQueue.prototype.success = function(id) {
    if (this.timeoutId != -1) {
      clearTimeout(this.timeoutId);
      this.timeoutId = -1;

      this.queueNextEvent();

      this.notifyListeners("success", id);
    } else {
      this.notifyListeners("finished");
    }
};

EventQueue.prototype.cancel = function(id) {
  this.index = 0;
  this.startTime = getTimestamp();
  this.notifyListeners("cancel", id);
};

EventQueue.prototype.notifyListeners = function(type) {
  // ignore "type" argument
  var args = Array.prototype.slice.call(arguments);
  args = args.slice(1, args.length);

  var listeners = this.listeners[type];
  for (var i = 0; i < listeners.length; i++) {
    var fn = listeners[i];
    fn.apply(fn, args)
  }
};

EventQueue.prototype.onFinished = function(fn) {
  this.listeners.finished.push(fn);
};

EventQueue.prototype.onSuccess = function(fn) {
  this.listeners.success.push(fn);
};

EventQueue.prototype.onCancel = function(fn) {
  this.listeners.cancel.push(fn);
};

var Game = function(settings, videoElement, eventElement) {
    this.videoController = new VideoController(videoElement, settings.startTime, settings.endTime);
    this.controls = new Controls(settings.buttonDefinitions, settings.baseId);
    this.shortcuts = new Shortcuts();
    this.eventQueue = new EventQueue(settings.events);

    var self = this;

    this.shortcuts.onPress(function(code)   { self.controls.hit(code, "press"); });
    this.shortcuts.onRelease(function(code) { self.controls.hit(code, "release"); });
    this.shortcuts.bindTo($(eventElement));

    this.controls.onHit(function(id) { self.eventQueue.handleEvent(id); });

    // event queue events
    this.eventQueue.onSuccess(function(id) { self.onSuccess(id); });
    this.eventQueue.onFinished(function() { self.onFinished(); });
    this.eventQueue.onCancel(function(id) { self.onCancel(id); });
};

Game.prototype.onSuccess = function(id) {
  console.log("Game::onSuccess");
  this.controls.setStatus(id, "success");
};

Game.prototype.onCancel = function(id) {
  console.log("Game::onCancel");
  this.videoController.cancel();
  this.videoController.loop();
  this.controls.setStatus(id, "danger");
};

Game.prototype.onFinished = function() {
  console.log("Game::onFinished");
  this.shortcuts.disable();
  this.videoController.cancel();

  // TODO
};

Game.prototype.start = function($controlsElement) {
  this.shortcuts.accept(this.controls.getKeyIds());
  this.controls.appendTo($controlsElement);
  this.videoController.start();
  this.eventQueue.start();
};

function getSettings(fn) {
  $.getJSON('/static/video.json', function(settings) {
    console.log(settings);
    fn(settings);
  });
}

$(function() {
  // dom objects
  var $controls = $("#controls");

  // step objects
  var $step1 = $("#step1");
  var $step2 = $("#step2");
  var $step3 = $("#step3");

  // disable right click on video
  var $video = $("#video");
  $video.on("contextmenu", function(e) {
    return false;
  });

  getSettings(function(settings) {
    var game = new Game(settings, $video.get(0), window);

    // TODO: move to settings.json
    // var countDownDuration = 3000;
    // var flashDuration = 3;
    var countDownDuration = 0.5;
    var flashDuration = 0.5;

    var $counterDown = $("#counter-down");

    $counterDown.text(countDownDuration * 1000);

    $counterDown.counter({
      autoStart: false,
      countTo: 0,
      duration: countDownDuration * 1000,
      easing: "easeOutCubic"
    });

    // kick off
    var $button = $("#trigger");
    $button.click(function() {
      $button.hide();

      // show and start the countdown
      $counterDown.fadeIn();
      $counterDown.counter("start");

      // welcome to callback hell
      setTimeout(function() {
        $step1.fadeOut(function() {
          $step2.fadeIn(function() {
            setTimeout(function() {
              $step2.fadeOut(function() {
                $step3.fadeIn(function() {
                  game.start($controls);
                });
              });
            }, flashDuration * 1000)
          });
        });

      }, countDownDuration);
    });
  });
});
