// TODO: Hook up EventEmitter and create an all-in-one method

function subclass(P, C) {
  C.superproto = P;
  C.prototype = Object.create(P.prototype);
  C.prototype.constructor = C;
}

function Kikouken() {
  this.maxEventsSize = 20;
  this.chargeTime = 1000;
  this.events = [];
  this.mappings = {
    37: 'left',
    38: 'up',
    39: 'right',
    40: 'down',
    90: 'z',
    88: 'x',
    67: 'c'
  };

  // If a move does not specify "+" and a "+" is present in the events list, the
  // move should still match.
  this.moves = [
    ['hadouken', 'down, down-right, right, z'],
    ['shoriyuken', 'down, right, down-right, z'],
    ['sonic boom', 'hold left, right + z']
  ]
}

subclass(EventEmitter2, Kikouken);

Kikouken.prototype.bind = function(element) {
  $(element).on('keydown', _.bind(kikouken.keydown, kikouken));
  $(element).on('keyup', _.bind(kikouken.keyup, kikouken));
};

Kikouken.prototype.unbind = function(element) {
  $(element).off('keydown', _.bind(kikouken.keydown, kikouken));
  $(element).off('keyup', _.bind(kikouken.keyup, kikouken));
};

Kikouken.prototype.update = function() {
  var parsed = kikouken.parse();
  var move = kikouken.handle(parsed);

  if (move) {
    this.emit('special_move', move);
    this.events = [];
  }
}

Kikouken.prototype.present = function() {
  var i = 0,
    events = this.parse(),
    currentEvent,
    presented = [];
  for (; i < events.length; i++) {
    currentEvent = events[i];

    if (i !== 0) {
      if (currentEvent.isSimultaneous) {
        presented.push(' + ');
      } else {
        presented.push(', ');
      }
    }

    if (currentEvent.isCharged) {
      presented.push('hold ');
    }

    presented.push(currentEvent.mapping);
  }

  return presented.join('');
};

Kikouken.prototype.parse = function() {
  return (
    this.simplify(
      this.parseSimultaneals(
        this.parseCharges(
          this.parseDiagonalLifts(
            this.parseDiagonals(this.events)
          )
        )
      )
    )
  );
};

// TODO: Needs testing
Kikouken.prototype.handle = function(events) {
  var i = 0,
    j,
    k,
    move,
    moveName,
    moveString,
    parsedMove,
    event,
    parsedEvent;
  for (; i < this.moves.length; i++) {
    move = this.moves[i];
    moveName = move[0];
    moveString = move[1];
    parsedMove = this.parseMove(moveString);

    for (j = 0; j < events.length; j++) {
      for (k = 0; k < parsedMove.length; k++) {
        parsedEvent = parsedMove[k];
        event = events[j + k];

        if (event === undefined) {
          break;
        }

        if (parsedEvent.isSimultaneous && !event.isSimultaneous) {
          break;
        }

        if (parsedEvent.isCharged && !event.isCharged) {
          break;
        }

        if (parsedEvent.mapping !== event.mapping) {
          break;
        }
      }

      if (k === parsedMove.length) {
        return move;
      }
    }
  }
};

Kikouken.prototype.parseMove = function(moveString) {
  var i = 0,
    j,
    splitMoveString = moveString.split(', '),
    eventStrings,
    eventComponents,
    parsedEvent,
    parsedEvents = [];
  for (; i < splitMoveString.length; i++) {
    eventStrings = splitMoveString[i].split(' + ');
    for (j = 0; j < eventStrings.length; j++) {
      eventComponents = eventStrings[j].split(' ');
      parsedEvent = {};

      if (eventComponents[0] === 'hold') {
        parsedEvent.isCharged = true;
        parsedEvent.mapping = eventComponents[1]
      } else {
        parsedEvent.mapping = eventComponents[0]
      }

      if (j > 0) {
        parsedEvent.isSimultaneous = true;
      }

      parsedEvents.push(parsedEvent);
    }
  }

  return parsedEvents;
};

Kikouken.prototype.parseDiagonals = function(events) {
  var i = 0,
    previousEvent,
    currentEvent,
    parsedEvents = [],
    newEvent;
  for (; i < events.length; i++) {
    previousEvent = events[i - 1];
    currentEvent = events[i];
    newEvent = this.clone(currentEvent);

    if (
      previousEvent &&
      previousEvent.action === 'keydown' &&
      currentEvent.action === 'keydown'
    ) {
      if (
        previousEvent.mapping === 'left' &&
        currentEvent.mapping === 'up'
      ) {
        newEvent.mapping = 'up-left'
        newEvent.isDiagonal = true;
      } else if (
        previousEvent.mapping === 'up' &&
        currentEvent.mapping === 'left'
      ) {
        newEvent.mapping = 'up-left'
        newEvent.isDiagonal = true;
      } else if (
        previousEvent.mapping === 'right' &&
        currentEvent.mapping === 'up'
      ) {
        newEvent.mapping = 'up-right'
        newEvent.isDiagonal = true;
      } else if (
        previousEvent.mapping === 'up' &&
        currentEvent.mapping === 'right'
      ) {
        newEvent.mapping = 'up-right'
        newEvent.isDiagonal = true;
      } else if (
        previousEvent.mapping === 'left' &&
        currentEvent.mapping === 'down'
      ) {
        newEvent.mapping = 'down-left'
        newEvent.isDiagonal = true;
      } else if (
        previousEvent.mapping === 'down' &&
        currentEvent.mapping === 'left'
      ) {
        newEvent.mapping = 'down-left'
        newEvent.isDiagonal = true;
      } else if (
        previousEvent.mapping === 'right' &&
        currentEvent.mapping === 'down'
      ) {
        newEvent.mapping = 'down-right'
        newEvent.isDiagonal = true;
      } else if (
        previousEvent.mapping === 'down' &&
        currentEvent.mapping === 'right'
      ) {
        newEvent.mapping = 'down-right'
        newEvent.isDiagonal = true;
      }

      parsedEvents.push(newEvent);
    } else {
      parsedEvents.push(newEvent);
    }
  }

  return parsedEvents;
};

