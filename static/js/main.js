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

var Controls = function($container) {
  this.listeners = [];
  this.$container = $container;
};

Controls.prototype.configure = function(buttonDefinitions, baseId) {
  this.baseId = baseId;
  this.buttonDefinitions = buttonDefinitions;
  this.temporaryStatusTimeoutIds = {};
  this.updateButtons();
  this.render();
};

Controls.prototype.clearStatus = function(id) {
  var btn = this.buttons[id];
  if (btn) {
    this.clearTemporaryStatus(id);
    btn.clearStatus();
  }
};

Controls.prototype.render = function() {
  var $e = $("<div></div>");
  $e.addClass("btn-group-vertical");
  for (var id in this.buttons) {
    this.buttons[id].appendTo($e);
  }

  this.$container.html("");
  $e.appendTo(this.$container);
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

Controls.prototype.updateButtons = function() {
  var self = this;

  self.buttons = {};
  for (var id in self.buttonDefinitions) {
    id = parseInt(id);

    var btn = new Button(id, self.buttonDefinitions[id]);

    // JS = caca
    btn.onHit(function(id, type) {
      self.hit(self.baseId + id, type);
    });

    self.buttons[id] = btn;
  }
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
    self.endTimeoutId = -1;
    self.notifyEnd();
  }, (self.endTime - self.startTime) * 1000);
};

VideoController.prototype.notifyEnd = function(fn) {
  for (var i = 0; i < this.endListeners.length; i++) {
    this.endListeners[i]();
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
  this.listeners = {cancel: [], success: []};
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
    //console.error("no events left");
  }
};

EventQueue.prototype.success = function(id) {
  if (this.cancelTimeoutId != -1) {
    clearTimeout(this.cancelTimeoutId);
    this.cancelTimeoutId = -1;

    this.notifyListeners("success", id);
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

var ScoreBoard = function(nickname, $elements) {
  this.nickname = nickname;
  this.$elements = $elements;

  this.score = 0;
  this.highScore = -1;
  this.mostFailed = -1;
  this.averageScore = -1;

  this.pollTimeoutId = -1;

  this.comboFactor = 1;
  this.maxComboFactor = 8;
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
    self.highScore = Math.floor(scores["high_score"]);
    self.averageScore = Math.floor(scores["average_score"]);
    self.mostFailed = Math.floor(scores["most_failed"]);

    fn();
  });
};

ScoreBoard.prototype.success = function(id) {
  var scoreForThisId = this.scoring[id];
  if (scoreForThisId) {
    this.score += scoreForThisId * this.comboFactor;
    this.render();
  }
};

ScoreBoard.prototype.cancel = function(id) {
  var scoreForThisId = this.scoring[id];
  postData("/score", {"nickname": this.nickname, "final_score": this.score, "failed_at": id});
  this.score = 0;
  this.comboFactor = 1;
  this.render();
};

ScoreBoard.prototype.increaseCombo = function() {
  this.comboFactor *= 2;
  if (this.comboFactor > this.maxComboFactor) {
    this.comboFactor = this.maxComboFactor;
  }
};

ScoreBoard.prototype.render = function() {
  // most failed
  var mostFailed = this.buttonDefinitions[this.mostFailed];
  if (mostFailed !== undefined) {
    this.$elements.mostFailed.text(mostFailed);
  }

  // high score
  var beatingHighScore = this.score > this.highScore;
  var highScore = beatingHighScore ? this.score : this.highScore;
  this.$elements.highScore.attr("class", "label label-as-badge");
  if (beatingHighScore) {
    this.$elements.highScore.addClass("label-success");
  } else {
    this.$elements.highScore.addClass("label-default");
  }
  this.$elements.highScore.text(highScore);

  // average score
  var overAverageScore = this.score > this.averageScore;
  this.$elements.averageScore.attr("class", "label label-as-badge");
  if (overAverageScore) {
    this.$elements.averageScore.addClass("label-warning");
  } else {
    this.$elements.averageScore.addClass("label-default");
  }
  this.$elements.averageScore.text(this.averageScore);

  // current score
  this.$elements.currentScore.attr("class", "label label-as-badge");
  this.$elements.currentScore.text(this.score);

  // current combo
  this.$elements.currentCombo.attr("class", "label label-as-badge");
  this.$elements.currentCombo.text(this.comboFactor);
};

