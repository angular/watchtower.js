import {
  AST
} from './ast';

import {
  _LinkedList,
  _LinkedListItem,
  _WatchList,
  _WatchGroupList,
  _ArgHandlerList,
  _EvalWatchList
} from './linked_list';

import {
  _Handler,
  _ConstantHandler,
  _CollectionHandler,
  _InvokeHandler,
  _FieldHandler,
  _ArgHandler,
  _EvalWatchRecord
} from './watch_record';

import {
  ChangeRecord,
  ChangeRecordIterator
} from './dirty_checking';

function putIfAbsent(obj, key, ctor) {
  if (key in obj) return obj[key];
  return (obj[key] = ctor());
}

export class WatchGroup {
  constructor(id, getterCache, context, cache, rootGroup) {
    this.id = id;

    // Initialize _WatchGroupList
    this._watchGroupHead = this._watchGroupTail = null;
    this._nextWatchGroup = this._prevWatchGroup = null;
    this._dirtyWatchHead = this._dirtyWatchTail = null;

    this._getterCache = getterCache;
    this.context = context;
    this._cache = cache;
    this._rootGroup = rootGroup;
    this._nextChildId = 0;

    this._marker = _EvalWatchRecord.marker();
    this._marker.watchGrp = this;
    this._evalWatchHead = this._evalWatchTail = this._marker;

    this._dirtyMarker = ChangeRecord.marker();
    this._recordHead = this._recordTail = this._dirtyMarker;

    // Stats...
    this.fieldCost = 0; // Stats: Number of field watchers which are in use
    this.collectionCost = 0; // Stats: Number of collection watchers which are in use
    this.evalCost = 0; // Stats: Number of invocation watchers (closures/methods) which are in use
  }

  // Stats: Number of field watchers which are in use including child groups
  get totalFieldCost() {
    var cost = this.fieldCost;
    var group = this._watchGroupHead;

    while (group !== null) {
      cost += group.totalFieldCost;
      group = group._nextWatchGroup;
    }

    return cost;
  }

  // Stats: Number of collection watchers which are in use including child groups
  get totalCollectionCost() {
    var cost = this.collectionCost;
    var group = this._watchGroupHead;

    while (group !== null) {
      cost += group.totalCollectionCost;
      group = group._nextWatchGroup;
    }

    return cost;
  }

  // Stats: Number of invocation watchers (closures/methods) which are in use, including child
  // groups
  get totalEvalCost() {
    var cost = this.evalCost;
    var group = this._watchGroupHead;

    while (group !== null) {
      cost += group.totalEvalCost;
      group = group._nextWatchGroup;
    }

    return cost;
  }

