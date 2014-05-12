define(['./linked_list', './watch'], function($__0,$__1) {
  "use strict";
  var __moduleName = "watch_record";
  if (!$__0 || !$__0.__esModule)
    $__0 = {'default': $__0};
  if (!$__1 || !$__1.__esModule)
    $__1 = {'default': $__1};
  var $__3 = $traceurRuntime.assertObject($__0),
      _LinkedList = $__3._LinkedList,
      _LinkedListItem = $__3._LinkedListItem,
      _WatchList = $__3._WatchList,
      _ArgHandlerList = $__3._ArgHandlerList,
      _EvalWatchList = $__3._EvalWatchList;
  var Watch = $traceurRuntime.assertObject($__1).Watch;
  var haveMap = (typeof WeakMap === "function" && typeof Map === "function");
  var _Handler = function _Handler(watchGrp, expression) {
    _LinkedList._initialize(this);
    _LinkedListItem._initialize(this);
    _WatchList._initialize(this);
    this.watchGrp = watchGrp;
    this.expression = expression;
    this.watchRecord = this.forwardingHandler = null;
  };
  ($traceurRuntime.createClass)(_Handler, {
    addReactionFn: function(reactionFn) {
      return this.watchGrp._rootGroup._addDirtyWatch(_WatchList._add(this, new Watch(this.watchGrp, this.watchRecord, reactionFn)));
    },
    addForwardHandler: function(forwardToHandler) {
      _LinkedList._add(this, forwardToHandler);
      forwardToHandler.forwardingHandler = this;
    },
    release: function() {
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
    },
    _releaseWatch: function() {
      this.watchRecord.remove();
      this.watchGrp._fieldCost--;
    },
    acceptValue: function(object) {
      return null;
    },
    onChange: function(record) {
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
  }, {});
  var _ConstantHandler = function _ConstantHandler(watchGroup, expression, constantValue) {
    $traceurRuntime.superCall(this, $_ConstantHandler.prototype, "constructor", [watchGroup, expression]);
    this.watchRecord = new _EvalWatchRecord.constant(this, constantValue);
  };
  var $_ConstantHandler = _ConstantHandler;
  ($traceurRuntime.createClass)(_ConstantHandler, {release: function() {
      return null;
    }}, {}, _Handler);
  var _FieldHandler = function _FieldHandler(watchGroup, expression) {
    $traceurRuntime.superCall(this, $_FieldHandler.prototype, "constructor", [watchGroup, expression]);
  };
  var $_FieldHandler = _FieldHandler;
  ($traceurRuntime.createClass)(_FieldHandler, {acceptValue: function(object) {
      this.watchRecord.object = object;
      if (this.watchRecord.check())
        this.onChange(this.watchRecord);
    }}, {}, _Handler);
  var _CollectionHandler = function _CollectionHandler(watchGroup, expression) {
    $traceurRuntime.superCall(this, $_CollectionHandler.prototype, "constructor", [watchGroup, expression]);
  };
  var $_CollectionHandler = _CollectionHandler;
  ($traceurRuntime.createClass)(_CollectionHandler, {
    acceptValue: function(object) {
      this.watchRecord.object = object;
      if (this.watchRecord.check())
        this.onChange(this.watchRecord);
    },
    _releaseWatch: function() {
      this.watchRecord.remove();
      this.watchGrp._collectionCost--;
    }
  }, {}, _Handler);
  var _ArgHandler = function _ArgHandler(watchGroup, watchRecord, index) {
    $traceurRuntime.superCall(this, $_ArgHandler.prototype, "constructor", [watchGroup, ("arg[" + index + "]")]);
    this._previousArgHandler = this._nextArgHandler = null;
    this.watchRecord = watchRecord;
    this.index = index;
  };
  var $_ArgHandler = _ArgHandler;
  ($traceurRuntime.createClass)(_ArgHandler, {
    _releaseWatch: function() {
      return null;
    },
    acceptValue: function(object) {
      this.watchRecord.dirtyArgs = true;
      this.watchRecord.args[this.index] = object;
    }
  }, {}, _Handler);
  var _InvokeHandler = function _InvokeHandler(watchGroup, expression) {
    $traceurRuntime.superCall(this, $_InvokeHandler.prototype, "constructor", [watchGroup, expression]);
    _ArgHandlerList._initialize(this);
  };
  var $_InvokeHandler = _InvokeHandler;
  ($traceurRuntime.createClass)(_InvokeHandler, {
    acceptValue: function(object) {
      this.watchRecord.object = object;
    },
    release: function() {
      $traceurRuntime.superCall(this, $_InvokeHandler.prototype, "release", []);
      var current = this._argHandlerHead;
      while (current !== null) {
        current.release();
        current = current._nextArgHandler;
      }
    },
    _releaseWatch: function() {
      this.watchRecord.remove();
    }
  }, {}, _Handler);
  var _MODE_DELETED_ = -1;
  var _MODE_MARKER_ = 0;
  var _MODE_FUNCTION_ = 1;
  var _MODE_FUNCTION_APPLY_ = 2;
  var _MODE_NULL_ = 3;
  var _MODE_FIELD_CLOSURE_ = 4;
  var _MODE_MAP_CLOSURE_ = 5;
  var _MODE_METHOD_ = 6;
  var _EvalWatchRecord = function _EvalWatchRecord(watchGrp, handler, fn, name, arity, marker) {
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
  };
  var $_EvalWatchRecord = _EvalWatchRecord;
  ($traceurRuntime.createClass)(_EvalWatchRecord, {
    get field() {
      return '()';
    },
    get object() {
      return this._object;
    },
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
    },
    check: function() {
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
    },
    get nextChange() {
      return null;
    },
    remove: function() {
      this.mode = _MODE_DELETED_;
      this.watchGrp._evalCost--;
      _EvalWatchList._remove(this.watchGrp, this);
    },
    toString: function() {
      if (this.mode === _MODE_MARKER_)
        return ("MARKER[" + this.currentValue + "]");
      return (this.watchGrp.id + ":" + this.handler.expression);
    }
  }, {
    marker: function() {
      var record = new $_EvalWatchRecord(null, null, null, null, null, true);
      record.args = null;
      record.mode = _MODE_MARKER_;
      return record;
    },
    constant: function(handler, constantValue) {
      var record = $_EvalWatchRecord.marker();
      record.currentValue = constantValue;
      record.handler = handler;
      return record;
    }
  });
  var __no_args__ = [];
  function methodInvoke(object, method, args) {
    if (object || (typeof object !== 'undefined' && object !== null)) {
      if (typeof object[method] === "function") {
        return object[method].apply(object, args || __no_args__);
      }
    }
  }
  return {
    get _ConstantHandler() {
      return _ConstantHandler;
    },
    get _FieldHandler() {
      return _FieldHandler;
    },
    get _CollectionHandler() {
      return _CollectionHandler;
    },
    get _ArgHandler() {
      return _ArgHandler;
    },
    get _InvokeHandler() {
      return _InvokeHandler;
    },
    get _EvalWatchRecord() {
      return _EvalWatchRecord;
    },
    __esModule: true
  };
});
