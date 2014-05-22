"use strict";
var __moduleName = "watch_group";
var AST = $traceurRuntime.assertObject(require('./ast')).AST;
var $__1 = $traceurRuntime.assertObject(require('./linked_list')),
    _LinkedList = $__1._LinkedList,
    _LinkedListItem = $__1._LinkedListItem,
    _WatchList = $__1._WatchList,
    _WatchGroupList = $__1._WatchGroupList,
    _ArgHandlerList = $__1._ArgHandlerList,
    _EvalWatchList = $__1._EvalWatchList;
var $__1 = $traceurRuntime.assertObject(require('./watch_record')),
    _Handler = $__1._Handler,
    _ConstantHandler = $__1._ConstantHandler,
    _CollectionHandler = $__1._CollectionHandler,
    _InvokeHandler = $__1._InvokeHandler,
    _FieldHandler = $__1._FieldHandler,
    _ArgHandler = $__1._ArgHandler,
    _EvalWatchRecord = $__1._EvalWatchRecord;
var $__1 = $traceurRuntime.assertObject(require('./dirty_checking')),
    ChangeRecord = $__1.ChangeRecord,
    ChangeRecordIterator = $__1.ChangeRecordIterator;
function putIfAbsent(obj, key, ctor) {
  if (key in obj)
    return obj[key];
  return (obj[key] = ctor());
}
var WatchGroup = function WatchGroup(parentWatchGroup, getterCache, context, cache, rootGroup) {
  this._parentWatchGroup = parentWatchGroup;
  this._watchGroupHead = this._watchGroupTail = null;
  this._nextWatchGroup = this._prevWatchGroup = null;
  this.id = (parentWatchGroup.id + "." + parentWatchGroup._nextChildId++);
  this._getterCache = getterCache;
  this.context = context;
  this._cache = cache;
  this._rootGroup = rootGroup;
  this._nextChildId = 0;
  this._marker = _EvalWatchRecord.marker();
  this._marker.watchGrp = this;
  this._evalWatchHead = this._evalWatchTail = this._marker;
  this._dirtyMarker = ChangeRecord.marker();
  this._recordTail = this._parentWatchGroup._childInclRecordTail;
  this._recordHead = this._recordTail = this._recordAdd(this._dirtyMarker);
  this.fieldCost = 0;
  this.collectionCost = 0;
  this.evalCost = 0;
};
var $WatchGroup = WatchGroup;
($traceurRuntime.createClass)(WatchGroup, {
  get totalFieldCost() {
    var cost = this.fieldCost;
    var group = this._watchGroupHead;
    while (group !== null) {
      cost += group.totalFieldCost;
      group = group._nextWatchGroup;
    }
    return cost;
  },
  get totalCollectionCost() {
    var cost = this.collectionCost;
    var group = this._watchGroupHead;
    while (group !== null) {
      cost += group.totalCollectionCost;
      group = group._nextWatchGroup;
    }
    return cost;
  },
  get totalEvalCost() {
    var cost = this.evalCost;
    var group = this._watchGroupHead;
    while (group !== null) {
      cost += group.totalEvalCost;
      group = group._nextWatchGroup;
    }
    return cost;
  },
  get recordCount() {
    var count = 0,
        cursor = this._recordHead,
        end = this._childInclRecordTail;
    while (cursor !== null) {
      if (!cursor.isMarker) {
        ++count;
      }
      if (cursor === end)
        break;
      cursor = cursor.nextRecord;
    }
    return count;
  },
  get isAttached() {
    var group = this;
    var root = this._rootGroup;
    while (group !== null) {
      if (group === root) {
        return true;
      }
      group = group._parentWatchGroup;
    }
    return false;
  },
  watchExpression: function(expression, reactionFn) {
    var watchRecord;
    if (expression.expression in this._cache) {
      watchRecord = this._cache[expression.expression];
    } else {
      this._cache[expression.expression] = watchRecord = expression.setupWatch(this);
    }
    return watchRecord.handler.addReactionFn(reactionFn);
  },
  get _childWatchGroupTail() {
    var tail = this,
        nextTail;
    while ((nextTail = tail._watchGroupTail) !== null) {
      tail = nextTail;
    }
    return tail;
  },
  get _childInclRecordTail() {
    return this._childWatchGroupTail._recordTail;
  },
  newGroup: function(context) {
    var prev = this._childWatchGroupTail._evalWatchTail;
    var next = prev._nextEvalWatch;
    if (arguments.length === 0 || context === null) {
      context = this.context;
    }
    var root = this._rootGroup === null ? this : this._rootGroup;
    var cache = context === null ? this._cache : {};
    var childGroup = new $WatchGroup(this, this._getterCache, context, cache, root);
    _WatchGroupList._add(this, childGroup);
    var marker = childGroup._marker;
    marker._prevEvalWatch = prev;
    marker._nextEvalWatch = next;
    if (prev !== null)
      prev._nextEvalWatch = marker;
    if (next !== null)
      next._prevEvalWatch = marker;
    return childGroup;
  },
  remove: function() {
    var prevRecord = this._recordHead.prevRecord;
    var nextRecord = this._childInclRecordTail.nextRecord;
    if (prevRecord !== null)
      prevRecord.nextRecord = nextRecord;
    if (nextRecord !== null)
      nextRecord.prevRecord = prevRecord;
    this._recordHead._prevWatchGroup = null;
    this._recordTail._prevWatchGroup = null;
    this._recordHead = this._recordTail = null;
    _WatchGroupList._remove(this._parentWatchGroup, this);
    this._nextWatchGroup = this._prevWatchGroup = null;
    this._rootGroup._removeCount++;
    this._parentWatchGroup = null;
    var firstEvalWatch = this._evalWatchHead;
    var lastEvalWatch = (this._watchGroupTail === null ? this : this._watchGroupTail)._evalWatchTail;
    var prev = firstEvalWatch._prevEvalWatch;
    var next = lastEvalWatch._nextEvalWatch;
    if (prev !== null)
      prev._nextEvalWatch = next;
    if (next !== null)
      next._prevEvalWatch = prev;
    this._evalWatchHead._prevEvalWatch = null;
    this._evalWatchTail._nextEvalWatch = null;
    this._evalWatchHead = this._evalWatchTail = null;
  },
  toString: function() {
    var lines = [],
        watch;
    if (this === this._rootGroup) {
      var allWatches = [];
      watch = this._evalWatchHead;
      var prev = null;
      while (watch !== null) {
        allWatches.push(watch.toString());
        prev = watch;
        watch = watch._nextEvalWatch;
      }
      lines.push('WATCHES: ' + allWatches.join(', '));
    }
    var watches = [];
    watch = this._evalWatchHead;
    while (watch !== this._evalWatchTail) {
      watches.push(watch.toString());
      watch = watch._nextEvalWatch;
    }
    watches.push(watch.toString());
    lines.push(("WatchGroup[" + this.id + "](watches: " + watches.join(', ') + ")"));
    var childGroup = this._watchGroupHead;
    while (childGroup !== null) {
      lines.push(("  " + childGroup.toString().split('\n').join('\n  ')));
      childGroup = childGroup._nextWatchGroup;
    }
    return lines.join("\n");
  },
  addFieldWatch: function(lhs, name, expression) {
    var that = this;
    var fieldHandler = new _FieldHandler(this, expression);
    var watchRecord = this.watchField(null, name, fieldHandler);
    this.fieldCost++;
    fieldHandler.watchRecord = watchRecord;
    var lhsWR = putIfAbsent(this._cache, lhs.expression, function() {
      return lhs.setupWatch(that);
    });
    lhsWR.handler.addForwardHandler(fieldHandler);
    fieldHandler.acceptValue(lhsWR.currentValue);
    return watchRecord;
  },
  addCollectionWatch: function(ast) {
    var that = this;
    var collectionHandler = new _CollectionHandler(this, ast.expression);
    var watchRecord = this.watchField(null, null, collectionHandler);
    this.collectionCost++;
    collectionHandler.watchRecord = watchRecord;
    var astWR = putIfAbsent(this._cache, ast.expression, function() {
      return ast.setupWatch(that);
    });
    astWR.handler.addForwardHandler(collectionHandler);
    collectionHandler.acceptValue(astWR.currentValue);
    return watchRecord;
  },
  addFunctionWatch: function(fn, argsAST, expression) {
    return this._addEvalWatch(null, fn, null, argsAST, expression);
  },
  addMethodWatch: function(lhs, name, argsAST, expression) {
    return this._addEvalWatch(lhs, null, name, argsAST, expression);
  },
  _addEvalWatch: function(lhsAST, fn, name, argsAST, expression) {
    var that = this;
    var invokeHandler = new _InvokeHandler(this, expression);
    var evalWatchRecord = new _EvalWatchRecord(this, invokeHandler, fn, name, argsAST.length);
    invokeHandler.watchRecord = evalWatchRecord;
    if (lhsAST !== null) {
      var lhsWR = putIfAbsent(this._cache, lhsAST.expression, function() {
        return lhsAST.setupWatch(that);
      });
      lhsWR.handler.addForwardHandler(invokeHandler);
      invokeHandler.acceptValue(lhsWR.currentValue);
    }
    var i = 0;
    argsAST.map(function(ast) {
      return ast.setupWatch(that);
    }).forEach(function(record) {
      var argHandler = new _ArgHandler(this, evalWatchRecord, i++);
      _ArgHandlerList._add(invokeHandler, argHandler);
      record.handler.addForwardHandler(argHandler);
      argHandler.acceptValue(record.currentValue);
    });
    _EvalWatchList._add(this, evalWatchRecord);
    this.evalCost++;
    if (this._rootGroup.isInsideInvokeDirty) {
      evalWatchRecord.check();
    }
    return evalWatchRecord;
  },
  watchField: function(context, field, handler) {
    var getter = field === null ? null : this._getterCache.get(field);
    return this._recordAdd(new ChangeRecord(this, context, field, getter, handler));
  },
  _recordAdd: function(record) {
    var previous = this._recordTail,
        next = previous === null ? null : previous.nextRecord;
    record.nextRecord = next;
    record.prevRecord = previous;
    if (previous !== null)
      previous.nextRecord = record;
    if (next !== null)
      next.prevRecord = record;
    this._recordTail = record;
    if (previous === this._dirtyMarker)
      this._recordRemove(this._dirtyMarker);
    return record;
  },
  _recordRemove: function(record) {
    var previous = record.prevRecord,
        next = record.nextRecord;
    if (record === this._recordHead && record === this._recordTail) {
      this._recordHead = this._recordTail = this._dirtyMarker;
      this._dirtyMarker.nextRecord = next;
      this._dirtyMarker.prevRecord = previous;
      if (previous !== null)
        previous.nextRecord = this._dirtyMarker;
      if (next !== null)
        next.prevRecord = this._dirtyMarker;
    } else {
      if (record === this._recordTail)
        this._recordTail = previous;
      if (record === this._recordHead)
        this._recordHead = next;
      if (previous !== null)
        previous.nextRecord = next;
      if (next !== null)
        next.prevRecord = previous;
    }
  }
}, {});
var RootWatchGroup = function RootWatchGroup(getterCache, observerSelector, context) {
  this._getterCache = getterCache;
  this._observerSelector = observerSelector || {getObserver: function() {
      return null;
    }};
  this.context = context;
  this._cache = {};
  this._parentWatchGroup = null;
  this._watchGroupTail = this._watchGroupHead = null;
  this.id = '';
  this._nextChildId = 0;
  this._marker = _EvalWatchRecord.marker();
  this._marker.watchGrp = this;
  this._evalWatchHead = this._evalWatchTail = this._marker;
  this._dirtyWatchHead = this._dirtyWatchTail = null;
  this._fakeHead = ChangeRecord.marker();
  this._dirtyMarker = ChangeRecord.marker();
  this._recordHead = this._recordTail = this._dirtyMarker;
  this.fieldCost = 0;
  this.collectionCost = 0;
  this.evalCost = 0;
  this._rootGroup = this;
};
($traceurRuntime.createClass)(RootWatchGroup, {
  getObserver: function(obj, field) {
    return this._observerSelector.getObserver(obj, field);
  },
  detectChanges: function(exceptionHandler, changeLog, fieldStopWatch, evalStopWatch, processStopWatch) {
    var changeRecordIterator = this.collectChanges(exceptionHandler, fieldStopWatch);
    if (processStopWatch) {
      processStopWatch.start();
    }
    while (changeRecordIterator.iterate()) {
      var record = changeRecordIterator.current;
      if (changeLog) {
        changeLog(record.handler.expression, record.currentValue, record.previousValue);
      }
      record.handler.onChange(record);
    }
    if (processStopWatch) {
      processStopWatch.stop();
    }
    var evalRecord = this._evalWatchHead;
    var evalCount = 0;
    while (evalRecord !== null) {
      try {
        ++evalCount;
        if (evalRecord.check() && changeLog) {
          changeLog(evalRecord.handler.expression, evalRecord.currentValue, evalRecord.previousValue);
        }
      } catch (e) {
        if (exceptionHandler)
          exceptionHandler(e);
        else
          throw e;
      }
      evalRecord = evalRecord._nextEvalWatch;
    }
    if (evalStopWatch) {
      evalStopWatch.stop();
      evalStopWatch.increment(evalCount);
    }
    if (processStopWatch) {
      processStopWatch.stop();
    }
    var count = 0;
    var dirtyWatch = this._dirtyWatchHead;
    this._dirtyWatchHead = null;
    var root = this._rootGroup;
    root._removeCount = 0;
    try {
      while (dirtyWatch !== null) {
        count++;
        try {
          if (root._removeCount === 0 || dirtyWatch._watchGroup.isAttached) {
            dirtyWatch.invoke();
          }
        } catch (e) {
          if (exceptionHandler)
            exceptionHandler(e);
          else
            throw e;
        }
        var nextDirtyWatch = dirtyWatch._nextDirtyWatch;
        dirtyWatch._nextDirtyWatch = null;
        dirtyWatch = nextDirtyWatch;
      }
    } finally {
      this._dirtyWatchTail = null;
    }
    if (processStopWatch) {
      processStopWatch.stop();
      processStopWatch.increment(count);
    }
    return count;
  },
  collectChanges: function(exceptionHandler, stopwatch) {
    if (stopwatch) {
      stopwatch.start();
    }
    var changeTail = this._fakeHead,
        current = this._recordHead,
        count = 0;
    while (current !== null) {
      try {
        if (current.check()) {
          changeTail = changeTail.nextChange = current;
        }
        ++count;
      } catch (e) {
        if (exceptionHandler)
          exceptionHandler(e);
        else
          throw e;
      }
      current = current.nextRecord;
    }
    changeTail.nextChange = null;
    if (stopwatch) {
      stopwatch.stop();
      stopwatch.increment(count);
    }
    var changeHead = this._fakeHead.nextChange;
    this._fakeHead.nextChange = null;
    return new ChangeRecordIterator(changeHead);
  },
  get isInsideInvokeDirty() {
    return this._dirtyWatchHead === null && this._dirtyWatchTail !== null;
  },
  _addDirtyWatch: function(watch) {
    if (!watch._dirty) {
      watch._dirty = true;
      if (this._dirtyWatchTail === null) {
        this._dirtyWatchHead = this._dirtyWatchTail = watch;
      } else {
        this._dirtyWatchTail._nextDirtyWatch = watch;
        this._dirtyWatchTail = watch;
      }
      watch._nextDirtyWatch = null;
    }
    return watch;
  }
}, {}, WatchGroup);
module.exports = {
  get WatchGroup() {
    return WatchGroup;
  },
  get RootWatchGroup() {
    return RootWatchGroup;
  },
  __esModule: true
};
