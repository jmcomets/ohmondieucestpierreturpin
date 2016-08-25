"use strict";

(function() {
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

  var VideoController = function($element) {
    this.endListeners = [];
    this.$element = $element;
  };

  VideoController.prototype.setSources = function(sources) {
    this.sources = sources;
  };

  VideoController.prototype.loadVideo = function(fn) {
    // add sources
    for (var i = 0; i < this.sources.length; i++) {
      var $source = $("<source />")
        .attr("src", this.sources[i].src)
        .attr("type", this.sources[i].type);
      this.$element.append($source);
    }

    this.video = this.$element.get(0);

    // disable right click on video
    this.$element.on("contextmenu", function(e) {
      return false;
    });

    // f**king fire callback
    this.video.oncanplaythrough = function() {
      fn();
    };

    if (this.video.readyState > 3) {
      this.video.oncanplaythrough = null;

      fn();
    }

    this.video.load();
    this.video.play();
    this.video.pause();
  };

  VideoController.prototype.start = function() {
    this.video.play();

    // set timeout to notify end listeners
    var self = this;
    this.video.addEventListener("ended", function() {
      self.notifyEnd();
    }, false);
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
    this.video.play();
    this.video.currentTime = 0.0;
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

  var ScoreBoard = function($elements) {
    this.$elements = $elements;

    this.score = 0;
    this.highScore = -1;
    this.mostFailed = -1;
    this.averageScore = -1;
    this.highScoreHolder = '';

    this.pollTimeoutId = -1;

    this.comboFactor = 1;
    this.maxComboFactor = 8;
  };

  ScoreBoard.prototype.configure = function(buttonDefinitions, scoring, pollRate) {
    this.buttonDefinitions = buttonDefinitions;
    this.scoring = scoring;
    this.pollRate = pollRate;
  };

  ScoreBoard.prototype.setNickname = function(nickname) {
    this.nickname = nickname;
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
      self.highScoreHolder = scores["high_score_holder"];
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
    var highScoreHolder = beatingHighScore ? this.nickname : this.highScoreHolder;
    this.$elements.highScore.attr("class", "label label-as-badge");
    if (beatingHighScore) {
      this.$elements.highScore.addClass("label-success");
    } else {
      this.$elements.highScore.addClass("label-default");
    }

    var highScoreText = highScore;
    if (highScoreHolder) {
      highScoreText += " (" + highScoreHolder + ")";
    }
    this.$elements.highScore.text(highScoreText);

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

  var Game = function($elements) {
    this.videoController = new VideoController($elements.video);
    this.controls = new Controls($elements.controls);
    this.shortcuts = new Shortcuts();
    this.eventQueue = new EventQueue();
    this.scoreBoard = new ScoreBoard($elements.scoreBoardElements);

    var self = this;

    this.shortcuts.onPress(function(code)   { self.controls.hit(code, "press"); });
    this.shortcuts.onRelease(function(code) { self.controls.hit(code, "release"); });
    this.shortcuts.bindTo($elements.events);

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

  Game.prototype.setNickname = function(nickname) {
    this.scoreBoard.setNickname(nickname);
  };

  Game.prototype.loadSettings = function(fn) {
    var self = this;
    this.getSettings(function(settings) {
      self.controls.configure(settings.buttonDefinitions, settings.baseId);

      self.shortcuts.accept(self.controls.getKeyIds());

      self.eventQueue.configure(settings.allowedError);
      self.eventQueue.setEvents(settings.events);

      self.scoreBoard.configure(settings.buttonDefinitions, settings.scoring, settings.pollRate);

      self.videoController.setSources(settings.sources);

      fn();
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

  Game.prototype.loadVideo = function(fn) {
    this.videoController.loadVideo(fn);
  };

  Game.prototype.getSettings = function(fn) {
    $.getJSON('/settings', function(settings) {
      fn(settings);
    });
  }

  $(function() {
    // disable focus on buttons (Bootstrap)
    $(".btn").on("mouseup", function(){ $(this).blur(); });

    var game = new Game({
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

    var $loadingStep = $("#loadingStep");
    $loadingStep.show();

    var countDownDuration  = 3 * 1000;
    var flashDuration      = 0.5 * 1000;
    var fadeDuration       = 0.4 * 1000;
    var loginSlideDuration = 0.8 * 1000;

    game.loadSettings(function() {
      $loadingStep.fadeOut(fadeDuration, function() {
        var $loginStep = $("#loginStep");
        $loginStep.animate({
          top: "0%",
        }, loginSlideDuration, function() {

          var $nicknameForm = $("#nickname-form");
          var $nickname = $("#nickname");
          $nicknameForm.one("submit", function(e) {
            var nickname = $.trim($nickname.val());
            if (!nickname) {
              return false;
            }

            game.setNickname(nickname);

            $loginStep.animate({ top: "-100%" }, loginSlideDuration);

            $loadingStep.fadeIn();
            game.loadVideo(function() {
              $loadingStep.fadeOut(fadeDuration, function() {

                // show a flash message
                $("#flashStep")
                  .fadeIn(fadeDuration)
                  .delay(flashDuration)
                  .fadeOut(fadeDuration, function() {

                    // show the game panel
                    var $gamePanel = $("#gamePanel");
                    $gamePanel.fadeIn(fadeDuration, function() {
                      game.start();
                    });
                  });
              });
            });

            e.preventDefault();
          });
        });
      });
    });
  });
})();
