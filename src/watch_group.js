import {
  AST
} from './ast.js';

import {
  WatchRecord
} from './change_detection.js';

import {
  _LinkedList,
  _LinkedListItem,
  _WatchList,
  _WatchGroupList,
  _ArgHandlerList,
  _EvalWatchList
} from './linked_list.js';

import {
  _Handler,
  _ConstantHandler,
  _CollectionHandler,
  _InvokeHandler,
  _FieldHandler,
  _ArgHandler,
  _EvalWatchRecord
} from './watch_record.js';

function putIfAbsent(obj, key, ctor) {
  if (key in obj) return obj[key];
  return (obj[key] = ctor());
}

export class WatchGroup {
  constructor(parentWatchGroup, changeDetector, context, cache, rootGroup) {
    // TODO: Traceur Assertions
    // assert(parentWatchGroup is WatchGroup)
    // assert(changeDetector is ChangeDetector)
    // assert(context and context is Function or Object)
    // assert(rootGroup is RootWatchGroup)
    this._parentWatchGroup = parentWatchGroup;
    // Initialize _WatchGroupList
    this._watchGroupHead = this._watchGroupTail = null;
    this._nextWatchGroup = this._prevWatchGroup = null;
    this.id = parentWatchGroup.id + '.' + parentWatchGroup._nextChildId++;
    this._changeDetector = changeDetector;
    this.context = context;
    this._cache = cache;
    this._rootGroup = rootGroup;
    this._nextChildId = 0;

    this._marker = _EvalWatchRecord.marker();
    this._marker.watchGrp = this;
    this._evalWatchHead = this._evalWatchTail = this._marker;

    // Stats...
    this._fieldCost = 0;
    this._collectionCost = 0;
    this._evalCost = 0;
  }

  // Stats: Number of field watchers which are in use
  get fieldCost() {
    return this._fieldCost;
  }

  // Stats: Number of field watchers which are in use including child groups
  get totalFieldCost() {
    var cost = this._fieldCost;
    var group = this._watchGroupHead;
    while (group !== null) {
      cost += group.totalFieldCost;
      group = group._nextWatchGroup;
    }
    return cost;
  }

  // Stats: Number of collection watchers which are in use
  get collectionCost() {
    return this._collectionCost;
  }

  // Stats: Number of collection watchers which are in use including child groups
  get totalCollectionCost() {
    var cost = this._collectionCost;
    var group = this._watchGroupHead;
    while (group !== null) {
      cost += group.totalCollectionCost;
      group = group._nextWatchGroup;
    }
    return cost;
  }

  // Stats: Number of invocation watchers (closures/methods) which are in use
  get evalCost() {
    return this._evalCost;
  }