var Game = function(nickname, $elements) {
  this.$videoElement = $elements.video;

  // disable right click on video
  this.$videoElement.on("contextmenu", function(e) { return false; });

  this.videoController = new VideoController();
  this.controls = new Controls($elements.controls);
  this.shortcuts = new Shortcuts();
  this.eventQueue = new EventQueue();
  this.scoreBoard = new ScoreBoard(nickname, $elements.scoreBoardElements);

  var self = this;

  this.shortcuts.onPress(function(code)   { self.controls.hit(code, "press"); });
  this.shortcuts.onRelease(function(code) { self.controls.hit(code, "release"); });
  this.shortcuts.bindTo($elements.events);

  this.shortcuts.accept(this.controls.getKeyIds());

  this.videoController.onEnd(function() { self.restartSuccessfully(); });

  this.controls.onHit(function(id) { self.eventQueue.handleEvent(id); });
  this.eventQueue.onSuccess(function(id) { self.onSuccess(id); });
  this.eventQueue.onCancel(function(id) { self.onCancel(id); });
};

Game.prototype.start = function() {
  this.videoController.start();
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

    self.loadVideo(settings.src, settings.startTime, settings.endTime, fn);
  });
};

Game.prototype.restartSuccessfully = function() {
  this.scoreBoard.increaseCombo();
  this.restart();
};

Game.prototype.restart = function() {
  this.videoController.restart();
  this.eventQueue.restart();
};

Game.prototype.onSuccess = function(id) {
  this.controls.setStatus(id, "success");
  this.scoreBoard.success(id);
  this.eventQueue.queueNextEvent();
};

Game.prototype.onCancel = function(id) {
  this.controls.setTemporaryStatus(id, "danger");
  this.scoreBoard.cancel(id);
  this.restart();
};

Game.prototype.loadVideo = function(src, startTime, endTime, fn) {
  var self = this;
  self.$videoElement.find("source").first().attr("src", src);
  var video = self.$videoElement.get(0);
  video.addEventListener("loadedmetadata", function() {
    self.videoController.configure(video, startTime, endTime);

    fn();
  });
  video.load();
};

Game.prototype.getSettings = function(fn) {
  $.getJSON('/settings', function(settings) {
    fn(settings);
  });
}

$(function() {
  // disable focus on buttons (Bootstrap)
  $(".btn").on("mouseup", function(){ $(this).blur(); });

  var $nicknameForm = $("#nickname-form");
  var $nickname = $("#nickname");
  $nicknameForm.submit(function(e) {
    e.preventDefault();

    var nickname = $.trim($nickname.val());
    if (!nickname) {
      return false;
    }

    $("#loginStep").hide();

    // load the game info
    var $loadingStep = $("#loadingStep");
    $loadingStep.show();

    var game = new Game(nickname, {
      controls: $("#controls"),
      events:   $(window),
      video:    $("#video"),
      scoreBoardElements: {
        averageScore: $("#average-score"),
        currentCombo: $("#current-combo"),
        currentScore: $("#current-score"),
        highScore:    $("#high-score"),
        mostFailed:   $("#most-failed")
      }
    });

    game.load(function() {
      $loadingStep.hide();

      // TODO: move to settings
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

      // show and start the countdown
      $counterDown.fadeIn();
      $counterDown.counter("start");

      // welcome to callback hell
      setTimeout(function() {
        var $step1 = $("#step1");
        var $step2 = $("#step2");
        var $step3 = $("#step3");

        $step1.fadeOut(function() {
          $step2.fadeIn(function() {
            setTimeout(function() {
              $step2.fadeOut(function() {
                $step3.fadeIn(function() {
                  game.start();
                });
              });
            }, flashDuration * 1000)
          });
        });

      }, countDownDuration);
    });
  });

});
