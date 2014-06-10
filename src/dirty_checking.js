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
var _NOT_NOTIFIED_= 10;
var _NOTIFIED_= 11;

export class GetterCache {
  constructor(map) {
    this._map = map;
  }

  get(field) {
    return this._map[field] || null;
  }
}

export class ChangeRecordIterator {
  constructor(next) {
    this.current = null;
    this._next = next;
  }

  iterate() {
    this.current = this._next;

    if (this._next !== null) {
      this._next = this.current.nextChange;

      /**
       * This is important to prevent memory leaks. If the nextChange record is not reset, then a
       * record may be pointing to a deleted change detector group, and it will not release the
       * reference until it fires again. So we have to be eager about releasing references.
       */
      this.current.nextChange = null;
    }

    return this.current !== null;
  }
}

export class ChangeRecord {
  constructor(group, object, fieldName, getter, handler) {
    this._group = group;
    this._getter = getter;

    this.handler = handler;
    this.field = fieldName;

    // Do we really need reflection here?
    // this._symbol = fieldName === null ? null : new Symbol(fieldName);
    this.object = object;
    this.nextRecord = this.prevRecord = this.nextChange = null;
  }

  static marker() {
    var record = new ChangeRecord(null, null, null, null, null);
    record._mode = _MODE_MARKER_;
    record.isMarker = true;
    return record;
  }

  _clearObject() {
    if(this._observer){
      this._observer.close();
      this._observer = null;
    }

    this._object = null;
  }

  get object() {
    return this._object;
  }

  set object(obj) {
    this._clearObject(obj);
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
            this.currentValue = new CollectionChangeRecord();
          }
        } else if (this._mode !== _MODE_MAP_) {
          // Last one was collection as well, don't reset state.
          this._mode = _MODE_MAP_;
          this.currentValue = new MapChangeRecord();
        }
      } else {
        this._mode = _MODE_IDENTITY_;
      }
      return;
    }

    this._observer = this._group && this._group._rootGroup.getObserver(obj, this.field);

    if(this._observer){
      this._mode = _NOTIFIED_;
      this.newValue = this._observer.open((value) =>{
        this.newValue = value;
        this._mode = _NOTIFIED_;
      });
    }else if(this._getter !== null){
      this._mode = _MODE_GETTER_;
    }else{
      this._mode = _MODE_MAP_FIELD_;
    }
  }

  check() {
    // assert(_mode != null); --- Traceur v0.0.24 missing assert()
    var current;

    switch (this._mode) {
      case _NOT_NOTIFIED_:
      case _MODE_MARKER_:
        return false;
      case _NOTIFIED_:
        current = this.newValue;
        this._mode = _NOT_NOTIFIED_;
        break;
      case _MODE_REFLECT_:
        // TODO:
        // I'm not sure how much support for Reflection is available in Traceur
        // just yet, but I will look into this later...
        // current = _instanceMirror.getField(_symbol).reflectee;
        if (!this.object) return undefined;
        current = this.object[this.field];
        break;
      case _MODE_GETTER_:
        current = this._getter(this.object);
        break;
      case _MODE_MAP_FIELD_:
        if (!this.object) return undefined;
        current = this.object[this.field];
        break;
      case _MODE_IDENTITY_:
        current = this.object;
        break;
      case _MODE_MAP_:
      case _MODE_ITERABLE_:
        return this.currentValue._check(this.object);
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
        return true;
      }
    }

    return false;
  }

  remove() {
    // TODO: This is not called when a WatchGroup is destroyed.
    // TODO: Should also be called when a parent WatchGroup is destroyed!
    this._clearObject();
    this._group._recordRemove(this);
  }

  toString() {
    return `${_MODE_NAMES[this._mode]}[${this.field}]`;
  }
}

export class MapChangeRecord {
  constructor() {
    this._records = {}; // WeakMap perhaps?

    this.map = {};
    this.mapHead = null;
    this.changesHead = this.changesTail = null;
    this.additionsHead = this.additionsTail = null;
    this.removalsHead = this.removalsTail = null;
  }

  get isDirty() {
    return this.additionsHead !== null ||
           this.changesHead !== null ||
           this.removalsHead !== null;
  }

