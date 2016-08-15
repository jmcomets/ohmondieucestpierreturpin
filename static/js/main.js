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

  $btn.on("mousedown", function() { self.notifyListeners("press"); });
  $btn.on("mouseup", function() { self.notifyListeners("release"); });
  // $btn.on("touchstart", function() { self.notifyListeners("press"); });
  // $btn.on("touchend", function() { self.notifyListeners("release"); });

  return $btn;
};

var Controls = function() {
  this.listeners = [];
};

Controls.prototype.configure = function(buttonDefinitions, baseId) {
  this.baseId = baseId;
  this.buttonDefinitions = buttonDefinitions;
  this.buttons = this.makeButtons();
  this.$e = this.makeElement();
};

Controls.prototype.makeElement = function() {
  var $e = $("<div></div>");
  $e.addClass("btn-group-vertical");
  for (var id in this.buttons) {
    this.buttons[id].appendTo($e);
  }
  return $e;
};

Controls.prototype.makeButtons = function() {
  var self = this;

  var buttons = {};
  for (var id in self.buttonDefinitions) {
    id = parseInt(id);

    var btn = new Button(id, self.buttonDefinitions[id]);

    // JS = caca
    btn.onHit(function(id, type) {
      self.hit(self.baseId + id, type);
    });

    buttons[id] = btn;
  }

  return buttons;
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
  var id = code - this.baseId;
  console.log("Controls::hit", id);

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

var VideoController = function() {
  this.endTimeoutId = -1;
};

VideoController.prototype.configure = function(video, startTime, endTime) {
  this.video = video;

  this.startTime = startTime;
  this.endTime = endTime;
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

var EventQueue = function() {
  this.index = -1;
  this.cancelTimeoutId = -1;
  this.listeners = {cancel: [], success: [], finished: []};
  this.startTime = 0;
};

EventQueue.prototype.configure = function(allowedError) {
  this.allowedError = allowedError;
  this.allowedError *= 1000; // in ms
};

EventQueue.prototype.setEvents = function(events) {
  this.events = events;
};

EventQueue.prototype.start = function() {
  this.startTime = getTimestamp();
  this.queueNextEvent();
};

EventQueue.prototype.handleEvent = function(id) {
  console.log("EventQueue::handleEvent", this.index);
  var t = this.getRelativeTime();
  var currentEvent = this.events[this.index];
  if (Math.abs(t - currentEvent.time) < this.allowedError) {
    this.success(id);
  } else {
    this.cancel(id);
  }
};

EventQueue.prototype.getRelativeTime = function() {
  return getTimestamp() - this.startTime;
};

EventQueue.prototype.queueNextEvent = function() {
  console.log("EventQueue::queueNextEvent");
  this.index++;
  if (this.index < this.events.length) {
    // compute time til next event
    var currentEvent = this.events[this.index];
    var currentTime = this.getRelativeTime();
    var t = currentEvent.time - currentTime;

    if (t > 0) {
      var self = this;
      this.cancelTimeoutId = setTimeout(function() { self.cancel(currentEvent.id); },
                                  t + this.allowedError);
    } else {
      console.error("could not set timeout, negative time");
    }
  }
};

EventQueue.prototype.success = function(id) {
    if (this.cancelTimeoutId != -1) {
      clearTimeout(this.cancelTimeoutId);
      this.cancelTimeoutId = -1;

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

var Game = function($videoElement, $eventElement) {
  this.$videoElement = $videoElement;

  this.videoController = new VideoController();
  this.controls = new Controls();
  this.shortcuts = new Shortcuts();
  this.eventQueue = new EventQueue();

  var self = this;

  this.shortcuts.onPress(function(code)   { self.controls.hit(code, "press"); });
  this.shortcuts.onRelease(function(code) { self.controls.hit(code, "release"); });
  this.shortcuts.bindTo($eventElement);

  this.controls.onHit(function(id) { self.eventQueue.handleEvent(id); });

  // event queue events
  this.eventQueue.onSuccess(function(id) { self.onSuccess(id); });
  this.eventQueue.onFinished(function() { self.onFinished(); });
  this.eventQueue.onCancel(function(id) { self.onCancel(id); });
};

Game.prototype.start = function($controlsElement) {
  this.shortcuts.accept(this.controls.getKeyIds());
  this.controls.appendTo($controlsElement);
  this.videoController.start();
  this.eventQueue.start();
};

Game.prototype.load = function(fn) {
  var self = this;
  this.getSettings(function(settings) {
    self.controls.configure(settings.buttonDefinitions, settings.baseId);

    self.eventQueue.configure(settings.allowedError);
    self.eventQueue.setEvents(settings.events);

    // load the video
    self.loadVideo(settings.src, settings.startTime, settings.endTime, fn);
  });
};

Game.prototype.loadVideo = function(src, startTime, endTime, fn) {
  var self = this;
  console.log(src);
  self.$videoElement.find("source").first().attr("src", src);
  var video = self.$videoElement.get(0);
  video.oncanplay = function() {
    self.videoController.configure(video, startTime, endTime);
    video.oncanplay = null;

    // all is loaded
    fn();
  };
  video.load();
};

Game.prototype.getSettings = function(fn) {
  $.getJSON('/static/settings.json', function(settings) {
    //console.log(settings);
    fn(settings);
  });
}

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

$(function() {
  // dom objects
  var $controls = $("#controls");

  // step objects
  var $step1 = $("#step1");
  var $step2 = $("#step2");
  var $step3 = $("#step3");
  var $loadingStep = $("#loadingStep");

  // disable right click on video
  var $video = $("#video");
  $video.on("contextmenu", function(e) {
    return false;
  });

  // disable focus on buttons (Bootstrap)
  $(".btn").on("mouseup", function(){ $(this).blur(); });
  $(".btn").on("touchend", function(){ $(this).blur(); });

  var game = new Game($video, $(window));

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

  var $button = $("#trigger");
  $button.click(function() {
    $button.hide();

    $loadingStep.show();
    game.load(function() {
      $loadingStep.hide();

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
