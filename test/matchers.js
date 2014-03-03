function checkLinkedListProperty(keys, expected, actual, diffs) {
  var listItem = actual[keys['listHead']], equals = true, list = expected[keys['list']];
  for (var i = 0, ii = list.length; i < ii; ++i) {
    var item = list[i];
    if (listItem === null) {
      equals = false;
      diffs.push('collection too short: ' + item);
    } else {
      if (listItem.toString() !== item) {
        equals = false;
        diffs.push('collection mismatch: expected ' + listItem + ' to equal ' + item);
      }
      listItem = listItem[keys['listNext']];
    }
  }
  if (listItem !== null) {
    equals = false;
    diffs.push('collection too long: ' + listItem);
  }
  return equals;
}

var collectionKeys = {
  list: 'collection',
  listHead: 'collectionHead',
  listNext: 'nextCollectionItem'
};

var additionsKeys = {
  list: 'additions',
  listHead: 'additionsHead',
  listNext: 'nextAddedItem'
};

var movesKeys = {
  list: 'moves',
  listHead: 'movesHead',
  listNext: 'nextMovedItem'
};

var removalsKeys = {
  list: 'removals',
  listHead: 'removalsHead',
  listNext: 'nextRemovedItem'
};

var mapKeys = {
  list: 'map',
  listHead: 'mapHead',
  listNext: 'nextKeyValue'
};

var mapAdditionsKeys = {
  list: 'additions',
  listHead: 'additionsHead',
  listNext: 'nextAddedKeyValue'
};

var changesKeys = {
  list: 'changes',
  listHead: 'changesHead',
  listNext: 'nextChangedKeyValue'
};

var mapRemovalsKeys = {
  list: 'removals',
  listHead: 'removalsHead',
  listNext: 'nextRemovedKeyValue'
};

beforeEach(function() {
  this.addMatchers({
    toEqualCollectionRecord: function(expected) {
      var actual = this.actual, diffs = [];
      if (typeof expected.collection === 'undefined') expected.collection = [];
      if (typeof expected.additions === 'undefined') expected.additions = [];
      if (typeof expected.moves === 'undefined') expected.moves = [];
      if (typeof expected.removals === 'undefined') expected.removals = [];
      var result = checkLinkedListProperty(collectionKeys, expected, actual, diffs) &&
                   checkLinkedListProperty(additionsKeys, expected, actual, diffs) &&
                   checkLinkedListProperty(movesKeys, expected, actual, diffs) &&
                   checkLinkedListProperty(removalsKeys, expected, actual, diffs);
      this.message = function() {
        return diffs.join("\n");
      };
      return result;
    },

    toEqualMapRecord: function(expected) {
      var actual = this.actual, diffs = [];
      if (typeof expected.map === 'undefined') expected.map = [];
      if (typeof expected.additions === 'undefined') expected.additions = [];
      if (typeof expected.changes === 'undefined') expected.changes = [];
      if (typeof expected.removals === 'undefined') expected.removals = [];
      var result = checkLinkedListProperty(mapKeys, expected, actual, diffs) &&
                   checkLinkedListProperty(mapAdditionsKeys, expected, actual, diffs) &&
                   checkLinkedListProperty(changesKeys, expected, actual, diffs) &&
                   checkLinkedListProperty(mapRemovalsKeys, expected, actual, diffs);
      this.message = function() {
        return diffs.join("\n");
      };
      return result;
    }
  });
});