  forEachChange(fn) {
    // TODO: assert(typeof fn === "function" && fn.length === 1)
    var record = this.changesHead;

    while (record !== null) {
      fn(record);
      record = record.nextChangedKeyValue;
    }
  }

  forEachAddition(fn) {
    // TODO: assert(typeof fn === "function" && fn.length === 1)
    var record = this.additionsHead;

    while (record !== null) {
      fn(record);
      record = record.nextAddedKeyValue;
    }
  }

  forEachRemoval(fn) {
    // TODO: assert(typeof fn === "function" && fn.length === 1)
    var record = this.removalsHead;

    while (record !== null) {
      fn(record);
      record = record.nextRemovedKeyValue;
    }
  }

  _check(map) {
    this._reset();
    this.map = map;

    var records = this._records;
    var oldSeqRecord = this.mapHead;
    var lastOldSeqRecord = null, lastNewSeqRecord = null;
    var seqChanged = false;

    // TODO: Use getOwnPropertyNames instead?
    var keys = Object.keys(map);

    for (var i = 0, ii = keys.length; i < ii; ++i) {
      var key = keys[i], value = map[key], newSeqRecord = null;

      if (oldSeqRecord !== null && key === oldSeqRecord.key) {
        newSeqRecord = oldSeqRecord;

        if (value !== oldSeqRecord.currentValue) {
          var prev = oldSeqRecord.previousValue = oldSeqRecord.currentValue;
          oldSeqRecord.currentValue = value;

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
          newSeqRecord.currentValue = value;
          this._addToAdditions(newSeqRecord);
        }
      }

      if (seqChanged) {
        if (this._isInRemovals(newSeqRecord)) {
          this._removeFromRemovals(newSeqRecord);
        }

        if (lastNewSeqRecord === null) {
          this.mapHead = newSeqRecord;
        } else {
          lastNewSeqRecord.nextKeyValue = newSeqRecord;
        }
      }

      lastOldSeqRecord = oldSeqRecord;
      lastNewSeqRecord = newSeqRecord;
      oldSeqRecord = oldSeqRecord === null ? null : oldSeqRecord.nextKeyValue;
    }

    this._truncate(lastOldSeqRecord, oldSeqRecord);

    return this.isDirty;
  }

  _reset() {
    var record = this.changesHead,
        nextRecord;

    while (record !== null) {
      nextRecord = record.nextChangedKeyValue;
      record.previousValue = record.currentValue;
      record.nextChangedKeyValue = null;
      record = nextRecord;
    }

    record = this.additionsHead;

    while (record !== null) {
      nextRecord = record.nextAddedKeyValue;
      record.previousValue = record.currentValue;
      record.nextAddedKeyValue = null;
      record = nextRecord;
    }

    record = this.removalsHead;

    while (record !== null) {
      nextRecord = record.nextRemovedKeyValue;
      record.nextRemovedKeyValue = null;
      record = nextRecord;
    }

    this.changesHead = this.changesTail = null;
    this.additionsHead = this.additionsTail = null;
    this.removalsHead = this.removalsTail = null;
  }

  _truncate(lastRecord, record) {
    while (record !== null) {
      if (lastRecord === null) {
        this.mapHead = null;
      } else {
        lastRecord.nextKeyValue = null;
      }

      var nextRecord = record.nextKeyValue;
      record.nextKeyValue = null;
      this._addToRemovals(record);
      lastRecord = record;
      record = nextRecord;
    }

    record = this.removalsHead;

    while (record !== null) {
      record.previousValue = record.currentValue;
      record.currentValue = null;
      delete this._records[record.key];
      record = record.nextRemovedKeyValue;
    }
  }

  _isInRemovals(record) {
    return record === this.removalsHead ||
           record.nextRemovedKeyValue !== null ||
           record.prevRemovedKeyValue !== null;
  }

  _addToRemovals(record) {
    // TODO: traceur assertions
    // assert(record.nextKeyValue === null);
    // assert(record.nextAddedKeyValue === null);
    // assert(record.nextChangedKeyValue === null);
    // assert(record.nextRemovedKeyValue === null);
    // assert(record.prevRemovedKeyValue === null);
    if (this.removalsHead === null) {
      this.removalsHead = this.removalsTail = record;
    } else {
      this.removalsTail.nextRemovedKeyValue = record;
      record.prevRemovedKeyValue = this.removalsTail;
      this.removalsTail = record;
    }
  }

