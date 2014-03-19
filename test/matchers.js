function checkArray(collection, expected, actual, diffs) {
  var equals = true;
  expected = expected[collection] || [];
  actual = actual[collection];

  for (var i=0, ii=expected.length; i<ii; ++i) {
    var item = expected[i];
    var real = actual[i];
    if (i >= actual.length) {
      equals = false;
      diffs.push(`collection too short: ${item}`);
    } else {
      if (item !== real) {
        equals = false;
        diffs.push(`collection mismatch: expected ${real} to equal ${item}`);
      }
    }
  }

  if (expected.length < actual.length) {
    equals = false;
    diffs.push(`collection too long: ${actual[expected.length]}`);
  }
  return equals;
}

function linkedListToArray(list, next, transform) {
  var result = [];
  while (list) {
    result.push(transform(list));
    list = list[next];
  }
  return result;
}

function changeIteratorToList(it) {
  var list = [];
  while (it.iterate()) list.push(it.current);
  return list;
}

function changeIteratorToHandlersList(it) {
  var list = [];
  while (it.iterate()) list.push(it.current.handler);
  return list;
}

function changeIteratorToDeltasList(it) {
  var list = [];
  while (it.iterate()) list.push(`${it.current.previousValue} -> ${it.current.currentValue}`);
  return list;
}

function changeIteratorToCollectionChanges(it) {
  var changes = {
    collection: [],
    additions: [],
    removals: [],
    moves: []
  };

  function serialize(item) {
    return item.toString();
  }

  if (it.iterate()) {
    var record = it.current.currentValue;
    changes.collection = linkedListToArray(record._collectionHead, '_nextRec', serialize);
    changes.additions = linkedListToArray(record._additionsHead, '_nextAddedRec', serialize);
    changes.removals = linkedListToArray(record._removalsHead, '_nextRemovedRec', serialize);
    changes.moves = linkedListToArray(record._movesHead, '_nextMovedRec', serialize);
  }

  return changes;
}

function changeIteratorToMapChanges(it) {
  var changes = {
    map: [],
    additions: [],
    removals: [],
    changes: []
  };

  function serialize(item) {
    return item.toString();
  }

  if (it.iterate()) {
    var record = it.current.currentValue;
    changes.map = linkedListToArray(record._mapHead, '_nextKeyValue', serialize);
    changes.additions = linkedListToArray(record._additionsHead, '_nextAddedKeyValue', serialize);
    changes.removals = linkedListToArray(record._removalsHead, '_nextRemovedKeyValue', serialize);
    changes.changes = linkedListToArray(record._changesHead, '_nextChangedKeyValue', serialize);
  }

  return changes;
}

beforeEach(function() {
  this.addMatchers({
    toEqualDeltas: function(expected) {
      var count = 0;
      var actual = this.actual, deltas = changeIteratorToDeltasList(actual);
      var i, ii;
      for (i=0, ii=deltas.length; i<ii; ++i) {
        if (deltas[i] !== expected[count++]) return false;
      }
      this.message = function() {
        return `expected changes [${deltas.join(', ')}] to equal [${expected.join(', ')}]`;
      }
      return count == expected.length;      
    },

    toEqualChanges: function(expected) {
      var count = 0;
      var actual = this.actual, handlers = changeIteratorToHandlersList(actual);
      var i, ii;
      for (i=0, ii=handlers.length; i<ii; ++i) {
        if (handlers[i] !== expected[count++]) return false;
      }
      this.message = function() {
        return `expected changes [${handlers.join(', ')}] to equal [${expected.join(', ')}]`;
      }
      return count == expected.length;
    },

    toEqualCollectionRecord: function(expected) {
      var actual = changeIteratorToCollectionChanges(this.actual), diffs = [];
      var result = checkArray('collection', expected, actual, diffs) &&
                   checkArray('additions', expected, actual, diffs) &&
                   checkArray('moves', expected, actual, diffs) &&
                   checkArray('removals', expected, actual, diffs);

      this.message = function() {
        return diffs.join("\n");
      };
      return result;
    },

    toEqualMapRecord: function(expected) {
      var actual = changeIteratorToMapChanges(this.actual), diffs = [];
      var result = checkArray('map', expected, actual, diffs) &&
                   checkArray('additions', expected, actual, diffs) &&
                   checkArray('changes', expected, actual, diffs) &&
                   checkArray('removals', expected, actual, diffs);
      this.message = function() {
        return diffs.join("\n");
      };
      return result;
    }
  });
});
