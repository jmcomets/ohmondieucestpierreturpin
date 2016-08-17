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
  this.temporaryStatusTimeoutIds = {};
};

Controls.prototype.clearStatus = function(id) {
  var btn = this.buttons[id];
  if (btn) {
    this.clearTemporaryStatus(id);
    btn.clearStatus();
  }
};

Controls.prototype.setStatus = function(id, statusCode) {
  var btn = this.buttons[id];
  if (btn) {
    this.clearTemporaryStatus(id);
    btn.setStatus(statusCode);
  }
};

Controls.prototype.clearTemporaryStatus = function(id) {
  var timeoutId = this.temporaryStatusTimeoutIds[id];
  if (timeoutId) {
    clearTimeout(timeoutId);
    this.temporaryStatusTimeoutIds[id] = undefined;
  }
};

Controls.prototype.setTemporaryStatus = function(id, statusCode) {
  this.setStatus(id, statusCode);

  var duration = 2; // TODO: settings

  var self = this;
  this.temporaryStatusTimeoutIds[id] = setTimeout(function() {
    self.clearStatus(id);
  }, duration * 1000);
};

Controls.prototype.hit = function(code, type) {
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

var VideoController = function() {
  this.endTimeoutId = -1;
  this.endListeners = [];
};

VideoController.prototype.configure = function(video, startTime, endTime) {
  this.video = video;
  this.startTime = startTime;
  this.endTime = endTime;
};

VideoController.prototype.start = function() {
  this.video.play();
  this.video.currentTime = this.startTime;

  // set timeout to notify end listeners
  var self = this;
  self.endTimeoutId = setTimeout(function() {
    self.notifyEnd();
  }, (self.endTime - self.startTime) * 1000);
};

VideoController.prototype.notifyEnd = function(fn) {
  for (var i = 0; i < self.endListeners.length; i++) {
    self.endListeners[i]();
  }
};

VideoController.prototype.onEnd = function(fn) {
  this.endListeners.push(fn);
};

VideoController.prototype.restart = function() {
  if (this.endTimeoutId != -1) {
    clearTimeout(this.endTimeoutId);
    this.endTimeoutId = -1;
  }
  this.start();
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

EventQueue.prototype.restart = function() {
  if (this.cancelTimeoutId != -1) {
      clearTimeout(this.cancelTimeoutId);
      this.cancelTimeoutId = -1;
  }
  this.index = -1;
  this.start();
};

EventQueue.prototype.handleEvent = function(id) {
  var t = this.getRelativeTime();
  var currentEvent = this.events[this.index];
  if (currentEvent && id == currentEvent.id && Math.abs(t - currentEvent.time) <= this.allowedError) {
    this.success(id);
  } else {
    this.cancel(id);
  }
};

EventQueue.prototype.getRelativeTime = function() {
  return getTimestamp() - this.startTime;
};

EventQueue.prototype.queueNextEvent = function() {
  this.index++;
  if (this.index < this.events.length) {
    // compute time til next event
    var currentEvent = this.events[this.index];
    var currentTime = this.getRelativeTime();
    var t = (currentEvent.time - currentTime) + this.allowedError;

    if (t > 0) {
      var self = this;
      //console.log("will cancel in " + (t / 1000) + " seconds");
      this.cancelTimeoutId = setTimeout(function() { self.cancel(currentEvent.id); }, t);
    } else {
      console.error("could not set timeout, negative time");
    }
  } else {
    console.error("no events left");
  }
};

EventQueue.prototype.success = function(id) {
    if (this.cancelTimeoutId != -1) {
      clearTimeout(this.cancelTimeoutId);
      this.cancelTimeoutId = -1;

      this.notifyListeners("success", id);
    } else {
      this.notifyListeners("finished");
    }
};

EventQueue.prototype.cancel = function(id) {
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

function postData(url, data, success) {
  $.ajax({
    type: "POST",
    url: url,
    contentType: "application/json",
    dataType: "json",
    data: JSON.stringify(data),
    success: success
  });
}

var KeyLogger = function() {
  this.events = [];
  this.startTime = -1;

  var self = this;
  $("#debug").click(function() {
    console.log("dumping current events", self.events);
    postData("/debug", {"event": self.events});
    self.events = [];
  });
};

KeyLogger.prototype.start = function() {
  this.startTime = getTimestamp();
};

KeyLogger.prototype.handleEvent = function(id) {
  var t = getTimestamp() - this.startTime;
  this.events.push({time: t, id: id});
};

var ScoreBoard = function($highScoreElement, $averageScoreElement, $mostFailedElement) {
  this.$highScoreElement = $highScoreElement;
  this.$averageScoreElement = $averageScoreElement;
  this.$mostFailedElement = $mostFailedElement;

  this.score = 0;
  this.highScore = -1;
  this.mostFailed = -1;
  this.averageScore = -1;

  this.pollTimeoutId = -1;
};

ScoreBoard.prototype.configure = function(buttonDefinitions, scoring, pollRate) {
  this.buttonDefinitions = buttonDefinitions;
  this.scoring = scoring;
  this.pollRate = pollRate;
};

ScoreBoard.prototype.startPolling = function() {
  var self = this;

  var poll = function() {
    self.load(function() {
      self.render();
      self.pollTimeoutId = setTimeout(poll, self.pollRate * 1000);
    });
  };

  poll();
};

ScoreBoard.prototype.load = function(fn) {
  var self = this;
  $.getJSON("/score", function(scores) {
    self.highScore = scores["top_scores"][0];
    self.mostFailed = scores["most_failed"][0];
    self.averageScore = scores["average_score"];

    fn();
  });
};

ScoreBoard.prototype.success = function(id) {
  var scoreForThisId = this.scoring[id];
  if (scoreForThisId) {
    this.score += scoreForThisId;
    this.render();
  }
};

ScoreBoard.prototype.cancel = function(id) {
  var scoreForThisId = this.scoring[id];
  postData("/score", {"score": this.score, "failed_at": id});
  this.score = 0;
};

ScoreBoard.prototype.render = function() {
  // most failed
  var mostFailed = this.buttonDefinitions[this.mostFailed];
  if (mostFailed !== undefined) {
    this.$mostFailedElement.text(mostFailed);
  }

  // high score
  var beatingHighScore = this.score > this.highScore;
  var highScore = beatingHighScore ? this.score : this.highScore;
  this.$highScoreElement.attr("class", "label");
  if (beatingHighScore) {
    this.$highScoreElement.addClass("label-success");
  } else {
    this.$highScoreElement.addClass("label-default");
  }
  this.$highScoreElement.text(highScore);

  // average score
  var overAverageScore = this.score > this.averageScore;
  this.$averageScoreElement.attr("class", "label");
  if (overAverageScore) {
    this.$averageScoreElement.addClass("label-warning");
  } else {
    this.$averageScoreElement.addClass("label-default");
  }
  this.$averageScoreElement.text(this.averageScore);
};

var Game = function($videoElement, $eventElement,
                    $highScoreElement,
                    $averageScoreElement,
                    $mostFailedElement) {
  this.$videoElement = $videoElement;

  this.videoController = new VideoController();
  this.controls = new Controls();
  this.shortcuts = new Shortcuts();
  this.eventQueue = new EventQueue();

  var self = this;

  this.shortcuts.onPress(function(code)   { self.controls.hit(code, "press"); });
  this.shortcuts.onRelease(function(code) { self.controls.hit(code, "release"); });
  this.shortcuts.bindTo($eventElement);

  //this.keyLogger = new KeyLogger();
  //this.controls.onHit(function(id) { self.keyLogger.handleEvent(id); });
  //this.controls.onHit(function(id) { self.controls.setStatus(id, "warning"); });

  this.controls.onHit(function(id) { self.eventQueue.handleEvent(id); });
  this.eventQueue.onSuccess(function(id) { self.onSuccess(id); });
  this.eventQueue.onFinished(function() { self.onFinished(); });
  this.eventQueue.onCancel(function(id) { self.onCancel(id); });

  this.videoController.onEnd(function() { self.restart(); });

  this.scoreBoard = new ScoreBoard($highScoreElement, $averageScoreElement, $mostFailedElement);
};

Game.prototype.start = function($controlsElement) {
  this.shortcuts.accept(this.controls.getKeyIds());
  this.controls.appendTo($controlsElement);
  this.videoController.start();
  //this.keyLogger.start();
  this.scoreBoard.startPolling();
  this.eventQueue.start();
};

Game.prototype.load = function(fn) {
  var self = this;
  this.getSettings(function(settings) {
    self.controls.configure(settings.buttonDefinitions, settings.baseId);

    self.eventQueue.configure(settings.allowedError);
    self.eventQueue.setEvents(settings.events);

    self.scoreBoard.configure(settings.buttonDefinitions, settings.scoring, settings.pollRate);

    // load the video
    self.loadVideo(settings.src, settings.startTime, settings.endTime, fn);
  });
};

Game.prototype.loadVideo = function(src, startTime, endTime, fn) {
  var self = this;
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
    fn(settings);
  });
}

Game.prototype.onSuccess = function(id) {
  this.scoreBoard.success(id);
  this.controls.setStatus(id, "success");
  this.eventQueue.queueNextEvent();
};

Game.prototype.onCancel = function(id) {
  this.scoreBoard.cancel(id);
  this.controls.setTemporaryStatus(id, "danger");
  this.restart();
};

Game.prototype.restart = function() {
  this.videoController.restart();
  this.eventQueue.restart();
};

Game.prototype.onFinished = function() {
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

  var game = new Game($video, $(window), $("#high-score"), $("#average-score"), $("#most-failed"));

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