  _removeFromSeq(prev, record) {
    var next = record.nextKeyValue;

    if (prev === null) {
      this.mapHead = next;
    } else {
      prev.nextKeyValue = next;
    }

    record.nextKeyValue = null;
  }

  _removeFromRemovals(record) {
    // TODO: traceur assertions
    // assert(record.nextKeyValue === null)
    // assert(record.nextAddedKeyValue === null)
    // assert(record.nextChangedKeyValue === null)
    var prev = record.prevRemovedKeyValue,
        next = record.nextRemovedKeyValue;

    if (prev === null) {
      this.removalsHead = next;
    } else {
      prev.nextRemovedKeyValue = next;
    }

    if (next === null) {
      this.removalsTail = prev;
    } else {
      next.prevRemovedKeyValue = prev;
    }

    record.prevRemovedKeyValue = record.nextRemovedKeyValue = null;
  }

  _addToAdditions(record) {
    // TODO: traceur assertions
    // assert(record.nextKeyValue === null)
    // assert(record.nextAddedKeyValue === null)
    // assert(record.nextChangedKeyValue === null)
    // assert(record.nextRemovedKeyValue === null)
    // assert(record.prevRemovedKeyValue === null)
    if (this.additionsHead === null) {
      this.additionsHead = this.additionsTail = record;
    } else {
      this.additionsTail.nextAddedKeyValue = record;
      this.additionsTail = record;
    }
  }

  _addToChanges(record) {
    // TODO: traceur assertions
    // assert(record.nextAddedKeyValue === null)
    // assert(record.nextChangedKeyValue === null)
    // assert(record.nextRemovedKeyValue === null)
    // assert(record.prevRemovedKeyValue === null)
    if (this.changesHead === null) {
      this.changesHead = this.changesTail = record;
    } else {
      this.changesTail.nextChangedKeyValue = record;
      this.changesTail = record;
    }
  }
}

class KeyValueRecord {
  constructor(key) {
    this.key = key;
    this.previousValue = this.currentValue = null;
    this.nextKeyValue = this.nextAddedKeyValue = this.nextChangedKeyValue = null;
    this.nextRemovedKeyValue = this.prevRemovedKeyValue = null;
  }

  toString() {
    return this.previousValue === this.currentValue
          ? this.key
          : `${this.key}[${this.previousValue} -> ${this.currentValue}]`;
  }
}

export class CollectionChangeRecord {
  constructor() {
    this._items = new DuplicateMap();
    this._removedItems = new DuplicateMap();

    this.iterable = null;
    this.collectionHead = this.collectionTail = null;
    this.additionsHead = this.additionsTail = null;
    this.movesHead = this.movesTail = null;
    this.removalsHead = this.removalsTail = null;
  }

  forEachAddition(fn){
    // TODO: assert(typeof fn === "function" && fn.length === 1)
    var record = this.additionsHead;

    while(record !== null) {
      fn(record);
      record = record.nextAddedRec;
    }
  }

  forEachMove(fn) {
    // TODO: assert(typeof fn === "function" && fn.length === 1)
    var record = this.movesHead;

    while(record !== null) {
      fn(record);
      record = record.nextMovedRec;
    }
  }

  forEachRemoval(fn){
    // TODO: assert(typeof fn === "function" && fn.length === 1)
    var record = this.removalsHead;

    while(record !== null) {
      fn(record);
      record = record.nextRemovedRec;
    }
  }

