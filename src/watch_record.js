import {
  _LinkedList,
  _LinkedListItem,
  _WatchList,
  _ArgHandlerList,
  _EvalWatchList
} from './linked_list';

import {
  Watch
} from './watch';

var haveMap = (typeof WeakMap === "function" && typeof Map === "function");

class _Handler {
  constructor(watchGrp, expression) {
    _LinkedList._initialize(this);
    _LinkedListItem._initialize(this);
    _WatchList._initialize(this);

    this.watchGrp = watchGrp;
    this.expression = expression;
    this.watchRecord = this.forwardingHandler = null;
  }

  addReactionFn(reactionFn) {
    // TODO: Traceur assertions
    // assert(this._next !== this);
    // assert(typeof reactionFn === "function");
    return this.watchGrp._rootGroup._addDirtyWatch(_WatchList._add(this,
      new Watch(this.watchGrp, this.watchRecord, reactionFn)));
  }

  addForwardHandler(forwardToHandler) {
    // TODO: Traceur assertions
    // assert(forwardToHandler.forwardingHandler === null);
    _LinkedList._add(this, forwardToHandler);
    forwardToHandler.forwardingHandler = this;
  }

  // I'm not sure this really makes sense in JS, since we don't actually know when finallization
  // occurs. I think this is called manually in a few areas though, so I'll leave it for now.
  release() {
    if (_WatchList._isEmpty(this) && _LinkedList._isEmpty(this)) {
      this._releaseWatch();

      // Remove outselves from cache, or else new registrations will go to us, but we are dead
      // Potential GC pressure...
      if (this.watchGrp) {
        delete this.watchGrp._cache[this.expression];
      }

      if (this.forwardingHandler !== null) {
        // TODO(misko): why do we need this check? --- Because _LinkedList._remove() manipulates
        // properties of the list, and it will be referencing properties of null and throw a
        // noSuchMethod error if forwardingHandler === null
        _LinkedList._remove(this.forwardingHandler, this);
        this.forwardingHandler.release();
        this.forwardingHandler = null;
      }

      // We can remove ourselves
      this._next = this._previous = this;
    }
  }

  _releaseWatch() {
    this.watchRecord.remove();
    this.watchGrp._fieldCost--;
  }

  acceptValue(object) {
    return null;
  }

  onChange(record) {
    // TODO: Traceur assertions
    // assert(this._next !== this); // Verify we are not detached

    // If we have reaction functions, then queue them up for asynchronous processing.
    var watch = this._watchHead;
    var root = this.watchGrp._rootGroup;
    while (watch !== null) {
      root._addDirtyWatch(watch);
      watch = watch._nextWatch;
    }

    // If we have a delegateHandler, then forward the new value to it.
    var delegateHandler = this._head;
    while (delegateHandler !== null) {
      delegateHandler.acceptValue(record.currentValue);
      delegateHandler = delegateHandler._next;
    }
  }
}

export class _ConstantHandler extends _Handler {
  constructor(watchGroup, expression, constantValue) {
    super(watchGroup, expression);
    this.watchRecord = new _EvalWatchRecord.constant(this, constantValue);
  }

  release() {
    return null;
  }
}

export class _FieldHandler extends _Handler {
  constructor(watchGroup, expression) {
    super(watchGroup, expression);
  }

  // This function forwards the watched object to the next [_Handler] synchronously
  acceptValue(object) {
    this.watchRecord.object = object;
    if (this.watchRecord.check()) this.onChange(this.watchRecord);
  }
}

export class _CollectionHandler extends _Handler {
  constructor(watchGroup, expression) {
    super(watchGroup, expression);
  }

  // This function forwards the watched object to the next [_Handler] synchronously
  acceptValue(object) {
    this.watchRecord.object = object;
    if (this.watchRecord.check()) this.onChange(this.watchRecord);
  }

  _releaseWatch() {
    this.watchRecord.remove();
    this.watchGrp._collectionCost--;
  }
}

export class _ArgHandler extends _Handler {
  constructor(watchGroup, watchRecord, index) {
    // TODO(caitp): assert that watchRecord is an _EvalWatchRecord?
    super(watchGroup, 'arg[' + index + ']');
    this._previousArgHandler = this._nextArgHandler = null;
    this.watchRecord = watchRecord;
    this.index = index;
  }

  _releaseWatch() {
    return null;
  }

  acceptValue(object) {
    this.watchRecord.dirtyArgs = true;
    this.watchRecord.args[this.index] = object;
  }
}

export class _InvokeHandler extends _Handler {
  constructor(watchGroup, expression) {
    super(watchGroup, expression);
    _ArgHandlerList._initialize(this);
  }

  acceptValue(object) {
    this.watchRecord.object = object;
  }

  release() {
    super.release();
    var current = this._argHandlerHead;
    while (current !== null) {
      current.release();
      current = current._nextArgHandler;
    }
    // TODO(caitp): should _argHandlerHead/Tail be nulled here? Or would that cause too much GC
    // pressure.
  }

