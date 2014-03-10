import {
  ChangeDetector,
  ChangeDetectorGroup,
  ChangeRecord,
  MapChangeRecord,
  MapKeyValue,
  CollectionChangeRecord,
  CollectionChangeItem
} from './change_detection.js';
/**
 * these cannot currently be defined in the DirtyCheckingRecord class itself,
 * unfortunately. They've been moved outside and de-const-ified for this
 * reason. When a better approach is found, it will be used instead.
 */
var _MODE_NAMES = [
  'MARKER', 'IDENT', 'REFLECT', 'GETTER', 'MAP[]', 'ITERABLE', 'MAP'
];
var _MODE_MARKER_ = 0;
var _MODE_IDENTITY_ = 1;
var _MODE_REFLECT_ = 2;
var _MODE_GETTER_ = 3;
var _MODE_MAP_FIELD_ = 4;
var _MODE_ITERABLE_ = 5;
var _MODE_MAP_ = 6;
export class GetterCache {
  constructor(map) {
    this._map = map;
  }
  get(field) {
    return this._map[field] || null;
  }
}
export class DirtyCheckingChangeDetectorGroup extends ChangeDetector {
  constructor(parent, cache) {
    this._parent = parent;
    this._getterCache = cache;
    this._marker = DirtyCheckingRecord.marker();
    this._childHead = this._childTail = this._next = this._prev = null;
    if (parent === null) {
      this._recordHead = this._recordTail = this._marker;
    } else {
      this._recordTail = this._parent._childInclRecordTail;
      this._recordHead = this._recordTail = this._recordAdd(this._marker);
    }
  }
  watch(context, field, handler) {
    // assert(_root != null); // prove that we are not deleted connected;
    var getter = field === null ? null : this._getterCache.get(field);
    return this._recordAdd(new DirtyCheckingRecord(this, context, field, getter, handler));
  }
  remove() {
    var root = this._root;
    // TODO: Traceur assertions
    // assert((root = _root) != null);
    // assert(root._assertRecordsOk());
    var prevRecord = this._recordHead._prevRecord;
    var nextRecord = this._childInclRecordTail._nextRecord;
    if (prevRecord !== null) prevRecord._nextRecord = nextRecord;
    if (nextRecord !== null) nextRecord._prevRecord = prevRecord;
    var cursor = this._recordHead;
    while(cursor != nextRecord) {
      cursor = cursor._nextRecord;
    }
    var prevGroup = this._prev;
    var nextGroup = this._next;
    if (prevGroup === null) {
      this._parent._childHead = nextGroup;
    } else {
      prevGroup._next = nextGroup;
    }
    if (nextGroup === null) {
      this._parent._childTail = prevGroup;
    } else {
      nextGroup._prev = prevGroup;
    }
    this._parent = null;
    // TODO: Traceur assertions
    // assert(root._assertRecordsOk());
  }
  _recordAdd(record) {
    var previous = this._recordTail,
        next = previous === null ? null : previous._nextRecord;
    record._nextRecord = next;
    record._prevRecord = previous;
    if (previous !== null) previous._nextRecord = record;
    if (next !== null) next._prevRecord = record;
    this._recordTail = record;
    if (previous === this._marker) this._recordRemove(this._marker);
    return record;
  }
  _recordRemove(record) {
    var previous = record._prevRecord,
        next = record._nextRecord;
    if (record === this._recordHead && record === this._recordTail) {
      // we are the last one, must leave marker behind.
      this._recordHead = this._recordTail = this._marker;
      this._marker._nextRecord = next;
      this._marker._prevRecord = previous;
      if (previous !== null) previous._nextRecord = this._marker;
      if (next !== null) next._prevRecord = this._marker;
    } else {
      if (record === this._recordTail) this._recordTail = previous;
      if (record === this._recordHead) this._recordHead = next;
      if (previous !== null) previous._nextRecord = next;
      if (next !== null) next._prevRecord = previous;
    }
  }
  newGroup() {
    // TODO: Traceur assertions
    // assert(_root._assertRecordsOk());
    var child = new DirtyCheckingChangeDetectorGroup(this, this._getterCache);
    if (this._childHead === null) {
      this._childHead = this._childTail = child;
    } else {
      child._prev = this._childTail;
      this._childTail._next = child;
      this._childTail = child;
    }
    // TODO: Traceur assertions
    // assert(_root._assertRecordsOk());
    return child;
  }
  get _root() {
    var root = this, next;
    while ((next = root._parent) !== null) {
      root = next;
    }
    return (root instanceof DirtyCheckingChangeDetector) ? root : null;
  }
  get _childInclRecordTail() {
    var tail = this, nextTail;
    while ((nextTail = tail._childTail) !== null) {
      tail = nextTail;
    }
    return tail._recordTail;
  }
  get count() {
    var count = 0,
        cursor = this._recordHead,
        end = this._childInclRecordTail;
    while (cursor !== null) {
      if (cursor._mode !== _MODE_MARKER_) {
        ++count;
      }
      if (cursor === end) break;
      cursor = cursor._nextRecord;
    }
    return count;
  }
  toString() {
    var lines = [],
        record,
        records,
        recordTail,
        childGroup;
    if (this._parent === null) {
      var allRecords = [];
      record = this._recordHead;
      var includeChildrenTail = this._childInclRecordTail;
      do {
        allRecords.push(record.toString());
        record = record._nextRecord;
      } while (record !== includeChildrenTail);
      lines.push("FIELDS: " + allRecords.join(', '));
    }
    records = [];
    record = this._recordHead;
    recordTail = this._recordTail;
    while (record !== recordTail) {
      records.push(record.toString());
      record = record._nextRecord;
    }
    records.add(record.toString());
    lines.add("DirtyCheckingChangeDetectorGroup(fields: " + records.join(', ') + ")");
    childGroup = this._childHead;
    while (childGroup !== null) {
      lines.push('  ' + childGroup.toString().split('\n').join('\n  '));
      childGroup = childGroup._next;
    }
    return lines.join('\n');
  }
}
export class DirtyCheckingChangeDetector extends DirtyCheckingChangeDetectorGroup {
  constructor(cache) {
    super(null, cache);
    this._fakeHead = DirtyCheckingRecord.marker();
  }

