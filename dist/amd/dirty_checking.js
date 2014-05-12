define(['./change_detection'], function($__0) {
  "use strict";
  var __moduleName = "dirty_checking";
  if (!$__0 || !$__0.__esModule)
    $__0 = {'default': $__0};
  var $__3 = $traceurRuntime.assertObject($__0),
      ChangeDetector = $__3.ChangeDetector,
      ChangeDetectorGroup = $__3.ChangeDetectorGroup,
      ChangeRecord = $__3.ChangeRecord,
      MapChangeRecord = $__3.MapChangeRecord,
      MapKeyValue = $__3.MapKeyValue,
      CollectionChangeRecord = $__3.CollectionChangeRecord,
      CollectionChangeItem = $__3.CollectionChangeItem;
  var _MODE_NAMES = ['MARKER', 'IDENT', 'REFLECT', 'GETTER', 'MAP[]', 'ITERABLE', 'MAP'];
  var _MODE_MARKER_ = 0;
  var _MODE_IDENTITY_ = 1;
  var _MODE_REFLECT_ = 2;
  var _MODE_GETTER_ = 3;
  var _MODE_MAP_FIELD_ = 4;
  var _MODE_ITERABLE_ = 5;
  var _MODE_MAP_ = 6;
  var _NOTIFY_ONLY_ = 10;
  var GetterCache = function GetterCache(map) {
    this._map = map;
  };
  ($traceurRuntime.createClass)(GetterCache, {get: function(field) {
      return this._map[field] || null;
    }}, {});
  var DirtyCheckingChangeDetectorGroup = function DirtyCheckingChangeDetectorGroup(parent, cache) {
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
  };
  var $DirtyCheckingChangeDetectorGroup = DirtyCheckingChangeDetectorGroup;
  ($traceurRuntime.createClass)(DirtyCheckingChangeDetectorGroup, {
    watch: function(context, field, handler) {
      var getter = field === null ? null : this._getterCache.get(field);
      return this._recordAdd(new DirtyCheckingRecord(this, context, field, getter, handler));
    },
    remove: function() {
      var root = this._root;
      var prevRecord = this._recordHead._prevRecord;
      var nextRecord = this._childInclRecordTail._nextRecord;
      if (prevRecord !== null)
        prevRecord._nextRecord = nextRecord;
      if (nextRecord !== null)
        nextRecord._prevRecord = prevRecord;
      var cursor = this._recordHead;
      while (cursor != nextRecord) {
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
      this._prev = this._next = null;
      this._recordHead._prev = null;
      this._recordTail._prev = null;
      this._recordHead = this._recordTail = null;
    },
    _recordAdd: function(record) {
      var previous = this._recordTail,
          next = previous === null ? null : previous._nextRecord;
      record._nextRecord = next;
      record._prevRecord = previous;
      if (previous !== null)
        previous._nextRecord = record;
      if (next !== null)
        next._prevRecord = record;
      this._recordTail = record;
      if (previous === this._marker)
        this._recordRemove(this._marker);
      return record;
    },
    _recordRemove: function(record) {
      var previous = record._prevRecord,
          next = record._nextRecord;
      if (record === this._recordHead && record === this._recordTail) {
        this._recordHead = this._recordTail = this._marker;
        this._marker._nextRecord = next;
        this._marker._prevRecord = previous;
        if (previous !== null)
          previous._nextRecord = this._marker;
        if (next !== null)
          next._prevRecord = this._marker;
      } else {
        if (record === this._recordTail)
          this._recordTail = previous;
        if (record === this._recordHead)
          this._recordHead = next;
        if (previous !== null)
          previous._nextRecord = next;
        if (next !== null)
          next._prevRecord = previous;
      }
    },
    newGroup: function() {
      var child = new $DirtyCheckingChangeDetectorGroup(this, this._getterCache);
      if (this._childHead === null) {
        this._childHead = this._childTail = child;
      } else {
        child._prev = this._childTail;
        this._childTail._next = child;
        this._childTail = child;
      }
      return child;
    },
    get _root() {
      var root = this,
          next;
      while ((next = root._parent) !== null) {
        root = next;
      }
      return (root instanceof DirtyCheckingChangeDetector) ? root : null;
    },
    get _childInclRecordTail() {
      var tail = this,
          nextTail;
      while ((nextTail = tail._childTail) !== null) {
        tail = nextTail;
      }
      return tail._recordTail;
    },
    get count() {
      var count = 0,
          cursor = this._recordHead,
          end = this._childInclRecordTail;
      while (cursor !== null) {
        if (cursor._mode !== _MODE_MARKER_) {
          ++count;
        }
        if (cursor === end)
          break;
        cursor = cursor._nextRecord;
      }
      return count;
    },
    toString: function() {
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
  }, {}, ChangeDetector);
  var DirtyCheckingChangeDetector = function DirtyCheckingChangeDetector(cache) {
    var observerSelector = arguments[1] !== (void 0) ? arguments[1] : null;
    $traceurRuntime.superCall(this, $DirtyCheckingChangeDetector.prototype, "constructor", [null, cache]);
    this._fakeHead = DirtyCheckingRecord.marker();
    this._observerSelector = observerSelector;
  };
  var $DirtyCheckingChangeDetector = DirtyCheckingChangeDetector;
  ($traceurRuntime.createClass)(DirtyCheckingChangeDetector, {
    getObserver: function(obj, field) {
      return this._observerSelector && this._observerSelector.getObserver(obj, field);
    },
    _assertRecordsOk: function() {
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
          if (groupRecord === record)
            record = record._nextRecord;
          else
            throw "lost: " + record + " found " + groupRecord + "\n" + this;
          if (groupRecord === groupTail)
            break;
          groupRecord = groupRecord._nextRecord;
        }
      }
      return true;
    },
    collectChanges: function(exceptionHandler, stopwatch) {
      if (stopwatch)
        stopwatch.start();
      var changeTail = this._fakeHead,
          current = this._recordHead,
          count = 0;
      while (current !== null) {
        try {
          if (current.check()) {
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
      var changeHead = this._fakeHead._nextChange;
      this._fakeHead._nextChange = null;
      return new ChangeIterator(changeHead);
    },
    remove: function() {
      throw "Root ChangeDetector can not be removed";
    },
    get _root() {
      return this;
    }
  }, {}, DirtyCheckingChangeDetectorGroup);
  var ChangeIterator = function ChangeIterator(next) {
    this._current = null;
    this._next = next;
  };
  ($traceurRuntime.createClass)(ChangeIterator, {
    get current() {
      return this._current;
    },
    iterate: function() {
      this._current = this._next;
      if (this._next !== null) {
        this._next = this._current._nextChange;
        this._current._nextChange = null;
      }
      return this._current !== null;
    }
  }, {});
  var DirtyCheckingRecord = function DirtyCheckingRecord(group, object, fieldName, getter, handler) {
    this._group = group;
    this._getter = getter;
    this._handler = handler;
    this._field = fieldName;
    this.object = object;
    this._nextRecord = this._prevRecord = this._nextChange = null;
  };
  var $DirtyCheckingRecord = DirtyCheckingRecord;
  ($traceurRuntime.createClass)(DirtyCheckingRecord, {
    get nextChange() {
      return this._nextChange;
    },
    get field() {
      return this._field;
    },
    get handler() {
      return this._handler;
    },
    set handler(handler) {
      this._handler = handler;
    },
    get object() {
      return this._object;
    },
    _clearObject: function() {
      if (this._observer) {
        this._observer.close();
        this._observer = null;
      }
      this._object = null;
    },
    set object(obj) {
      var $__1 = this;
      this._clearObject(obj);
      this._object = obj;
      if (obj === null) {
        this._mode = _MODE_IDENTITY_;
        return;
      }
      if (this.field === null) {
        if (typeof obj === "object") {
          if (Array.isArray(obj)) {
            if (this._mode !== _MODE_ITERABLE_) {
              this._mode = _MODE_ITERABLE_;
              this.currentValue = new _CollectionChangeRecord();
            }
          } else if (this._mode !== _MODE_MAP_) {
            this._mode = _MODE_MAP_;
            this.currentValue = new _MapChangeRecord();
          }
        } else {
          this._mode = _MODE_IDENTITY_;
        }
        return;
      }
      this._observer = this._group && this._group._root.getObserver(obj, this._field);
      if (this._observer) {
        this._mode = _NOTIFY_ONLY_;
        this.newValue = this._observer.open((function(value) {
          $__1.newValue = value;
          $__1._mode = _NOTIFY_ONLY_;
        }));
      } else if (this._getter !== null) {
        this._mode = _MODE_GETTER_;
      } else {
        this._mode = _MODE_MAP_FIELD_;
      }
    },
    check: function() {
      var current;
      switch (this._mode) {
        case _MODE_MARKER_:
          return false;
        case _MODE_REFLECT_:
          if (!this.object)
            return undefined;
          current = this.object[this.field];
          break;
        case _MODE_GETTER_:
          current = this._getter(this.object);
          break;
        case _NOTIFY_ONLY_:
          current = this.newValue;
          this._mode = _MODE_IDENTITY_;
          break;
        case _MODE_MAP_FIELD_:
          if (!this.object)
            return undefined;
          current = this.object[this.field];
          break;
        case _MODE_IDENTITY_:
          return false;
        case _MODE_MAP_:
        case _MODE_ITERABLE_:
          return this.currentValue._check(this.object);
        default:
          throw "UNREACHABLE";
      }
      var last = this.currentValue;
      if (last !== current) {
        if (!((typeof last === "number" && last !== last) && (typeof current === "number" && current !== current))) {
          this.previousValue = last;
          this.currentValue = current;
          return true;
        }
      }
      return false;
    },
    remove: function() {
      this._clearObject();
      this._group._recordRemove(this);
    },
    toString: function() {
      var hashCode = 0;
      return (_MODE_NAMES[this._mode] + "[" + this.field + "]{" + hashCode + "}");
    }
  }, {marker: function() {
      var record = new $DirtyCheckingRecord(null, null, null, null, null);
      record._mode = _MODE_MARKER_;
      return record;
    }}, ChangeRecord);
  var _MapChangeRecord = function _MapChangeRecord() {
    this._records = {};
    this._map = {};
    this._mapHead = null;
    this._changesHead = this._changesTail = null;
    this._additionsHead = this._additionsTail = null;
    this._removalsHead = this._removalsTail = null;
  };
  ($traceurRuntime.createClass)(_MapChangeRecord, {
    get map() {
      return this._map;
    },
    get mapHead() {
      return this._mapHead;
    },
    get changesHead() {
      return this._changesHead;
    },
    get additionsHead() {
      return this._additionsHead;
    },
    get removalsHead() {
      return this._removalsHead;
    },
    get isDirty() {
      return this._additionsHead !== null || this._changesHead !== null || this._removalsHead !== null;
    },
    forEachChange: function(fn) {
      var record = this._changesHead;
      while (record !== null) {
        fn(record);
        record = record._nextChangedKeyValue;
      }
    },
    forEachAddition: function(fn) {
      var record = this._additionsHead;
      while (record !== null) {
        fn(record);
        record = record._nextAddedKeyValue;
      }
    },
    forEachRemoval: function(fn) {
      var record = this._removalsHead;
      while (record !== null) {
        fn(record);
        record = record._nextRemovedKeyValue;
      }
    },
    _check: function(map) {
      this._reset();
      this._map = map;
      var records = this._records;
      var oldSeqRecord = this._mapHead;
      var lastOldSeqRecord = null,
          lastNewSeqRecord = null;
      var seqChanged = false;
      var keys = Object.keys(map);
      for (var i = 0,
          ii = keys.length; i < ii; ++i) {
        var key = keys[i],
            value = map[key],
            newSeqRecord = null;
        if (oldSeqRecord !== null && key === oldSeqRecord.key) {
          newSeqRecord = oldSeqRecord;
          if (value !== oldSeqRecord._currentValue) {
            var prev = oldSeqRecord._previousValue = oldSeqRecord._currentValue;
            oldSeqRecord._currentValue = value;
            if (!((typeof prev === "number" && prev !== prev) && (typeof value === "number" && value !== value))) {
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
    },
    _reset: function() {
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
    },
    _truncate: function(lastRecord, record) {
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
    },
    _isInRemovals: function(record) {
      return record === this._removalsHead || record._nextRemovedKeyValue !== null || record._prevRemovedKeyValue !== null;
    },
    _addToRemovals: function(record) {
      if (this._removalsHead === null) {
        this._removalsHead = this._removalsTail = record;
      } else {
        this._removalsTail._nextRemovedKeyValue = record;
        record._prevRemovedKeyValue = this._removalsTail;
        this._removalsTail = record;
      }
    },
    _removeFromSeq: function(prev, record) {
      var next = record._nextKeyValue;
      if (prev === null) {
        this._mapHead = next;
      } else {
        prev._nextKeyValue = next;
      }
      record._nextKeyValue = null;
    },
    _removeFromRemovals: function(record) {
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
    },
    _addToAdditions: function(record) {
      if (this._additionsHead === null) {
        this._additionsHead = this._additionsTail = record;
      } else {
        this._additionsTail._nextAddedKeyValue = record;
        this._additionsTail = record;
      }
    },
    _addToChanges: function(record) {
      if (this._changesHead === null) {
        this._changesHead = this._changesTail = record;
      } else {
        this._changesTail._nextChangedKeyValue = record;
        this._changesTail = record;
      }
    }
  }, {}, MapChangeRecord);
  var KeyValueRecord = function KeyValueRecord(key) {
    this._key = key;
    this._previousValue = this._currentValue = null;
    this._nextKeyValue = this._nextAddedKeyValue = this._nextChangedKeyValue = null;
    this._nextRemovedKeyValue = this._prevRemovedKeyValue = null;
  };
  ($traceurRuntime.createClass)(KeyValueRecord, {
    get key() {
      return this._key;
    },
    get previousValue() {
      return this._previousValue;
    },
    get currentValue() {
      return this._currentValue;
    },
    get nextKeyValue() {
      return this._nextKeyValue;
    },
    get nextAddedKeyValue() {
      return this._nextAddedKeyValue;
    },
    get nextRemovedKeyValue() {
      return this._nextRemovedKeyValue;
    },
    get nextChangedKeyValue() {
      return this._nextChangedKeyValue;
    },
    toString: function() {
      return this._previousValue === this._currentValue ? this._key : (this._key + "[" + this._previousValue + " -> " + this._currentValue + "]");
    }
  }, {}, MapKeyValue);
  var _CollectionChangeRecord = function _CollectionChangeRecord() {
    this._iterable = null;
    this._items = new DuplicateMap();
    this._removedItems = new DuplicateMap();
    this._collectionHead = this._collectionTail = null;
    this._additionsHead = this._additionsTail = null;
    this._movesHead = this._movesTail = null;
    this._removalsHead = this._removalsTail = null;
  };
  ($traceurRuntime.createClass)(_CollectionChangeRecord, {
    get collectionHead() {
      return this._collectionHead;
    },
    get additionsHead() {
      return this._additionsHead;
    },
    get movesHead() {
      return this._movesHead;
    },
    get removalsHead() {
      return this._removalsHead;
    },
    forEachAddition: function(fn) {
      var record = this._additionsHead;
      while (record !== null) {
        fn(record);
        record = record._nextAddedRec;
      }
    },
    forEachMove: function(fn) {
      var record = this._movesHead;
      while (record !== null) {
        fn(record);
        record = record._nextMovedRec;
      }
    },
    forEachRemoval: function(fn) {
      var record = this._removalsHead;
      while (record !== null) {
        fn(record);
        record = record._nextRemovedRec;
      }
    },
    get iterable() {
      return this._iterable;
    },
    _check: function(collection) {
      this._reset();
      var record = this._collectionHead,
          maybeDirty = false,
          index,
          end,
          item;
      if (Array.isArray(collection)) {
        var list = collection;
        for (index = 0, end = list.length; index < end; index++) {
          item = list[index];
          if (record === null || item !== record.item) {
            record = this.mismatch(record, item, index);
            maybeDirty = true;
          } else if (maybeDirty) {
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
            record = this.verifyReinsertion(record, item, index);
          }
          record = record._nextRec;
          index++;
        }
      }
      this._truncate(record);
      this._iterable = collection;
      return this.isDirty;
    },
    _reset: function() {
      var record;
      record = this._additionsHead;
      while (record !== null) {
        record.previousIndex = record.currentIndex;
        record = record._nextAddedRec;
      }
      this._additionsHead = this._additionsTail = null;
      record = this._movesHead;
      while (record !== null) {
        record.previousIndex = record.currentIndex;
        var nextRecord = record._nextMovedRec;
        record._nextMovedRec = null;
        record = nextRecord;
      }
      this._movesHead = this._movesTail = null;
      this._removalsHead = this._removalsTail = null;
    },
    get isDirty() {
      return this._additionsHead !== null || this._movesHead !== null || this._removalsHead !== null;
    },
    mismatch: function(record, item, index) {
      if (record !== null) {
        if (typeof item === "string" && typeof record.item === "string" && record.item === item) {
          record.item = item;
          return record;
        }
        if ((typeof item === "number" && item !== item) && (typeof record.item === "number" && record.item !== record.item)) {
          return record;
        }
      }
      var prev = record === null ? this._collectionTail : record._prevRec;
      if (record !== null)
        this._collection_remove(record);
      record = this._items.get(item, index);
      if (record !== null) {
        this._collection_moveAfter(record, prev, index);
      } else {
        record = this._removedItems.get(item);
        if (record !== null) {
          this._collection_reinsertAfter(record, prev, index);
        } else {
          record = this._collection_addAfter(new ItemRecord(item), prev, index);
        }
      }
      return record;
    },
    verifyReinsertion: function(record, item, index) {
      var reinsertRecord = this._removedItems.get(item);
      if (reinsertRecord !== null) {
        record = this._collection_reinsertAfter(reinsertRecord, record._prevRec, index);
      } else if (record.currentIndex != index) {
        record.currentIndex = index;
        this._moves_add(record);
      }
      return record;
    },
    _truncate: function(record) {
      while (record !== null) {
        var nextRecord = record._nextRec;
        this._removals_add(this._collection_unlink(record));
        record = nextRecord;
      }
      this._removedItems.clear();
    },
    _collection_reinsertAfter: function(record, insertPrev, index) {
      this._removedItems.remove(record);
      var prev = record._prevRemovedRec;
      var next = record._nextRemovedRec;
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
    },
    _collection_moveAfter: function(record, prev, index) {
      this._collection_unlink(record);
      this._collection_insertAfter(record, prev, index);
      this._moves_add(record);
      return record;
    },
    _collection_addAfter: function(record, prev, index) {
      this._collection_insertAfter(record, prev, index);
      if (this._additionsTail === null) {
        this._additionsTail = this._additionsHead = record;
      } else {
        this._additionsTail = this._additionsTail._nextAddedRec = record;
      }
      return record;
    },
    _collection_insertAfter: function(record, prev, index) {
      var next = prev === null ? this._collectionHead : prev._nextRec;
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
    },
    _collection_remove: function(record) {
      this._removals_add(this._collection_unlink(record));
    },
    _collection_unlink: function(record) {
      this._items.remove(record);
      var prev = record._prevRec;
      var next = record._nextRec;
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
    },
    _moves_add: function(record) {
      if (this._movesTail === null) {
        this._movesTail = this._movesHead = record;
      } else {
        this._movesTail = this._movesTail._nextMovedRec = record;
      }
      return record;
    },
    _removals_add: function(record) {
      record.currentIndex = null;
      this._removedItems.put(record);
      if (this._removalsTail === null) {
        this._removalsTail = this._removalsHead = record;
      } else {
        record._prevRemovedRec = this._removalsTail;
        this._removalsTail = this._removalsTail._nextRemovedRec = record;
      }
      return record;
    },
    toString: function() {
      var record;
      var list = [];
      record = this._collectionHead;
      while (record !== null) {
        list.push(record);
        record = record._nextRec;
      }
      var additions = [];
      record = this._additionsHead;
      while (record !== null) {
        additions.push(record);
        record = record._nextAddedRec;
      }
      var moves = [];
      record = this._movesHead;
      while (record !== null) {
        moves.push(record);
        record = record._nextMovedRec;
      }
      var removals = [];
      record = this._removalsHead;
      while (record !== null) {
        removals.push(record);
        record = record._nextRemovedRec;
      }
      return "collection: " + list.join(', ') + "\n" + "additions: " + additions.join(', ') + "\n" + "moves: " + moves.join(', ') + "\n" + "removals: " + removals.join(', ') + "\n";
    }
  }, {}, CollectionChangeRecord);
  var ItemRecord = function ItemRecord(item) {
    this.item = item;
    this.previousIndex = this.currentIndex = null;
    this._prevRec = this._nextRec = null;
    this._prevDupRec = this._nextDupRec = null;
    this._prevRemovedRec = this._nextRemovedRec = null;
    this._nextAddedRec = this._nextMovedRec = null;
  };
  ($traceurRuntime.createClass)(ItemRecord, {
    get nextCollectionItem() {
      return this._nextRec;
    },
    get nextRemovedItem() {
      return this._nextRemovedRec;
    },
    get nextAddedItem() {
      return this._nextAddedRec;
    },
    get nextMovedItem() {
      return this._nextMovedRec;
    },
    toString: function() {
      return this.previousIndex === this.currentIndex ? ("" + this.item) : (this.item + "[" + this.previousIndex + " -> " + this.currentIndex + "]");
    }
  }, {}, CollectionChangeItem);
  var _DuplicateItemRecordList = function _DuplicateItemRecordList() {
    this.head = this.tail = null;
  };
  ($traceurRuntime.createClass)(_DuplicateItemRecordList, {
    add: function(record, beforeRecord) {
      if (this.head === null) {
        this.head = this.tail = record;
      } else {
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
    },
    get: function(key, hideIndex) {
      var record = this.head;
      if (typeof hideIndex !== "number")
        hideIndex = null;
      while (record !== null) {
        if (hideIndex === null || hideIndex < record.currentIndex && record.item === key) {
          return record;
        }
        record = record._nextDupRec;
      }
      return record;
    },
    remove: function(record) {
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
      record._prevDupRec = record._nextDupRec = null;
      return this.head === null;
    }
  }, {});
  var DuplicateMap = function DuplicateMap() {
    this._map = new Map();
  };
  ($traceurRuntime.createClass)(DuplicateMap, {
    put: function(record, beforeRecord) {
      if (arguments.length === 1)
        beforeRecord = null;
      var list;
      if (!(list = this._map.get(record.item)))
        this._map.set(record.item, list = new _DuplicateItemRecordList());
      list.add(record, beforeRecord);
    },
    get: function(key, hideIndex) {
      var list = this._map.get(key);
      return !(list instanceof _DuplicateItemRecordList) ? null : list.get(key, hideIndex);
    },
    remove: function(record) {
      var list = this._map.get(record.item);
      if (list.remove(record))
        this._map.delete(record.item);
      return record;
    },
    clear: function() {
      this._map.clear();
    }
  }, {});
  return {
    get GetterCache() {
      return GetterCache;
    },
    get DirtyCheckingChangeDetectorGroup() {
      return DirtyCheckingChangeDetectorGroup;
    },
    get DirtyCheckingChangeDetector() {
      return DirtyCheckingChangeDetector;
    },
    __esModule: true
  };
});