Kikouken.prototype.parseDiagonalLifts = function(events) {
  var i = 0,
    j,
    previousEvent,
    currentEvent,
    newEvent,
    possibleDiagonalEvent,
    splitMaping,
    parsedEvents = [],
    newEvent;
  for (; i < events.length; i++) {
    previousEvent = events[i - 1];
    currentEvent = events[i];
    newEvent = this.clone(currentEvent);

    if (currentEvent.action === 'keyup') {
      for(j = i - 1; j >= 0; j--) {
        if (
          parsedEvents[parsedEvents.length - 1] &&
          parsedEvents[parsedEvents.length - 1].action === 'keydown' &&
          parsedEvents[parsedEvents.length - 1].mapping === currentEvent.mapping
        ) {
          break;
        }

        possibleDiagonalEvent = events[j];

        if (
          possibleDiagonalEvent &&
          possibleDiagonalEvent.isDiagonal
        ) {
          splitMapping = possibleDiagonalEvent.mapping.split('-');
          if (splitMapping[0] === currentEvent.mapping) {
            newEvent.action = 'keydown';
            newEvent.oldAction = 'keyup';
            newEvent.mapping = splitMapping[1];
            newEvent.oldMapping = currentEvent.mapping;
            break;
          } else if (splitMapping[1] === currentEvent.mapping) {
            newEvent.action = 'keydown';
            newEvent.oldAction = 'keyup';
            newEvent.mapping = splitMapping[0];
            newEvent.oldMapping = currentEvent.mapping;
            break;
          }
        }
      }
    }

    if (newEvent.oldAction) {
      parsedEvents.push(this.clone(currentEvent));
    }

    parsedEvents.push(newEvent);
  }

  return parsedEvents;
};

Kikouken.prototype.parseCharges = function(events) {
  var i = 0,
    currentEvent,
    nextEvent,
    parsedEvents = [],
    newEvent;
  for (; i < events.length; i++) {
    currentEvent = events[i];
    nextEvent = events[i + 1];
    newEvent = this.clone(currentEvent);

    if (currentEvent.action === 'keydown') {
      if (nextEvent) {
        if (nextEvent.when - currentEvent.when > this.chargeTime) {
          newEvent.isCharged = true;
        }
      } else {
        if (this.now() - currentEvent.when > this.chargeTime) {
          newEvent.isCharged = true;
        }
      }
    }

    parsedEvents.push(newEvent);
  }

  return parsedEvents;
};

Kikouken.prototype.parseSimultaneals = function(events) {
  var i = 0,
    previousEvent,
    currentEvent,
    parsedEvents = [],
    newEvent;
  for (; i < events.length; i++) {
    previousEvent = events[i - 1];
    currentEvent = events[i];
    newEvent = this.clone(currentEvent);

    if (
      previousEvent &&
      previousEvent.action === 'keydown' &&
      currentEvent.action === 'keydown'
    ) {
      if (this.isDirectional(previousEvent.mapping)) {
        if (!this.isDirectional(currentEvent.mapping)) {
          newEvent.isSimultaneous = true;
        }
      }
    }

    parsedEvents.push(newEvent);
  }

  return parsedEvents;
};

Kikouken.prototype.simplify = function(events) {
  var i = 0,
    previousEvent,
    currentEvent,
    presentedEvent;
    presentedEvents = [];
  for (; i < events.length; i++) {
    currentEvent = events[i];

    if (currentEvent.action === 'keydown') {
      presentedEvent = {
        mapping: currentEvent.mapping
      };

      if (currentEvent.isSimultaneous) {
        presentedEvent.isSimultaneous = true;
      }

      if (currentEvent.isCharged) {
        presentedEvent.isCharged = true;
      }

      presentedEvents.push(presentedEvent);
    }
  }

  return presentedEvents;
};

Kikouken.prototype.isDirectional = function(mapping) {
  return (
    mapping === 'left' ||
    mapping === 'up-left' ||
    mapping === 'up' ||
    mapping === 'up-right' ||
    mapping === 'right' ||
    mapping === 'down-right' ||
    mapping === 'down' ||
    mapping === 'down-left'
  );
};

Kikouken.prototype.now = function() {
  return new Date().getTime();
};

Kikouken.prototype.clone = function(object) {
  return JSON.parse(JSON.stringify(object));
};

Kikouken.prototype.keydown = function(e) {
  var i = this.events.length - 1,
    currentEvent,
    mapping = this.mappings[e.keyCode];

  if (mapping === undefined) {
    return;
  }

  // Ignore repeating keys
  for (; i >= 0; i--) {
    currentEvent = this.events[i];
    if (
      currentEvent &&
      currentEvent.mapping === mapping
    ) {
      if (currentEvent.action === 'keyup') {
        break;
      } else {
        return;
      }
    }
  }

  this.events.push({
    keyCode: e.keyCode,
    mapping: mapping,
    when: this.now(),
    action: 'keydown'
  });

  while (this.events.length > this.maxEventsSize) {
    this.events.shift();
  }
};

Kikouken.prototype.keyup = function(e) {
  var mapping = this.mappings[e.keyCode];

  if (mapping === undefined) {
    return;
  }

  this.events.push({
    keyCode: e.keyCode,
    mapping: mapping,
    when: this.now(),
    action: 'keyup'
  });

  while (this.events.length > this.maxEventsSize) {
    this.events.shift();
  }
};