  _assertRecordsOk() {
    var record = this._recordHead,
        groups = [this],
        group;
    while (groups.length) {
      group = groups.shift();
      var childGroup = group._childTail;
      while (childGroup !== null) {
        groups.unshift(childGroup);
        childGroup = childGroup._prev;
      }
      var groupRecord = group._recordHead,
          groupTail = group._recordTail;
      while (true) {
        if (groupRecord === record) record = record._nextRecord;
        else throw "lost: " + record + " found " + groupRecord + "\n" + this;
        if (groupRecord === groupTail) break;
        groupRecord = groupRecord._nextRecord;
      }
    }
    return true;
  }
  collectChanges(exceptionHandler, stopwatch) {
    if (stopwatch) stopwatch.start();
    var changeTail = this._fakeHead,
        current = this._recordHead,
        count = 0;
    while (current !== null) {
      try {
        if (current.check() !== null) {
          changeTail = changeTail._nextChange = current;
        }
        ++count;
      } catch (e) {
        if (exceptionHandler) {
          exceptionHandler(e);
        } else {
          throw e;
        }
      }
      current = current._nextRecord;
    }
    changeTail._nextChange = null;
    if (stopwatch) {
      stopwatch.stop();
      stopwatch.increment(count);
    }
    return this._fakeHead._nextChange;
  }
  remove() {
    throw "Root ChangeDetector can not be removed";
  }
  get _root() {
    return this;
  }
}
class DirtyCheckingRecord extends ChangeRecord {
  constructor(group, object, fieldName, getter, handler) {
    this._group = group;
    this._getter = getter;
    this._handler = handler;
    this._field = fieldName;
    // Do we really need reflection here?
    // this._symbol = fieldName === null ? null : new Symbol(fieldName);
    this.object = object;
    this._nextRecord = this._prevRecord = this._nextChange = null;
  }
  static marker() {
    var record = new DirtyCheckingRecord(null, null, null, null, null);
    record._mode = _MODE_MARKER_;
    return record;
  }
  get nextChange() {
    return this._nextChange;
  }
  get field() {
    return this._field;
  }
  get handler() {
    return this._handler;
  }
  set handler(handler) {
    this._handler = handler;
  }
  get object() {
    return this._object;
  }
  set object(obj) {
    this._object = obj;
    if (obj === null) {
      this._mode = _MODE_IDENTITY_;
      return;
    }
    if (this.field === null) {
      // _instanceMirror = null; --- Again, do we need reflection?
      if (typeof obj === "object") {
        if (Array.isArray(obj)) { // TODO: Browser compat, cross-script context support, perf
          if (this._mode !== _MODE_ITERABLE_) {
            // Last one was collection as well, don't reset state.
            this._mode = _MODE_ITERABLE_;
            this.currentValue = new _CollectionChangeRecord();
          }
        } else if (this._mode !== _MODE_MAP_) {
          // Last one was collection as well, don't reset state.
          this._mode = _MODE_MAP_;
          this.currentValue = new _MapChangeRecord();
        }
      } else {
        this._mode = _MODE_IDENTITY_;
      }
      return;
    }
    if (typeof obj === "object") {
      this._mode = _MODE_MAP_FIELD_;
      // _instanceMirror = null; --- Reflection needed?
    } else if (this._getter !== null) {
      this._mode = _MODE_GETTER_;
      // _instanceMirror = null; --- Reflection needed?
    } else {
      this._mode = _MODE_REFLECT_;
      // _instanceMirror = reflect(obj); --- I'm really not sure about this!
    }
  }
  check() {
    // assert(_mode != null); --- Traceur v0.0.24 missing assert()
    var current;
    switch (this._mode) {
      case _MODE_MARKER_: return null;
      case _MODE_REFLECT_:
        // TODO:
        // I'm not sure how much support for Reflection is available in Traceur
        // just yet, but I will look into this later...
        // current = _instanceMirror.getField(_symbol).reflectee;
        current = this.object[this.field];
        break;
      case _MODE_GETTER_:
        current = this._getter(this.object);
        break;
      case _MODE_MAP_FIELD_:
        current = this.object[this.field];
        break;
      case _MODE_IDENTITY_:
        current = this.object;
        break;
      case _MODE_MAP_:
      case _MODE_ITERABLE_:
        return this.currentValue._check(this.object) ? this : null;
      default:
        throw "UNREACHABLE";
        // assert(false); --- Traceur 0.0.24 missing assert()
    }
    var last = this.currentValue;
    if (last !== current) {
      // TODO:
      // I'm fairly sure we don't have this issue in JS, with the exception of non-primitive
      // Strings. However, I'll look into this.
      //
      //if (typeof last === "string" && typeof current === "string" && last === current) {
      // This is false change in strings we need to recover, and pretend it
      // is the same. We save the value so that next time identity will pass
      //currentValue = current;
      //} else
      if (!((typeof last === "number" && last !== last) &&
          (typeof current === "number" && current !== current))) {
        // Ignore NaN -> NaN changes
        this.previousValue = last;
        this.currentValue = current;
        return this;
      }
    }
    return null;
  }
  remove() {
    this._group._recordRemove(this);
  }
  toString() {
    // Where the heck is hashCode from?
    var hashCode = 0;
    return _MODE_NAMES[this._mode] + '[' + this.field + ']{' + hashCode + '}';
  }
}
class _MapChangeRecord extends MapChangeRecord {
  constructor() {
    this._records = {}; // WeakMap perhaps?
    this._map = {};
    this._mapHead = null;
    this._changesHead = this._changesTail = null;
    this._additionsHead = this._additionsTail = null;
    this._removalsHead = this._removalsTail = null;
  }
  get map() {
    return this._map;
  }
  get mapHead() {
    return this._mapHead;
  }
  get changesHead() {
    return this._changesHead;
  }
  get additionsHead() {
    return this._additionsHead;
  }
  get removalsHead() {
    return this._removalsHead;
  }
  get isDirty() {
    return this._additionsHead !== null ||
           this._changesHead !== null ||
           this._removalsHead !== null;
  }
  forEachChange(fn) {
    // TODO: assert(typeof fn === "function" && fn.length === 1)
    var record = this._changesHead;
    while (record !== null) {
      fn(record);
      record = record._nextChangedKeyValue;
    }
  }
  forEachAddition(fn) {
    // TODO: assert(typeof fn === "function" && fn.length === 1)
    var record = this._additionsHead;
    while (record !== null) {
      fn(record);
      record = record._nextAddedKeyValue;
    }
  }
  forEachRemoval(fn) {
    // TODO: assert(typeof fn === "function" && fn.length === 1)
    var record = this._removalsHead;
    while (record !== null) {
      fn(record);
      record = record._nextRemovedKeyValue;
    }
  }
  _check(map) {
    this._reset();
    this._map = map;
    var records = this._records;
    var oldSeqRecord = this._mapHead;
    var lastOldSeqRecord = null, lastNewSeqRecord = null;
    var seqChanged = false;
    // TODO: Use getOwnPropertyNames instead?
    var keys = Object.keys(map);
    for (var i = 0, ii = keys.length; i < ii; ++i) {
      var key = keys[i], value = map[key], newSeqRecord = null;
      if (oldSeqRecord !== null && key === oldSeqRecord.key) {
        newSeqRecord = oldSeqRecord;
        if (value !== oldSeqRecord._currentValue) {
          var prev = oldSeqRecord._previousValue = oldSeqRecord._currentValue;
          oldSeqRecord._currentValue = value;
          if (!((typeof prev === "number" && prev !== prev) &&
              (typeof value === "number" && value !== value))) {
            // Ignore NaN -> NaN changes
            this._addToChanges(oldSeqRecord);
          }
        }
      } else {
        seqChanged = true;
        if (oldSeqRecord !== null) {
          this._removeFromSeq(lastOldSeqRecord, oldSeqRecord);
          this._addToRemovals(oldSeqRecord);
        }
        if (records.hasOwnProperty(key)) {
          newSeqRecord = records[key];
        } else {
          newSeqRecord = records[key] = new KeyValueRecord(key);
          newSeqRecord._currentValue = value;
          this._addToAdditions(newSeqRecord);
        }
      }
      if (seqChanged) {
        if (this._isInRemovals(newSeqRecord)) {
          this._removeFromRemovals(newSeqRecord);
        }
        if (lastNewSeqRecord === null) {
          this._mapHead = newSeqRecord;
        } else {
          lastNewSeqRecord._nextKeyValue = newSeqRecord;
        }
      }
      lastOldSeqRecord = oldSeqRecord;
      lastNewSeqRecord = newSeqRecord;
      oldSeqRecord = oldSeqRecord === null ? null : oldSeqRecord._nextKeyValue;
    }
    this._truncate(lastOldSeqRecord, oldSeqRecord);
    return this.isDirty;
  }
  _reset() {
    var record = this._changesHead,
        nextRecord;
    while (record !== null) {
      nextRecord = record._nextChangedKeyValue;
      record._previousValue = record._currentValue;
      record._nextChangedKeyValue = null;
      record = nextRecord;
    }
    record = this._additionsHead;
    while (record !== null) {
      nextRecord = record._nextAddedKeyValue;
      record._previousValue = record._currentValue;
      record._nextAddedKeyValue = null;
      record = nextRecord;
    }
    record = this._removalsHead;
    while (record !== null) {
      nextRecord = record._nextRemovedKeyValue;
      record._nextRemovedKeyValue = null;
      record = nextRecord;
    }
    this._changesHead = this._changesTail = null;
    this._additionsHead = this._additionsTail = null;
    this._removalsHead = this._removalsTail = null;
  }
  _truncate(lastRecord, record) {
    while (record !== null) {
      if (lastRecord === null) {
        this._mapHead = null;
      } else {
        lastRecord._nextKeyValue = null;
      }
      var nextRecord = record._nextKeyValue;
      record._nextKeyValue = null;
      this._addToRemovals(record);
      lastRecord = record;
      record = nextRecord;
    }
    record = this._removalsHead;
    while (record !== null) {
      record._previousValue = record._currentValue;
      record._currentValue = null;
      delete this._records[record.key];
      record = record._nextRemovedKeyValue;
    }
  }
  _isInRemovals(record) {
    return record === this._removalsHead ||
           record._nextRemovedKeyValue !== null ||
           record._prevRemovedKeyValue !== null;
  }
  _addToRemovals(record) {
    // TODO: traceur assertions
    // assert(record._nextKeyValue === null);
    // assert(record._nextAddedKeyValue === null);
    // assert(record._nextChangedKeyValue === null);
    // assert(record._nextRemovedKeyValue === null);
    // assert(record._prevRemovedKeyValue === null);
    if (this._removalsHead === null) {
      this._removalsHead = this._removalsTail = record;
    } else {
      this._removalsTail._nextRemovedKeyValue = record;
      record._prevRemovedKeyValue = this._removalsTail;
      this._removalsTail = record;
    }
  }
  _removeFromSeq(prev, record) {
    var next = record._nextKeyValue;
    if (prev === null) {
      this._mapHead = next;
    } else {
      prev._nextKeyValue = next;
    }
    record._nextKeyValue = null;
  }
  _removeFromRemovals(record) {
    // TODO: traceur assertions
    // assert(record._nextKeyValue === null)
    // assert(record._nextAddedKeyValue === null)
    // assert(record._nextChangedKeyValue === null)
    var prev = record._prevRemovedKeyValue,
        next = record._nextRemovedKeyValue;
    if (prev === null) {
      this._removalsHead = next;
    } else {
      prev._nextRemovedKeyValue = next;
    }
    if (next === null) {
      this._removalsTail = prev;
    } else {
      next._prevRemovedKeyValue = prev;
    }
    record._prevRemovedKeyValue = record._nextRemovedKeyValue = null;
  }
  _addToAdditions(record) {
    // TODO: traceur assertions
    // assert(record._nextKeyValue === null)
    // assert(record._nextAddedKeyValue === null)
    // assert(record._nextChangedKeyValue === null)
    // assert(record._nextRemovedKeyValue === null)
    // assert(record._prevRemovedKeyValue === null)
    if (this._additionsHead === null) {
      this._additionsHead = this._additionsTail = record;
    } else {
      this._additionsTail._nextAddedKeyValue = record;
      this._additionsTail = record;
    }
  }
  _addToChanges(record) {
    // TODO: traceur assertions
    // assert(record._nextAddedKeyValue === null)
    // assert(record._nextChangedKeyValue === null)
    // assert(record._nextRemovedKeyValue === null)
    // assert(record._prevRemovedKeyValue === null)
    if (this._changesHead === null) {
      this._changesHead = this._changesTail = record;
    } else {
      this._changesTail._nextChangedKeyValue = record;
      this._changesTail = record;
    }
  }
}
class KeyValueRecord extends MapKeyValue {
  constructor(key) {
    this._key = key;
    this._previousValue = this._currentValue = null;
    this._nextKeyValue = this._nextAddedKeyValue = this._nextChangedKeyValue = null;
    this._nextRemovedKeyValue = this._prevRemovedKeyValue = null;
  }
  get key() {
    return this._key;
  }
  get previousValue() {
    return this._previousValue;
  }
  get currentValue() {
    return this._currentValue;
  }
  get nextKeyValue() {
    return this._nextKeyValue;
  }
  get nextAddedKeyValue() {
    return this._nextAddedKeyValue;
  }
  get nextRemovedKeyValue() {
    return this._nextRemovedKeyValue;
  }
  get nextChangedKeyValue() {
    return this._nextChangedKeyValue;
  }
  toString() {
    return this._previousValue === this._currentValue
          ? this._key
          : this._key + '[' + this._previousValue + ' -> ' + this._currentValue + ']';
  }
}
class _CollectionChangeRecord extends CollectionChangeRecord {
  constructor() {
    this._iterable = null;
    this._items = new DuplicateMap();
    this._removedItems = new DuplicateMap();
    this._collectionHead = this._collectionTail = null;
    this._additionsHead = this._additionsTail = null;
    this._movesHead = this._movesTail = null;
    this._removalsHead = this._removalsTail = null;
  }
  get collectionHead() {
    return this._collectionHead;
  }
  get additionsHead() {
    return this._additionsHead;
  }
  get movesHead() {
    return this._movesHead;
  }
  get removalsHead() {
    return this._removalsHead;
  }
  forEachAddition(fn){
    // TODO: assert(typeof fn === "function" && fn.length === 1)
    var record = this._additionsHead;
    while(record !== null) {
      fn(record);
      record = record._nextAddedRec;
    }
  }
  forEachMove(fn) {
    // TODO: assert(typeof fn === "function" && fn.length === 1)
    var record = this._movesHead;
    while(record !== null) {
      fn(record);
      record = record._nextMovedRec;
    }
  }
  forEachRemoval(fn){
    // TODO: assert(typeof fn === "function" && fn.length === 1)
    var record = this._removalsHead;
    while(record !== null) {
      fn(record);
      record = record._nextRemovedRec;
    }
  }
  get iterable() {
    return this._iterable;
  }
  _check(collection) {
    this._reset();
    var record = this._collectionHead,
        maybeDirty = false,
        index,
        end,
        item;
    // TODO: Optimization for frozen arrays / sets / iteratables
    // if ((collection is UnmodifiableListView) && identical(_iterable, collection)) {
      // Short circuit and assume that the list has not been modified.
    //  return false;
    // }
    if (Array.isArray(collection)) {
      // TODO:
      // Is a separate branch for Array really needed, if the object is known to be
      // iterable? In the current implementation, the other branch will never be
      // executed, so this shouldn't hurt. But it also causes problems for other
      // ES6 iterable types (using generators or custom iterators)
      var list = collection;
      for (index = 0, end = list.length; index < end; index++) {
        item = list[index];
        if (record === null || item !== record.item) {
          record = this.mismatch(record, item, index);
          maybeDirty = true;
        } else if (maybeDirty) {
          // TODO(misko): can we limit this to duplicates only?
          record = this.verifyReinsertion(record, item, index);
        }
        record = record._nextRec;
      }
    } else {
      index = 0;
      for (item in collection) {
        if (record === null || item !== record.item) {
          record = this.mismatch(record, item, index);
          maybeDirty = true;
        } else if (maybeDirty) {
          // TODO(misko): can we limit this to duplicates only?
          record = this.verifyReinsertion(record, item, index);
        }
        record = record._nextRec;
        index++;
      }
    }
    this._truncate(record);
    this._iterable = collection;
    return this.isDirty;
  }
  /**
   * Reset the state of the change objects to show no changes. This means set
   * previousKey to currentKey, and clear all of the queues (additions, moves,
   * removals).
   */
  _reset() {
    var record;
    record = this._additionsHead;
    while(record !== null) {
      record.previousIndex = record.currentIndex;
      record = record._nextAddedRec;
    }
    this._additionsHead = this._additionsTail = null;
    record = this._movesHead;
    while(record !== null) {
      record.previousIndex = record.currentIndex;
      var nextRecord = record._nextMovedRec;
      // wat.
      // assert((record._nextMovedRec = null) == null);
      record._nextMovedRec = null;
      record = nextRecord;
    }
    this._movesHead = this._movesTail = null;
    this._removalsHead = this._removalsTail = null;
    // TODO: Traceur assertions
    // assert(isDirty == false);
  }
  /**
   * A [_CollectionChangeRecord] is considered dirty if it has additions, moves
   * or removals.
   */
  get isDirty() {
    return this._additionsHead !== null ||
           this._movesHead !== null ||
           this._removalsHead !== null;
  }
  /**
   * This is the core function which handles differences between collections.
   *
   * - [record] is the record which we saw at this position last time. If `null`
   *   then it is a new item.
   * - [item] is the current item in the collection
   * - [index] is the position of the item in the collection
   */
  mismatch(record, item, index) {
    // Guard against bogus String changes
    if (record !== null) {
      //if (item is String && record.item is String && record.item == item) {
      // TODO: This probably doesn't matter in ES6, with the exception of non-primitive Strings.
      // Figure out a solution for these...
      if (typeof item === "string" && typeof record.item === "string" && record.item === item) {
        // this is false change in strings we need to recover, and pretend it is
        // the same. We save the value so that next time identity can pass
        record.item = item;
        return record;
      }
      if ((typeof item === "number" && item !== item) &&
          (typeof record.item === "number" && record.item !== record.item)) {
        // we need this for JavaScript since in JS NaN !== NaN.
        return record;
      }
    }
    // find the previous record so that we know where to insert after.
    var prev = record === null ? this._collectionTail : record._prevRec;
    // Remove the record from the collection since we know it does not match the
    // item.
    if (record !== null) this._collection_remove(record);
    // Attempt to see if we have seen the item before.
    record = this._items.get(item, index);
    if (record !== null) {
      // We have seen this before, we need to move it forward in the collection.
      this._collection_moveAfter(record, prev, index);
    } else {
      // Never seen it, check evicted list.
      record = this._removedItems.get(item);
      if (record !== null) {
        // It is an item which we have earlier evict it, reinsert it back into
        // the list.
        this._collection_reinsertAfter(record, prev, index);
      } else {
        // It is a new item add it.
        record = this._collection_addAfter(new ItemRecord(item), prev, index);
      }
    }
    return record;
  }
  /**
   * This check is only needed if an array contains duplicates. (Short circuit
   * of nothing dirty)
   *
   * Use case: `[a, a]` => `[b, a, a]`
   *
   * If we did not have this check then the insertion of `b` would:
   *   1) evict first `a`
   *   2) insert `b` at `0` index.
   *   3) leave `a` at index `1` as is. <-- this is wrong!
   *   3) reinsert `a` at index 2. <-- this is wrong!
   *
   * The correct behavior is:
   *   1) evict first `a`
   *   2) insert `b` at `0` index.
   *   3) reinsert `a` at index 1.
   *   3) move `a` at from `1` to `2`.
   *
   *
   * Double check that we have not evicted a duplicate item. We need to check if
   * the item type may have already been removed:
   * The insertion of b will evict the first 'a'. If we don't reinsert it now it
   * will be reinserted at the end. Which will show up as the two 'a's switching
   * position. This is incorrect, since a better way to think of it is as insert
   * of 'b' rather then switch 'a' with 'b' and then add 'a' at the end.
   */
  verifyReinsertion(record, item, index) {
    var reinsertRecord = this._removedItems.get(item);
    if (reinsertRecord !== null) {
      record = this._collection_reinsertAfter(reinsertRecord, record._prevRec, index);
    } else if (record.currentIndex != index) {
      record.currentIndex = index;
      this._moves_add(record);
    }
    return record;
  }
  /**
   * Get rid of any excess [ItemRecord]s from the previous collection
   *
   * - [record] The first excess [ItemRecord].
   */
  _truncate(record) {
    // Anything after that needs to be removed;
    while(record !== null) {
      var nextRecord = record._nextRec;
      this._removals_add(this._collection_unlink(record));
      record = nextRecord;
    }
    this._removedItems.clear();
  }
  _collection_reinsertAfter(record, insertPrev, index) {
    this._removedItems.remove(record);
    var prev = record._prevRemovedRec;
    var next = record._nextRemovedRec;
    // TODO: Traceur assertions... also wat.
    //assert((record._prevRemovedRec = null) == null);
    //assert((record._nextRemovedRec = null) == null);
    record._prevRemovedRec = record._nextRemovedRec = null;
    if (prev === null) {
      this._removalsHead = next;
    } else {
      prev._nextRemovedRec = next;
    }
    if (next === null) {
      this._removalsTail = prev;
    } else {
      next._prevRemovedRec = prev;
    }
    this._collection_insertAfter(record, insertPrev, index);
    this._moves_add(record);
    return record;
  }
  _collection_moveAfter(record, prev, index) {
    this._collection_unlink(record);
    this._collection_insertAfter(record, prev, index);
    this._moves_add(record);
    return record;
  }
  _collection_addAfter(record, prev, index) {
    this._collection_insertAfter(record, prev, index);
    if (this._additionsTail === null) {
      // TODO: Traceur assertions
      //assert(_additionsHead == null);
      this._additionsTail = this._additionsHead = record;
    } else {
      // TODO: Traceur assertions
      //assert(_additionsTail._nextAddedRec == null);
      //assert(record._nextAddedRec == null);
      this._additionsTail = this._additionsTail._nextAddedRec = record;
    }
    return record;
  }
  _collection_insertAfter(record, prev, index) {
    // TODO: Traceur assertions
    // assert(record != prev);
    // assert(record._nextRec == null);
    // assert(record._prevRec == null);
    var next = prev === null ? this._collectionHead : prev._nextRec;
    // TODO: Traceur assertions
    //assert(next != record);
    //assert(prev != record);
    record._nextRec = next;
    record._prevRec = prev;
    if (next === null) {
      this._collectionTail = record;
    } else {
      next._prevRec = record;
    }
    if (prev === null) {
      this._collectionHead = record;
    } else {
      prev._nextRec = record;
    }
    this._items.put(record);
    record.currentIndex = index;
    return record;
  }
  _collection_remove(record) {
    this._removals_add(this._collection_unlink(record));
  }
  _collection_unlink(record) {
    this._items.remove(record);
    var prev = record._prevRec;
    var next = record._nextRec;
    // TODO: Traceur assertions. wat.
    //assert((record._prevRec = null) == null);
    //assert((record._nextRec = null) == null);
    record._prevRec = record._nextRec = null;
    if (prev === null) {
      this._collectionHead = next;
    } else {
      prev._nextRec = next;
    }
    if (next === null) {
      this._collectionTail = prev;
    } else {
      next._prevRec = prev;
    }
    return record;
  }
  _moves_add(record) {
    // TODO: Traceur assertions
    //assert(record._nextMovedRec == null);
    if (this._movesTail === null) {
      // TODO: Traceur assertions
      //assert(_movesHead == null);
      this._movesTail = this._movesHead = record;
    } else {
      // TODO: Traceur assertions
      // assert(_movesTail._nextMovedRec == null);
      this._movesTail = this._movesTail._nextMovedRec = record;
    }
    return record;
  }
  _removals_add(record) {
    record.currentIndex = null;
    this._removedItems.put(record);
    if (this._removalsTail === null) {
      // TODO: Traceur assertions
      // assert(_removalsHead === null);
      this._removalsTail = this._removalsHead = record;
    } else {
      // TODO: Traceur assertions
      // assert(_removalsTail._nextRemovedRec == null);
      // assert(record._nextRemovedRec == null);
      record._prevRemovedRec = this._removalsTail;
      this._removalsTail = this._removalsTail._nextRemovedRec = record;
    }
    return record;
  }
  toString() {
    var record;
    var list = [];
    record = this._collectionHead;
    while(record !== null) {
      list.push(record);
      record = record._nextRec;
    }
    var additions = [];
    record = this._additionsHead;
    while(record !== null) {
      additions.push(record);
      record = record._nextAddedRec;
    }
    var moves = [];
    record = this._movesHead;
    while(record !== null) {
      moves.push(record);
      record = record._nextMovedRec;
    }
    var removals = [];
    record = this._removalsHead;
    while(record !== null) {
      removals.push(record);
      record = record._nextRemovedRec;
    }
    return "collection: " + list.join(', ') + "\n" +
           "additions: " + additions.join(', ') + "\n" +
           "moves: " + moves.join(', ') + "\n" +
           "removals: " + removals.join(', ') + "\n";
  }
}
class ItemRecord extends CollectionChangeItem {
  constructor(item) {
    this.item = item;
    this.previousIndex = this.currentIndex = null;
    this._prevRec = this._nextRec = null;
    this._prevDupRec = this._nextDupRec = null;
    this._prevRemovedRec = this._nextRemovedRec = null;
    this._nextAddedRec = this._nextMovedRec = null;
  }
  get nextCollectionItem() {
    return this._nextRec;
  }
  get nextRemovedItem() {
    return this._nextRemovedRec;
  }
  get nextAddedItem() {
    return this._nextAddedRec;
  }
  get nextMovedItem() {
    return this._nextMovedRec;
  }
  toString() {
    return this.previousIndex === this.currentIndex
      ? '' + this.item
      : this.item + '[' + this.previousIndex + ' -> ' + this.currentIndex + ']';
  }
}
class _DuplicateItemRecordList {
  constructor() {
    this.head = this.tail = null;
  }
  add(record, beforeRecord) {
    // TODO: Traceur assertions
    // assert(record._prevDupRec == null);
    // assert(record._nextDupRec == null);
    // assert(beforeRecord == null ? true : beforeRecord.item == record.item);
    if (this.head === null) {
      //assert(beforeRecord == null);
      this.head = this.tail = record;
    } else {
      // TODO: Traceur assertions
      //assert(record.item === head.item);
      if (beforeRecord === null) {
        this.tail._nextDupRec = record;
        record._prevDupRec = this.tail;
        this.tail = record;
      } else {
        var prev = beforeRecord._prevDupRec;
        var next = beforeRecord;
        record._prevDupRec = prev;
        record._nextDupRec = next;
        if (prev === null) {
          this.head = record;
        } else {
          prev._nextDupRec = record;
        }
        next._prevDupRec = record;
      }
    }
  }
  get(key, hideIndex) {
    var record = this.head;
    if (typeof hideIndex !== "number") hideIndex = null;
    while(record !== null) {
      if (hideIndex === null ||
          hideIndex < record.currentIndex && record.item === key) {
        return record;
      }
      record = record._nextDupRec;
    }
    return record;
  }
  remove(record) {
    // TODO: Add assertion to ensure that the record is within the list.
    // Since this is a private API, this may not be necessary, but it should assist in ensuring
    // that the routine (and library) behaves correctly.
    var prev = record._prevDupRec;
    var next = record._nextDupRec;
    if (prev === null) {
      this.head = next;
    } else {
      prev._nextDupRec = next;
    }
    if (next === null) {
      this.tail = prev;
    } else {
      next._prevDupRec = prev;
    }
    // TODO: Traceur assertions
    // These assertions look incorrect to me, if Dart/ECMAScript operator precedence is anything
    // like C/C++ (which, to my knowledge, it is)
    // assert((record._prevDupRec = null) == null);
    // assert((record._nextDupRec = null) == null);
    record._prevDupRec = record._nextDupRec = null;
    return this.head === null;
  }
}
class DuplicateMap {
  constructor() {
    // For an identical behaviour to the Dart implementation, a Map or WeakMap is required. However,
    // I'm not decided on whether a WeakMap would be more appropriate or not. While it is
    // not desirable to construct new objects, it may be necessary in this case. This could
    // be too much pressure on the GC, so refactoring is something which is quite likely to
    // occur here.
    this._map = new Map();
  }
  put(record, beforeRecord) {
    if (arguments.length === 1) beforeRecord = null;
    // TODO: traceur assert
    // assert(record._nextDupRec === null)
    // assert(record._prevDupRec === null)
    var list;
    if (!(list = this._map.get(record.item)))
      this._map.set(record.item, list = new _DuplicateItemRecordList());
    list.add(record, beforeRecord);
  }
  get(key, hideIndex) {
    var list = this._map.get(key);
    return !(list instanceof _DuplicateItemRecordList) ? null : list.get(key, hideIndex);
  }
  remove(record) {
    var list = this._map.get(record.item);
    // TODO: traceur assert()
    // assert(list != null)
    if (list.remove(record)) this._map.delete(record.item);
    return record;
  }
  clear() {
    this._map.clear();
  }
}