  _check(collection) {
    this._reset();
    var record = this.collectionHead,
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

        record = record.nextRec;
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

        record = record.nextRec;
        index++;
      }
    }

    this._truncate(record);
    this.iterable = collection;

    return this.isDirty;
  }
  /**
   * Reset the state of the change objects to show no changes. This means set
   * previousKey to currentKey, and clear all of the queues (additions, moves,
   * removals).
   */
  _reset() {
    var record;
    record = this.additionsHead;

    while(record !== null) {
      record.previousIndex = record.currentIndex;
      record = record.nextAddedRec;
    }

    this.additionsHead = this.additionsTail = null;
    record = this.movesHead;

    while(record !== null) {
      record.previousIndex = record.currentIndex;
      var nextRecord = record.nextMovedRec;
      // wat.
      // assert((record.nextMovedRec = null) == null);
      record.nextMovedRec = null;
      record = nextRecord;
    }

    this.movesHead = this.movesTail = null;
    this.removalsHead = this.removalsTail = null;
    // TODO: Traceur assertions
    // assert(isDirty == false);
  }
  /**
   * A [CollectionChangeRecord] is considered dirty if it has additions, moves
   * or removals.
   */
  get isDirty() {
    return this.additionsHead !== null ||
           this.movesHead !== null ||
           this.removalsHead !== null;
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
    var prev = record === null ? this.collectionTail : record.prevRec;

    // Remove the record from the collection since we know it does not match the
    // item.
    if (record !== null) {
      this._collection_remove(record);
    }

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
      record = this._collection_reinsertAfter(reinsertRecord, record.prevRec, index);
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
      var nextRecord = record.nextRec;
      this._removals_add(this._collection_unlink(record));
      record = nextRecord;
    }

    this._removedItems.clear();
  }

  _collection_reinsertAfter(record, insertPrev, index) {
    this._removedItems.remove(record);

    var prev = record.prevRemovedRec;
    var next = record.nextRemovedRec;

    // TODO: Traceur assertions... also wat.
    //assert((record.prevRemovedRec = null) == null);
    //assert((record.nextRemovedRec = null) == null);
    record.prevRemovedRec = record.nextRemovedRec = null;

    if (prev === null) {
      this.removalsHead = next;
    } else {
      prev.nextRemovedRec = next;
    }

    if (next === null) {
      this.removalsTail = prev;
    } else {
      next.prevRemovedRec = prev;
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

    if (this.additionsTail === null) {
      // TODO: Traceur assertions
      //assert(additionsHead == null);
      this.additionsTail = this.additionsHead = record;
    } else {
      // TODO: Traceur assertions
      //assert(additionsTail.nextAddedRec == null);
      //assert(record.nextAddedRec == null);
      this.additionsTail = this.additionsTail.nextAddedRec = record;
    }

    return record;
  }

  _collection_insertAfter(record, prev, index) {
    // TODO: Traceur assertions
    // assert(record != prev);
    // assert(record.nextRec == null);
    // assert(record.prevRec == null);
    var next = prev === null ? this.collectionHead : prev.nextRec;

    // TODO: Traceur assertions
    //assert(next != record);
    //assert(prev != record);
    record.nextRec = next;
    record.prevRec = prev;

    if (next === null) {
      this.collectionTail = record;
    } else {
      next.prevRec = record;
    }

    if (prev === null) {
      this.collectionHead = record;
    } else {
      prev.nextRec = record;
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

    var prev = record.prevRec;
    var next = record.nextRec;

    // TODO: Traceur assertions. wat.
    //assert((record.prevRec = null) == null);
    //assert((record.nextRec = null) == null);
    record.prevRec = record.nextRec = null;

    if (prev === null) {
      this.collectionHead = next;
    } else {
      prev.nextRec = next;
    }

    if (next === null) {
      this.collectionTail = prev;
    } else {
      next.prevRec = prev;
    }

    return record;
  }

  _moves_add(record) {
    // TODO: Traceur assertions
    //assert(record.nextMovedRec == null);
    if (this.movesTail === null) {
      // TODO: Traceur assertions
      //assert(movesHead == null);
      this.movesTail = this.movesHead = record;
    } else {
      // TODO: Traceur assertions
      // assert(movesTail.nextMovedRec == null);
      this.movesTail = this.movesTail.nextMovedRec = record;
    }

    return record;
  }

  _removals_add(record) {
    record.currentIndex = null;
    this._removedItems.put(record);

    if (this.removalsTail === null) {
      // TODO: Traceur assertions
      // assert(removalsHead === null);
      this.removalsTail = this.removalsHead = record;
    } else {
      // TODO: Traceur assertions
      // assert(removalsTail.nextRemovedRec == null);
      // assert(record.nextRemovedRec == null);
      record.prevRemovedRec = this.removalsTail;
      this.removalsTail = this.removalsTail.nextRemovedRec = record;
    }

    return record;
  }

  toString() {
    var record;
    var list = [];

    record = this.collectionHead;

    while(record !== null) {
      list.push(record);
      record = record.nextRec;
    }

    var additions = [];
    record = this.additionsHead;

    while(record !== null) {
      additions.push(record);
      record = record.nextAddedRec;
    }

    var moves = [];
    record = this.movesHead;

    while(record !== null) {
      moves.push(record);
      record = record.nextMovedRec;
    }

    var removals = [];
    record = this.removalsHead;

    while(record !== null) {
      removals.push(record);
      record = record.nextRemovedRec;
    }

    return "collection: " + list.join(', ') + "\n" +
           "additions: " + additions.join(', ') + "\n" +
           "moves: " + moves.join(', ') + "\n" +
           "removals: " + removals.join(', ') + "\n";
  }
}

class ItemRecord {
  constructor(item) {
    this.item = item;
    this.previousIndex = this.currentIndex = null;
    this.prevRec = this.nextRec = null;
    this.prevDupRec = this.nextDupRec = null;
    this.prevRemovedRec = this.nextRemovedRec = null;
    this.nextAddedRec = this.nextMovedRec = null;
  }

  toString() {
    return this.previousIndex === this.currentIndex
      ? `${this.item}`
      : `${this.item}[${this.previousIndex} -> ${this.currentIndex}]`;
  }
}

class _DuplicateItemRecordList {
  constructor() {
    this.head = this.tail = null;
  }

  add(record, beforeRecord) {
    // TODO: Traceur assertions
    // assert(record.prevDupRec == null);
    // assert(record.nextDupRec == null);
    // assert(beforeRecord == null ? true : beforeRecord.item == record.item);
    if (this.head === null) {
      //assert(beforeRecord == null);
      this.head = this.tail = record;
    } else {
      // TODO: Traceur assertions
      //assert(record.item === head.item);
      if (beforeRecord === null) {
        this.tail.nextDupRec = record;
        record.prevDupRec = this.tail;
        this.tail = record;
      } else {
        var prev = beforeRecord.prevDupRec;
        var next = beforeRecord;
        record.prevDupRec = prev;
        record.nextDupRec = next;

        if (prev === null) {
          this.head = record;
        } else {
          prev.nextDupRec = record;
        }

        next.prevDupRec = record;
      }
    }
  }

  get(key, hideIndex) {
    var record = this.head;

    if (typeof hideIndex !== "number") {
      hideIndex = null;
    }

    while(record !== null) {
      if (hideIndex === null || hideIndex < record.currentIndex && record.item === key) {
        return record;
      }

      record = record.nextDupRec;
    }

    return record;
  }

  remove(record) {
    // TODO: Add assertion to ensure that the record is within the list.
    // Since this is a private API, this may not be necessary, but it should assist in ensuring
    // that the routine (and library) behaves correctly.
    var prev = record.prevDupRec;
    var next = record.nextDupRec;

    if (prev === null) {
      this.head = next;
    } else {
      prev.nextDupRec = next;
    }

    if (next === null) {
      this.tail = prev;
    } else {
      next.prevDupRec = prev;
    }

    // TODO: Traceur assertions
    // These assertions look incorrect to me, if Dart/ECMAScript operator precedence is anything
    // like C/C++ (which, to my knowledge, it is)
    // assert((record.prevDupRec = null) == null);
    // assert((record.nextDupRec = null) == null);
    record.prevDupRec = record.nextDupRec = null;

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
    if (arguments.length === 1) {
      beforeRecord = null;
    }

    // TODO: traceur assert
    // assert(record.nextDupRec === null)
    // assert(record.prevDupRec === null)
    var list;

    if (!(list = this._map.get(record.item))) {
      this._map.set(record.item, list = new _DuplicateItemRecordList());
    }

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
    if (list.remove(record)) {
      this._map.delete(record.item);
    }

    return record;
  }

  clear() {
    this._map.clear();
  }
}
