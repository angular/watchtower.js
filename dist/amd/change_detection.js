define([], function() {
  "use strict";
  var __moduleName = "change_detection";
  var ChangeDetectorGroup = function ChangeDetectorGroup() {};
  ($traceurRuntime.createClass)(ChangeDetectorGroup, {
    watch: function(context, field, handler) {
      throw "watch() not implemented";
    },
    remove: function() {
      throw "remove() not implemented";
    },
    newGroup: function() {
      throw "newGroup() not implemented";
    }
  }, {});
  var ChangeDetector = function ChangeDetector() {
    $traceurRuntime.defaultSuperCall(this, $ChangeDetector.prototype, arguments);
  };
  var $ChangeDetector = ChangeDetector;
  ($traceurRuntime.createClass)(ChangeDetector, {collectChanges: function(exceptionHandler, stopWatch) {
      throw "collectChanges() not implemented";
    }}, {}, ChangeDetectorGroup);
  var Record = function Record() {};
  ($traceurRuntime.createClass)(Record, {
    get object() {
      throw "get object() not implemented";
    },
    get field() {
      throw "get field() not implemented";
    }
  }, {});
  var ChangeRecord = function ChangeRecord() {
    $traceurRuntime.defaultSuperCall(this, $ChangeRecord.prototype, arguments);
  };
  var $ChangeRecord = ChangeRecord;
  ($traceurRuntime.createClass)(ChangeRecord, {}, {}, Record);
  var WatchRecord = function WatchRecord() {
    $traceurRuntime.defaultSuperCall(this, $WatchRecord.prototype, arguments);
  };
  var $WatchRecord = WatchRecord;
  ($traceurRuntime.createClass)(WatchRecord, {
    get object() {
      throw "get object() not implemented";
    },
    set object(value) {
      throw "set object() not implemented";
    },
    check: function() {
      throw "check() not implemented";
    },
    remove: function() {
      throw "remove() not implemented";
    }
  }, {}, ChangeRecord);
  var MapChangeRecord = function MapChangeRecord() {};
  ($traceurRuntime.createClass)(MapChangeRecord, {
    get map() {
      throw "get map() not implemented";
    },
    get mapHead() {
      throw "get mapHead() not implemented";
    },
    get changesHead() {
      throw "get changesHead() not implemented";
    },
    get additionsHead() {
      throw "get additionsHead() not implemented";
    },
    get removalsHead() {
      throw "get removalsHead() not implemented";
    },
    forEachChange: function(fn) {
      throw "forEachChange() not implemented";
    },
    forEachAddition: function(fn) {
      throw "forEachAddition() not implemented";
    },
    forEachRemoval: function(fn) {
      throw "forEachRemoval() not implemented";
    }
  }, {});
  var MapKeyValue = function MapKeyValue() {};
  ($traceurRuntime.createClass)(MapKeyValue, {
    get key() {
      throw "get key() not implemented";
    },
    get previousValue() {
      throw "get previousValue() not implemented";
    },
    get currentValue() {
      throw "get currentValue() not implemented";
    },
    get nextKeyValue() {
      throw "get nextKeyValue() not implemented";
    },
    get nextAddedKeyValue() {
      throw "get nextAddedKeyValue() not implemented";
    },
    get nextRemovedKeyValue() {
      throw "get nextRemovedKeyValue() not implemented";
    },
    get nextChangedKeyValue() {
      throw "get nextChangedKeyValue() not implemented";
    }
  }, {});
  var CollectionChangeRecord = function CollectionChangeRecord() {};
  ($traceurRuntime.createClass)(CollectionChangeRecord, {
    get iterable() {
      throw "get iterable() not implemented";
    },
    get collectionHead() {
      throw "get collectionHead() not implemented";
    },
    get additionsHead() {
      throw "get additionsHead() not implemented";
    },
    get movesHead() {
      throw "get movesHead() not implemented";
    },
    get removalsHead() {
      throw "get removalsHead() not implemented";
    },
    forEachAddition: function(fn) {
      throw "forEachAddition() not implemented";
    },
    forEachMove: function(fn) {
      throw "forEachMove() not implemented";
    },
    forEachRemoval: function(fn) {
      throw "forEachRemoval() not implemented";
    }
  }, {});
  var CollectionChangeItem = function CollectionChangeItem() {};
  ($traceurRuntime.createClass)(CollectionChangeItem, {
    get nextCollectionItem() {
      throw "get nextCollectionItem() not implemented";
    },
    get nextAddedItem() {
      throw "get nextAddedItem() not implemented";
    },
    get nextRemovedItem() {
      throw "get nextRemovedItem() not implemented";
    }
  }, {});
  return {
    get ChangeDetectorGroup() {
      return ChangeDetectorGroup;
    },
    get ChangeDetector() {
      return ChangeDetector;
    },
    get ChangeRecord() {
      return ChangeRecord;
    },
    get WatchRecord() {
      return WatchRecord;
    },
    get MapChangeRecord() {
      return MapChangeRecord;
    },
    get MapKeyValue() {
      return MapKeyValue;
    },
    get CollectionChangeRecord() {
      return CollectionChangeRecord;
    },
    get CollectionChangeItem() {
      return CollectionChangeItem;
    },
    __esModule: true
  };
});
