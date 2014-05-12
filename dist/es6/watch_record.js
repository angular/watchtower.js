import {_LinkedList,
  _LinkedListItem,
  _WatchList,
  _ArgHandlerList,
  _EvalWatchList} from './linked_list';
import {Watch} from './watch';
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
    return this.watchGrp._rootGroup._addDirtyWatch(_WatchList._add(this, new Watch(this.watchGrp, this.watchRecord, reactionFn)));
  }
  addForwardHandler(forwardToHandler) {
    _LinkedList._add(this, forwardToHandler);
    forwardToHandler.forwardingHandler = this;
  }
  release() {
    if (_WatchList._isEmpty(this) && _LinkedList._isEmpty(this)) {
      this._releaseWatch();
      if (this.watchGrp) {
        delete this.watchGrp._cache[this.expression];
      }
      if (this.forwardingHandler !== null) {
        _LinkedList._remove(this.forwardingHandler, this);
        this.forwardingHandler.release();
        this.forwardingHandler = null;
      }
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
    var watch = this._watchHead;
    var root = this.watchGrp._rootGroup;
    while (watch !== null) {
      root._addDirtyWatch(watch);
      watch = watch._nextWatch;
    }
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
  acceptValue(object) {
    this.watchRecord.object = object;
    if (this.watchRecord.check())
      this.onChange(this.watchRecord);
  }
}
export class _CollectionHandler extends _Handler {
  constructor(watchGroup, expression) {
    super(watchGroup, expression);
  }
  acceptValue(object) {
    this.watchRecord.object = object;
    if (this.watchRecord.check())
      this.onChange(this.watchRecord);
  }
  _releaseWatch() {
    this.watchRecord.remove();
    this.watchGrp._collectionCost--;
  }
}
export class _ArgHandler extends _Handler {
  constructor(watchGroup, watchRecord, index) {
    super(watchGroup, `arg[${index}]`);
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
  }
  _releaseWatch() {
    this.watchRecord.remove();
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
export class _EvalWatchRecord {
  constructor(watchGrp, handler, fn, name, arity, marker) {
    this.watchGrp = watchGrp;
    this.handler = handler;
    this.name = name;
    this.fn = fn;
    this._prevEvalWatch = this._nextEvalWatch = null;
    if (marker === true)
      return;
    this.args = new Array(arity);
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
    return '()';
  }
  get object() {
    return this._object;
  }
  set object(value) {
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
  }
  check() {
    var value;
    switch (this.mode) {
      case _MODE_MARKER_:
      case _MODE_NULL_:
        return false;
      case _MODE_FUNCTION_:
        if (!this.dirtyArgs)
          return false;
        value = this.fn.apply(null, this.args);
        this.dirtyArgs = false;
        break;
      case _MODE_METHOD_:
        value = methodInvoke(this._object, this.name, this.args);
        break;
      default:
        throw "UNREACHABLE";
    }
    var current = this.currentValue;
    if (current !== value) {
      if (current !== current && value !== value) {
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
    return null;
  }
  remove() {
    this.mode = _MODE_DELETED_;
    this.watchGrp._evalCost--;
    _EvalWatchList._remove(this.watchGrp, this);
  }
  toString() {
    if (this.mode === _MODE_MARKER_)
      return `MARKER[${this.currentValue}]`;
    return `${this.watchGrp.id}:${this.handler.expression}`;
  }
}
var __no_args__ = [];
function methodInvoke(object, method, args) {
  if (object || (typeof object !== 'undefined' && object !== null)) {
    if (typeof object[method] === "function") {
      return object[method].apply(object, args || __no_args__);
    }
  }
}