  _releaseWatch() {
    this.watchRecord.remove();
    // TODO(caitp): why return undefined here?
  }
}

var _MODE_DELETED_ = -1;
var _MODE_MARKER_ = 0;
var _MODE_FUNCTION_ = 1;
var _MODE_FUNCTION_APPLY_ = 2;
var _MODE_NULL_ = 3;
var _MODE_FIELD_CLOSURE_ = 4;
var _MODE_MAP_CLOSURE_ = 5;
var _MODE_METHOD_ = 6;

// TODO(caitp): This does not seem like the correct module for _EvalWatchRecord to live
export class _EvalWatchRecord {
  constructor(watchGrp, handler, fn, name, arity, marker) {
    this.watchGrp = watchGrp;
    this.handler = handler;
    this.name = name;
    this.fn = fn;
    // TODO(caitp): The ES6 draft is not super clear about what can be done with Symbols.
    // This may be entirely unnecessary.
    // this.symbol = name === null ? null : new Symbol(name);
    this._prevEvalWatch = this._nextEvalWatch = null;

    if (marker === true) return;
    this.args = new Array(arity);

    // TODO(caitp): Does the FunctionApply type really need to be implemented?
    if (typeof fn === 'function') {
      this.mode = _MODE_FUNCTION_;
    } else {
      this.mode = _MODE_NULL_;
    }
  }

  static marker() {
    var record = new _EvalWatchRecord(null, null, null, null, null, true);
    record.args = null;
    record.mode = _MODE_MARKER_;
    return record;
  }

  static constant(handler, constantValue) {
    var record = _EvalWatchRecord.marker();
    record.currentValue = constantValue;
    record.handler = handler;
    return record;
  }

  get field() {
    // TODO(caitp): does this look right for javascript? Some other representation might make more
    // sense.
    return '()';
  }

  get object() {
    return this._object;
  }

  set object(value) {
    // TODO(caitp): Traceur assertions
    // assert(this.mode !== _MODE_DeLETED_);
    // assert(this.mode !== _MODE_MARKER_);
    // assert(this.mode !== _MODE_FUNCTION_);
    // assert(this.mode !== _MODE_FUNCTION_APPLY_);
    // assert(this.symbol !== null);
    this._object = value;

    if (value === null) {
      this.mode = _MODE_NULL_;
    } else {
      if (haveMap && (value instanceof Map || value instanceof WeakMap)) {
        this.mode = _MODE_MAP_CLOSURE_;
      } else if (this.name) {
        this.mode = _MODE_METHOD_;
      }
    }
    /**
     * TODO(caitp): The usefulness of these blocks is yet to be discovered, but I'm sure it's out
     * there somewhere.
     *
     * else {
     *   if (value instanceof Map) {
     *     this.mode = _MODE_MAP_CLOSURE_;
     *   } else {
     *     this._instanceMirror = this.reflect(value);
     *     this.mode = this._hasMethod(this._instanceMirror, this.symbol)
     *               ? _MODE_METHOD_
     *               : _MODE_FIELD_CLOSURE_;
     *   }
     * }
     */
  }

  check() {
    var value;
    switch (this.mode) {
    case _MODE_MARKER_:
    case _MODE_NULL_:
      return false;
    case _MODE_FUNCTION_:
      if (!this.dirtyArgs) return false;
      value = this.fn.apply(null, this.args);
      this.dirtyArgs = false;
      break;
    case _MODE_METHOD_:
      value = methodInvoke(this._object, this.name, this.args);
      break;
    // TODO: the rest of these items don't really make sense in JS, as far as I can tell.
    // Investigate and ask about this.
    default:
      throw "UNREACHABLE";
    }

    var current = this.currentValue;
    if (current !== value) {
      if (current !== current && value !== value) {
        // Ignore, it appears to be a NaN -> NaN change.
        current = value;
      } else {
        this.previousValue = current;
        this.currentValue = value;
        this.handler.onChange(this);
        return true;
      }
    }
    return false;
  }

  get nextChange() {
    // TODO(caitp): Investigate this, it doesn't seem to make a lot of sense. Is this because it
    // lives in the evalWatchList rather than a different sort of list?
    return null;
  }

  remove() {
    // TODO(caitp): Traceur assertions
    // assert(this.mode !== _MODE_DELETED_);
    this.mode = _MODE_DELETED_;
    this.watchGrp._evalCost--;
    _EvalWatchList._remove(this.watchGrp, this);
  }

  toString() {
    if (this.mode === _MODE_MARKER_) return 'MARKER[' + this.currentValue + ']';
    return '' + this.watchGrp.id + ':' + this.handler.expression;
  }

  // TODO(caitp): worry about this later...
  // static _hasMethod(mirror, symbol) {
  //   return mirror.type.instanceMembers[symbol] is MethodMirror;
  // }
}

var __no_args__ = [];
function methodInvoke(object, method, args) {
  if (object || (typeof object !== 'undefined' && object !== null)) {
    if (typeof object[method] === "function") {
      return object[method].apply(object, args || __no_args__);
    }
  }
}