  // Stats: Number of invocation watchers (closures/methods) which are in use, including child 
  // groups
  get totalEvalCost() {
    var cost = this._evalCost;
    var group = this._watchGroupHead;
    while (group !== null) {
      cost += group.totalEvalCost;
      group = group._nextWatchGroup;
    }
    return cost;
  }

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
  }

  // TODO:
  // I am not at all sure about the `expression` abstraction. In Angular.dart, this is a parse tree
  // or AST, and is tied rather closely to the core Parser implementation.
  //
  // In my mind, this library should be useful independent from the core Angular parser, but I am
  // not sure how to accomplish this elegantly. It seems that regardless of how this is structured,
  // there is going to be some overhead in converting to a parse tree understood by the 
  // dirty-checker.
  //
  // If anyone has any clever suggestions regarding this, please file an issue so that we can 
  // bike-shed this.
  watch(expression, reactionFn) {
    var watchRecord;
    if (expression.expression in this._cache) {
      watchRecord = this._cache[expression.expression];
    } else {
      this._cache[expression.expression] = watchRecord = expression.setupWatch(this);
    }
    return watchRecord.handler.addReactionFn(reactionFn);
  }

  get _childWatchGroupTail() {
    var tail = this, nextTail;
    while ((nextTail = tail._watchGroupTail) !== null) tail = nextTail;
    return tail;
  }

  // Create a new child [WatchGroup]
  //
  // - [context] if present the child [WatchGroup] expressions will evaluate against the new 
  // [context]. If not present than child expressions will evaluate on same context allowing
  // the reuse of the expression cache.
  newGroup(context) {
    var prev = this._childWatchGroupTail._evalWatchTail;
    var next = prev._nextEvalWatch;

    if (arguments.length === 0 || context === null) context = this.context;
    var root = this._rootGroup === null ? this : this._rootGroup;
    var cache = context === null ? this._cache : {};

    var childGroup = new WatchGroup(this, this._changeDetector.newGroup(), context, cache, root);
    _WatchGroupList._add(this, childGroup);

    var marker = childGroup._marker;

    marker._previousEvalWatch = prev;
    marker._nextEvalWatch = next;
    if (prev !== null) prev._nextEvalWatch = marker;
    if (next !== null) next._previousEvalWatch = marker;

    return childGroup;
  }

  // Remove/destroy [WatchGroup] and all of its watches
  remove() {
    // TODO:(misko) This code is not right.
    // 1) It fails to release [ChangeDetector] [WatchRecord]s
    // 2) it needs to cleanup caches if the cache is being shared

    _WatchGroupList._remove(this._parentWatchGroup, this);
    this._nextWatchGroup = this._prevWatchGroup = null;
    this._changeDetector.remove();
    this._rootGroup._removeCount++;
    this._parentWatchGroup = null;

    // Unlink the _watchRecord
    var firstEvalWatch = this._evalWatchHead;
    var lastEvalWatch = (this._watchGroupTail === null
                      ? this : this._watchGroupTail)._evalWatchTail;
    var prev = firstEvalWatch._previousEvalWatch;
    var next = lastEvalWatch._nextEvalWatch;
    if (prev !== null) prev._nextEvalWatch = next;
    if (next !== null) next._previousEvalWatch = prev;
  }

  toString() {
    var lines = [], watch;
    if (this === this._rootGroup) {
      var allWatches = [];
      watch = this._evalWatchHead;
      var prev = null;
      while (watch !== null) {
        allWatches.push(watch.toString());
        // TODO: Traceur assertions
        // assert(watch._previousEvalWatch === prev);
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

    lines.push('WatchGroup[' + this.id + '](watches: ' + watches.join(', ') + ')');
    var childGroup = this._watchGroupHead;
    while (childGroup !== null) {
      lines.push('  ' + childGroup.toString().split('\n').join('\n  '));
      childGroup = childGroup._nextWatchGroup;
    }
    return lines.join("\n");
  }

  //
  // Watch a name field on lhs represented by expression
  addFieldWatch(lhs, name, expression) {
    var that = this;
    var fieldHandler = new _FieldHandler(this, expression);

    // Create a ChangeRecord for the current field and assign the change record to the handler.
    var watchRecord = this._changeDetector.watch(null, name, fieldHandler);
    this._fieldCost++;
    fieldHandler.watchRecord = watchRecord;

    var lhsWR = putIfAbsent(this._cache, lhs.expression, function() {
      return lhs.setupWatch(that);
    });

    // We set a field forwarding handler on LHS. This will allow the change objects to propagate to
    // the current WatchRecord.
    lhsWR.handler.addForwardHandler(fieldHandler);

    // propagate the value from the LHS to here
    fieldHandler.acceptValue(lhsWR.currentValue);
    return watchRecord;
  }

  addCollectionWatch(ast) {
    var that = this;
    var collectionHandler = new _CollectionHandler(this, ast.expression);
    var watchRecord = this._changeDetector.watch(null, null, collectionHandler);
    this._collectionCost++;
    collectionHandler.watchRecord = watchRecord;

    // We set a field forwarding handler on LHS. This will allow the change objects to propagate to
    // the current WatchRecord.
    var astWR = putIfAbsent(this._cache, ast.expression, function() {
      return ast.setupWatch(that);
    });

    // propagate the value from the LHS to here
    collectionHandler.acceptValue(astWR.currentValue);

    return watchRecord;
  }

  addFunctionWatch(fn, argsAST, expression) {
    return this._addEvalWatch(null, fn, null, argsAST, expression);
  }

  addMethodWatch(lhs, name, argsAST, expression) {
    return this._addEvalWatch(lhs, null, name, argsAST, expression);
  }

  _addEvalWatch(lhsAST, fn, name, argsAST, expression) {
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

    // Convert the args from AST to WatchRecords
    var i = 0;
    argsAST.map(function(ast) {
      return ast.setupWatch(that);
    }).forEach(function(record) {
      var argHandler = new _ArgHandler(this, evalWatchRecord, i++);
      _ArgHandlerList._add(invokeHandler, argHandler);
      record.handler.addForwardHandler(argHandler);
      argHandler.acceptValue(record.currentValue);
    });

    // Must be done last
    _EvalWatchList._add(this, evalWatchRecord);
    this._evalCost++;

    return evalWatchRecord;
  }
}

export class RootWatchGroup extends WatchGroup {
  constructor(changeDetector, context) {
    // TODO: Traceur Assertions
    // assert(changeDetector is ChangeDetector)
    // assert(context and context is Function or Object)
    this._changeDetector = changeDetector;
    this.context = context;
    this._cache = {};

    this._parentWatchGroup = null;
    // Initialize _WatchGroupList
    this._watchGroupTail = this._watchGroupHead = null;

    this.id = '';
    this._nextChildId = 0;

    // TODO: When _EvalWatchRecord is implemented...
    this._marker = _EvalWatchRecord.marker();
    this._marker.watchGrp = this;
    this._evalWatchHead = this._evalWatchTail = this._marker;
    this._dirtyWatchHead = this._dirtyWatchTail = null;

    // Stats...
    this._fieldCost = 0;
    this._collectionCost = 0;
    this._evalCost = 0;
  }

  get _rootGroup() {
    return this;
  }

  // Detect changes and process the [ReactionFn]s
  //
  // Algorithm:
  // 1) process the [ChangeDetector#collectChanges]
  // 2) process function/closure/method changes
  // 3) call an [ReactionFn]s
  //
  // Each step is called in sequence. ([ReactionFn]s are not called until all previous steps are
  // completed).
  detectChanges(exceptionHandler, changeLog, fieldStopWatch, evalStopWatch, processStopWatch) {
    // 1) Process the ChangeRecords from the change detector
    var changeRecord = this._changeDetector.collectChanges(exceptionHandler, fieldStopWatch);
    if (processStopWatch) processStopWatch.start();
    while (changeRecord !== null) {
      if (changeLog)
        changeLog(changeRecord.handler.expression,
                  changeRecord.currentValue,
                  changeRecord.previousValue);
      changeRecord.handler.onChange(changeRecord);
      changeRecord = changeRecord.nextChange;
    }
    if (processStopWatch) processStopWatch.stop();

    // 2) Process function evaluations
    var evalRecord = this._evalWatchHead;
    var evalCount = 0;
    while (evalRecord !== null) {
      try {
        ++evalCount;
        var change = evalRecord.check();
        if (change !== null && changeLog)
          changeLog(evalRecord.handler.expression,
                    evalRecord.currentValue,
                    evalRecord.previousValue);
      } catch (e) {
        if (exceptionHandler) exceptionHandler(e);
        else throw e;
      }
      evalRecord = evalRecord._nextEvalWatch;
    }
    if (evalStopWatch) {
      evalStopWatch.stop();
      evalStopWatch.increment(evalCount);
    }

    if (processStopWatch) processStopWatch.stop();

    // Because the handler can forward changes between each other synchronously, we need to call
    // reaction functions asynchronously. This processes the asynchronous reaction function queue.
    var count = 0;
    var dirtyWatch = this._dirtyWatchHead;
    var root = this._rootGroup;
    root._removeCount = 0;

    while (dirtyWatch !== null) {
      count++;
      try {
        if (root._removeCount === 0 || dirtyWatch._watchGroup.isAttached) {
          dirtyWatch.invoke();
        }
      } catch (e) {
        if (exceptionHandler) exceptionHandler(e);
        else throw e;
      }
      var nextDirtyWatch = dirtyWatch._nextDirtyWatch;
      dirtyWatch._nextDirtyWatch = null;
      dirtyWatch = nextDirtyWatch;
    }
    this._dirtyWatchHead = this._dirtyWatchTail = null;
    if (processStopWatch) {
      processStopWatch.stop();
      processStopWatch.increment(count);
    }
    return count;
  }

  _addDirtyWatch(watch) {
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
}