  get recordCount() {
    var count = 0,
        cursor = this._recordHead,
        end = this._childInclRecordTail;

    while (cursor !== null) {
      if (!cursor.isMarker) {
        ++count;
      }

      if (cursor === end) break;

      cursor = cursor.nextRecord;
    }

    return count;
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
  watchExpression(expression, reactionFn) {
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

    while ((nextTail = tail._watchGroupTail) !== null) {
      tail = nextTail;
    }

    return tail;
  }

  get _childInclRecordTail() {
    return this._childWatchGroupTail._recordTail;
  }

  // Create a new child [WatchGroup]
  //
  // - [context] if present the child [WatchGroup] expressions will evaluate against the new
  // [context]. If not present than child expressions will evaluate on same context allowing
  // the reuse of the expression cache.
  newGroup(context) {
    if (arguments.length === 0 || context === null) {
      context = this.context;
    }

    var root = this._rootGroup === null ? this : this._rootGroup;
    var id = `${this.id}.${this._nextChildId++}`;
    var cache = context === null ? this._cache : {};

    var childGroup = new WatchGroup(id, this._getterCache, context, cache, root);

    return childGroup;
  }

  addGroup(childGroup){
    childGroup.id = `${this.id}.${this._nextChildId++}`;
    childGroup._parentWatchGroup = this;

    var prevEval = this._childWatchGroupTail._evalWatchTail;
    var nextEval = prevEval._nextEvalWatch;
    var prevRecord = this._childWatchGroupTail._recordTail;
    var nextRecord = prevRecord.nextRecord;

    _WatchGroupList._add(this, childGroup);

    var evalMarker = childGroup._marker;

    evalMarker._prevEvalWatch = prevEval;
    evalMarker._nextEvalWatch = nextEval;

    if (prevEval !== null) prevEval._nextEvalWatch = evalMarker;
    if (nextEval !== null) nextEval._prevEvalWatch = evalMarker;

    var childRecordHead = childGroup._recordHead;
    var childRecordTail = childGroup._recordTail;

    childRecordHead.prevRecord = prevRecord;
    childRecordTail.nextRecord = nextRecord;

    if (prevRecord !== null) prevRecord.nextRecord = childRecordHead;
    if (nextRecord !== null) nextRecord.prevRecord = childRecordTail;

    // TODO:(eisenbergeffect) attach observers associated with dirty records?
  }

  remove() {
    // TODO:(eisenbergeffect) detach observers associated with dirty records?

    var prevRecord = this._recordHead.prevRecord;
    var nextRecord = this._childInclRecordTail.nextRecord;

    if (prevRecord !== null) prevRecord.nextRecord = nextRecord;
    if (nextRecord !== null) nextRecord.prevRecord = prevRecord;

    // TODO:(eisenbergeffect) investigate these two lines; not sure such properties exist on records
    this._recordHead._prevWatchGroup = null;
    this._recordTail._prevWatchGroup = null;

    _WatchGroupList._remove(this._parentWatchGroup, this);
    this._nextWatchGroup = this._prevWatchGroup = null;

    this._rootGroup._removeCount++;
    this._parentWatchGroup = null;

    // Unlink the _watchRecord
    var firstEvalWatch = this._evalWatchHead;
    var lastEvalWatch = (this._watchGroupTail === null
      ? this
      : this._watchGroupTail)._evalWatchTail;

    var prev = firstEvalWatch._prevEvalWatch;
    var next = lastEvalWatch._nextEvalWatch;

    if (prev !== null) prev._nextEvalWatch = next;
    if (next !== null) next._prevEvalWatch = prev;

    this._evalWatchHead._prevEvalWatch = null;
    this._evalWatchTail._nextEvalWatch = null;
    this._evalWatchHead = this._evalWatchTail = null;
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
        // assert(watch._prevEvalWatch === prev);
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

    lines.push(`WatchGroup[${this.id}](watches: ${watches.join(', ')})`);
    var childGroup = this._watchGroupHead;

    while (childGroup !== null) {
      lines.push(`  ${childGroup.toString().split('\n').join('\n  ')}`);
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
    var watchRecord = this.watchField(null, name, fieldHandler);
    this.fieldCost++;
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
    var watchRecord = this.watchField(null, null, collectionHandler);
    this.collectionCost++;
    collectionHandler.watchRecord = watchRecord;

    // We set a field forwarding handler on LHS. This will allow the change objects to propagate to
    // the current WatchRecord.
    var astWR = putIfAbsent(this._cache, ast.expression, function() {
      return ast.setupWatch(that);
    });
    // TODO: Add tests for this line!
    astWR.handler.addForwardHandler(collectionHandler);

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
    this.evalCost++;

    if (this._rootGroup.isInsideInvokeDirty) {
      // This check means that we are inside invoke reaction function.
      // Registering a new EvalWatch at this point will not run the
      // .check() on it which means it will not be processed, but its
      // reaction function will be run with null. So we process it manually.
      evalWatchRecord.check();
    }

    return evalWatchRecord;
  }

  watchField(context, field, handler){
    var getter = field === null ? null : this._getterCache.get(field);
    return this._recordAdd(new ChangeRecord(this, context, field, getter, handler));
  }

  _recordAdd(record) {
    var previous = this._recordTail,
        next = previous === null ? null : previous.nextRecord;

    record.nextRecord = next;
    record.prevRecord = previous;

    if (previous !== null) previous.nextRecord = record;
    if (next !== null) next.prevRecord = record;

    this._recordTail = record;

    if (previous === this._dirtyMarker) this._recordRemove(this._dirtyMarker);

    return record;
  }

  _recordRemove(record) {
    var previous = record.prevRecord,
        next = record.nextRecord;

    if (record === this._recordHead && record === this._recordTail) {
      // we are the last one, must leave marker behind.
      this._recordHead = this._recordTail = this._dirtyMarker;
      this._dirtyMarker.nextRecord = next;
      this._dirtyMarker.prevRecord = previous;

      if (previous !== null) previous.nextRecord = this._dirtyMarker;
      if (next !== null) next.prevRecord = this._dirtyMarker;
    } else {
      if (record === this._recordTail) this._recordTail = previous;
      if (record === this._recordHead) this._recordHead = next;
      if (previous !== null) previous.nextRecord = next;
      if (next !== null) next.prevRecord = previous;
    }
  }
}

export class RootWatchGroup extends WatchGroup {
  constructor(getterCache, observerSelector, context) {
    // TODO: Traceur Assertions
    // assert(context and context is Function or Object)
    this._getterCache = getterCache;
    this._observerSelector = observerSelector || { getObserver(){ return null; } };
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

    this._fakeHead = ChangeRecord.marker();
    this._dirtyMarker = ChangeRecord.marker();
    this._recordHead = this._recordTail = this._dirtyMarker;

    // Stats...
    this.fieldCost = 0;
    this.collectionCost = 0;
    this.evalCost = 0;

    this._rootGroup = this;
  }

  getObserver(obj, field){
    return this._observerSelector.getObserver(obj, field);
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
    var changeRecordIterator = this.collectChanges(exceptionHandler, fieldStopWatch);

    if (processStopWatch) {
      processStopWatch.start();
    }

    while (changeRecordIterator.iterate()) {
      var record = changeRecordIterator.current;

      if (changeLog){
        changeLog(record.handler.expression, record.currentValue, record.previousValue);
      }

      record.handler.onChange(record);
    }

    if (processStopWatch) {
      processStopWatch.stop();
    }

    // 2) Process function evaluations
    var evalRecord = this._evalWatchHead;
    var evalCount = 0;

    while (evalRecord !== null) {
      try {
        ++evalCount;

        if (evalRecord.check() && changeLog){
          changeLog(
            evalRecord.handler.expression,
            evalRecord.currentValue,
            evalRecord.previousValue
            );
        }
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

    if (processStopWatch){
      processStopWatch.stop();
    }

    // Because the handler can forward changes between each other synchronously, we need to call
    // reaction functions asynchronously. This processes the asynchronous reaction function queue.
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
          if (exceptionHandler) exceptionHandler(e);
          else throw e;
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
  }

  collectChanges(exceptionHandler, stopwatch){
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
        if (exceptionHandler)  exceptionHandler(e);
        else throw e;
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
  }

  get isInsideInvokeDirty() {
    return this._dirtyWatchHead === null && this._dirtyWatchTail !== null;
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

