"use strict";
var __moduleName = "watch_group";
var AST = $traceurRuntime.assertObject(require('./ast')).AST;
var WatchRecord = $traceurRuntime.assertObject(require('./change_detection')).WatchRecord;
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
function putIfAbsent(obj, key, ctor) {
  if (key in obj)
    return obj[key];
  return (obj[key] = ctor());
}
var WatchGroup = function WatchGroup(parentWatchGroup, changeDetector, context, cache, rootGroup) {
  this._parentWatchGroup = parentWatchGroup;
  this._watchGroupHead = this._watchGroupTail = null;
  this._nextWatchGroup = this._prevWatchGroup = null;
  this.id = (parentWatchGroup.id + "." + parentWatchGroup._nextChildId++);
  this._changeDetector = changeDetector;
  this.context = context;
  this._cache = cache;
  this._rootGroup = rootGroup;
  this._nextChildId = 0;
  this._marker = _EvalWatchRecord.marker();
  this._marker.watchGrp = this;
  this._evalWatchHead = this._evalWatchTail = this._marker;
  this._fieldCost = 0;
  this._collectionCost = 0;
  this._evalCost = 0;
};
var $WatchGroup = WatchGroup;
($traceurRuntime.createClass)(WatchGroup, {
  get fieldCost() {
    return this._fieldCost;
  },
  get totalFieldCost() {
    var cost = this._fieldCost;
    var group = this._watchGroupHead;
    while (group !== null) {
      cost += group.totalFieldCost;
      group = group._nextWatchGroup;
    }
    return cost;
  },
  get collectionCost() {
    return this._collectionCost;
  },
  get totalCollectionCost() {
    var cost = this._collectionCost;
    var group = this._watchGroupHead;
    while (group !== null) {
      cost += group.totalCollectionCost;
      group = group._nextWatchGroup;
    }
    return cost;
  },
  get evalCost() {
    return this._evalCost;
  },
  get totalEvalCost() {
    var cost = this._evalCost;
    var group = this._watchGroupHead;
    while (group !== null) {
      cost += group.totalEvalCost;
      group = group._nextWatchGroup;
    }
    return cost;
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
  watch: function(expression, reactionFn) {
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
    while ((nextTail = tail._watchGroupTail) !== null)
      tail = nextTail;
    return tail;
  },
  newGroup: function(context) {
    var prev = this._childWatchGroupTail._evalWatchTail;
    var next = prev._nextEvalWatch;
    if (arguments.length === 0 || context === null)
      context = this.context;
    var root = this._rootGroup === null ? this : this._rootGroup;
    var cache = context === null ? this._cache : {};
    var childGroup = new $WatchGroup(this, this._changeDetector.newGroup(), context, cache, root);
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
    _WatchGroupList._remove(this._parentWatchGroup, this);
    this._nextWatchGroup = this._prevWatchGroup = null;
    this._changeDetector.remove();
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
    var watchRecord = this._changeDetector.watch(null, name, fieldHandler);
    this._fieldCost++;
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
    var watchRecord = this._changeDetector.watch(null, null, collectionHandler);
    this._collectionCost++;
    collectionHandler.watchRecord = watchRecord;
    var astWR = putIfAbsent(this._cache, ast.expression, function() {
      return ast.setupWatch(that);
    });
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
    this._evalCost++;
    if (this._rootGroup.isInsideInvokeDirty) {
      evalWatchRecord.check();
    }
    return evalWatchRecord;
  }
}, {});
var RootWatchGroup = function RootWatchGroup(changeDetector, context) {
  this._changeDetector = changeDetector;
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
  this._fieldCost = 0;
  this._collectionCost = 0;
  this._evalCost = 0;
};
($traceurRuntime.createClass)(RootWatchGroup, {
  get _rootGroup() {
    return this;
  },
  detectChanges: function(exceptionHandler, changeLog, fieldStopWatch, evalStopWatch, processStopWatch) {
    var changeDetector = this._changeDetector;
    var changeRecordIterator = changeDetector.collectChanges(exceptionHandler, fieldStopWatch);
    if (processStopWatch)
      processStopWatch.start();
    while (changeRecordIterator.iterate()) {
      var record = changeRecordIterator.current;
      if (changeLog)
        changeLog(record.handler.expression, record.currentValue, record.previousValue);
      record.handler.onChange(record);
    }
    if (processStopWatch)
      processStopWatch.stop();
    var evalRecord = this._evalWatchHead;
    var evalCount = 0;
    while (evalRecord !== null) {
      try {
        ++evalCount;
        if (evalRecord.check() && changeLog)
          changeLog(evalRecord.handler.expression, evalRecord.currentValue, evalRecord.previousValue);
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
    if (processStopWatch)
      processStopWatch.stop();
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
