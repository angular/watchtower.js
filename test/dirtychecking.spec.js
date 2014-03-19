import {
  GetterCache,
  DirtyCheckingChangeDetector
} from '/base/src/dirty_checking.js';

describe('DirtyCheckingChangeDetector', function() {
  var getterCache, detector, setup, setupUser, user;

  beforeEach(function() {
    setup = function() {
      getterCache = new GetterCache({
        'first': function(o) { return o.first; },
        'age': function(o) { return o.age; }
      });

      detector = new DirtyCheckingChangeDetector(getterCache);
    }

    setupUser = function(first='', last='') {
      setup();
      user = new _User(first, last);

      detector.watch(user, 'first', null);
      detector.watch(user, 'last', null);
      detector.collectChanges();
    }
  });


  describe('object field', function() {
    it('should detect nothing', function() {
      setup();
      var changes = detector.collectChanges();
      expect(changes.iterate()).toBe(false);
    });

    it('should return an empty change iterator when no watched change', function() {
      setupUser();

      expect(detector.collectChanges().iterate()).toBe(false);
    });


    it('should return changes by order of watch when changed', function() {
      setupUser();

      user.first = 'misko';
      user.last = 'hevery';

      expect(detector.collectChanges()).toEqualDeltas([" -> misko", " -> hevery"]);
    });


    it('should ignore changes to strings which result in same value', function() {
      setupUser('misko');

      // force different instance
      user.first = 'mis';
      user.first += 'ko';
      expect(detector.collectChanges().iterate()).toBe(false);
    });


    it('should return only changes for changed properties', function() {
      setupUser('misko', 'hevery');

      user.last = 'Hevery';
      expect(detector.collectChanges()).toEqualDeltas(["hevery -> Hevery"]);
    });


    it('should ignore NaN != NaN', function() {
      setupUser();

      user.age = NaN;
      detector.watch(user, 'age', null);
      detector.collectChanges();

      expect(detector.collectChanges().iterate()).toBe(false);
    });


    it('should not ignore NaN -> non-NaN', function() {
      setupUser();

      user.age = NaN;
      detector.watch(user, 'age', null);
      detector.collectChanges();

      user.age = 17; /* lets be generous! */
      expect(detector.collectChanges()).toEqualDeltas(["NaN -> 17"]);
    });


    it('should treat map field dereference as []', function() {
      setup();
      var obj = {'name': 'misko'};
      detector.watch(obj, 'name', null);
      detector.collectChanges();

      obj['name'] = 'Misko';

      expect(detector.collectChanges()).toEqualDeltas(["misko -> Misko"]);
    });
  });


  describe('insertions / removals', function() {
    it('should insert at the end of the list', function() {
      var obj = {};
      var a = detector.watch(obj, 'a', 'a');
      var b = detector.watch(obj, 'b', 'b');

      obj['a'] = obj['b'] = 1;
      expect(detector.collectChanges()).toEqualChanges(["a", "b"]);

      obj['a'] = obj['b'] = 2;
      a.remove();
      expect(detector.collectChanges()).toEqualChanges(["b"]);

      obj['a'] = obj['b'] = 3;
      b.remove();

      expect(detector.collectChanges()).toEqualChanges([]);
    });


    it('should remove all watches in group and group\'s children', function() {
      setup();
      var obj = {};
      var ra = detector.watch(obj, 'a', '0a');
      var child1a = detector.newGroup();
      var child1b = detector.newGroup();
      var child2 = child1a.newGroup();

      child1a.watch(obj, 'a', '1a');
      child1b.watch(obj, 'a', '1b');
      detector.watch(obj, 'a', '0A');
      child1a.watch(obj, 'a', '1A');
      child2.watch(obj, 'a', '2A');

      obj['a'] = 1;
      expect(detector.collectChanges()).toEqualChanges(['0a', '0A', '1a', '1A', '2A', '1b']);
      obj['a'] = 2;
      child1a.remove(); // should also remove child2
      expect(detector.collectChanges()).toEqualChanges(['0a', '0A', '1b']);
    });


    it('should add watches within its own group', function() {
      setup();
      var obj = {};
      var ra = detector.watch(obj, 'a', 'a');
      var child = detector.newGroup();
      var cb = child.watch(obj, 'b', 'b');

      obj['a'] = obj['b'] = 1;
      expect(detector.collectChanges()).toEqualChanges(['a', 'b']);

      obj['a'] = obj['b'] = 2;
      ra.remove();
      expect(detector.collectChanges()).toEqualChanges(['b']);

      obj['a'] = obj['b'] = 3;
      cb.remove();
      expect(detector.collectChanges()).toEqualChanges([]);

      // TODO: add them back in wrong order, assert events in right order
      cb = child.watch(obj, 'b', 'b');
      ra = detector.watch(obj, 'a', 'a');
      obj['a'] = obj['b'] = 4;
      expect(detector.collectChanges()).toEqualChanges(['a', 'b']);
    });


    it('should properly add children', function() {
      setup();
      var a = detector.newGroup();
      var aChild = a.newGroup();
      var b = detector.newGroup();
      expect(function() {
        detector.collectChanges();
      }).not.toThrow();
    });
  });


  describe('list watching', function() {
    var setupList, list;
    beforeEach(function() {
      setupList = function(l) {
        setup();
        list = l || [];
      }
    });


    it('should detect a value pushed to empty list', function() {
      setupList();
      detector.watch(list, null, 'handler');

      list.push('a');
      expect(detector.collectChanges()).toEqualCollectionRecord({
        collection: ['a[null -> 0]'],
        additions: ['a[null -> 0]']
      });
    });


    it('should detect when a value is pushed to a non-empty list', function() {
      setupList(['a']);
      detector.watch(list, null, 'handler');
      detector.collectChanges();

      list.push('b');
      expect(detector.collectChanges()).toEqualCollectionRecord({
        collection: ['a', 'b[null -> 1]'],
        additions: ['b[null -> 1]']
      });
    });


    it('should detect when multiple values are pushed to a non-empty list', function() {
      setupList(['a', 'b']);
      detector.watch(list, null, 'handler');
      detector.collectChanges();

      list.push('c');
      list.push('d');
      expect(detector.collectChanges()).toEqualCollectionRecord({
        collection: ['a', 'b', 'c[null -> 2]', 'd[null -> 3]'],
        additions: ['c[null -> 2]', 'd[null -> 3]']
      });
    });


    it('should detect when a value is removed from middle of non-empty list', function() {
      setupList(['a', 'b', 'c', 'd']);
      detector.watch(list, null, 'handler');
      detector.collectChanges();

      list.splice(2, 1);
      expect(list).toEqual(['a', 'b', 'd']);
      expect(detector.collectChanges()).toEqualCollectionRecord({
        collection: ['a', 'b', 'd[3 -> 2]'],
        additions: [],
        moves: ['d[3 -> 2]'],
        removals: ['c[2 -> null]']
      });
    });

    it('should detect when a non-empty list is cleared', function() {
      setupList(['a', 'b', 'd']);
      detector.watch(list, null, 'handler');
      detector.collectChanges();

      list.length = 0;
      expect(detector.collectChanges()).toEqualCollectionRecord({
        removals: ['a[0 -> null]', 'b[1 -> null]', 'd[2 -> null]']
      });
    });


    it('should detect when a non-empty list is re-arranged', function() {
      setupList(['a', 'b', 'd']);
      detector.watch(list, null, 'handler');
      detector.collectChanges();

      list.length = 0;
      list.push('d', 'c', 'b', 'a');
      expect(detector.collectChanges()).toEqualCollectionRecord({
        collection: ['d[2 -> 0]', 'c[null -> 1]', 'b[1 -> 2]', 'a[0 -> 3]'],
        additions: ['c[null -> 1]'],
        moves: ['d[2 -> 0]', 'b[1 -> 2]', 'a[0 -> 3]']
      });
    });


  /**
   * I'm not sure there's a good analog for this test in JS, so I'm calling this a TODO
   * test... I think it may be possible to write a test similar to this using ES6 generators
   * / custom iteratables, but that seems like a bit more effort. So, worry about this later.
   * it('should detect changes in iterables', function() {
   *  var list = [];
   *  var record = detector.watch(list.map(function(i) { console.log(i); return i; }), null, 'handler');
   *  expect(detector.collectChanges()).toBe(null);
   *
   *  list.push('a');
   *  expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
   *    collection: ['a[null -> 0]'],
   *    additions: ['a[null -> 0]']
   *  });
   *
   *  list.push('b');
   *  expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
   *    collection: ['a', 'b[null -> 1]'],
   *    additions: ['b[null -> 1]']
   *  });
   *
   *  list.push('c');
   *  list.push('d');
   *  expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
   *    collection: ['a', 'b', 'c[null -> 2]', 'd[null -> 3]'],
   *    additions: ['c[null -> 2]', 'd[null -> 3]']
   *  });
   *
   *  list.splice(2, 1);
   *  expect(list).toEqual(['a', 'b', 'd']);
   *  expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
   *    collection: ['a', 'b', 'd[3 -> 2]'],
   *    moves: ['d[3 -> 2]'],
   *    removals: ['c[2 -> null]']
   *  });
   *
   *  list.length = 0;
   *  list.push('d', 'c', 'b', 'a');
   *  expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
   *    collection: ['d[2 -> 0]', 'c[null -> 1]', 'b[1 -> 2]', 'a[0 -> 3]'],
   *    additions: ['c[null -> 1]'],
   *    moves: ['d[2 -> 0]', 'b[1 -> 2]', 'a[0 -> 3]']
   *  });
   *});
   */


    it('should test a string by value rather than by reference', function() {
      setupList(['a', 'boo']);
      detector.watch(list, null, null);
      detector.collectChanges();

      list[1] = 'b' + 'oo';
      expect(detector.collectChanges()).toEqualChanges([]);
    });


    it('should ignore [NaN] != [NaN]', function() {
      setupList([NaN]);
      detector.watch(list, null, null);
      detector.collectChanges();

      expect(detector.collectChanges()).toEqualChanges([]);
    });


    it('should not ignore [NaN] -> [not-NaN]', function() {
      setupList([NaN]);
      detector.watch(list, null, null);
      detector.collectChanges();

      list[0] = 17;
      expect(detector.collectChanges()).toEqualCollectionRecord({
        collection: ['17[null -> 0]'],
        additions: ['17[null -> 0]'],
        removals: ['NaN[0 -> null]']
      });
    });


    it('should remove and add same item', function() {
      setupList(['a', 'b', 'c']);
      var record = detector.watch(list, null, 'handler');
      detector.collectChanges();

      list.splice(1, 1);
      expect(list).toEqual(['a', 'c']);
      expect(detector.collectChanges()).toEqualCollectionRecord({
        collection: ['a', 'c[2 -> 1]'],
        moves: ['c[2 -> 1]'],
        removals: ['b[1 -> null]']
      });

      list.splice(1, 0, 'b');
      expect(list).toEqual(['a', 'b', 'c']);
      expect(detector.collectChanges()).toEqualCollectionRecord({
        collection: ['a', 'b[null -> 1]', 'c[1 -> 2]'],
        additions: ['b[null -> 1]'],
        moves: ['c[1 -> 2]']
      });
    });


    it('should support duplicates', function() {
      setupList(['a', 'a', 'a', 'b', 'b'])
      detector.watch(list, null, 'handler');
      detector.collectChanges();

      list.splice(0, 1);
      expect(list).toEqual(['a', 'a', 'b', 'b']);
      expect(detector.collectChanges()).toEqualCollectionRecord({
        collection: ['a', 'a', 'b[3 -> 2]', 'b[4 -> 3]'],
        moves: ['b[3 -> 2]', 'b[4 -> 3]'],
        removals: ['a[2 -> null]']
      });
    });


    it('should support insertions/moves', function() {
      setupList(['a', 'a', 'b', 'b']);
      detector.watch(list, null, 'handler');
      detector.collectChanges();

      list.unshift('b');
      expect(list).toEqual(['b', 'a', 'a', 'b', 'b']);
      expect(detector.collectChanges()).toEqualCollectionRecord({
        collection: ['b[2 -> 0]', 'a[0 -> 1]', 'a[1 -> 2]', 'b', 'b[null -> 4]'],
        additions: ['b[null -> 4]'],
        moves: ['b[2 -> 0]', 'a[0 -> 1]', 'a[1 -> 2]']
      });
    });


    /* TODO: 'should support UnmodifiableListView' test has been removed, but it may be
       desirable to add a variation of this using Object.freeze(). */


    /* TODO: come up with a more meaningful description for this spec. This is really unclear.
       https://github.com/angular/angular.dart/blob/8e1e69d/test/change_detection/dirty_checking_change_detector_spec.dart#L336 */
    it('should bug', function() {
      setupList([1, 2, 3, 4]);
      detector.watch(list, null, 'handler');

      expect(detector.collectChanges()).toEqualCollectionRecord({
        collection: ['1[null -> 0]', '2[null -> 1]', '3[null -> 2]', '4[null -> 3]'],
        additions: ['1[null -> 0]', '2[null -> 1]', '3[null -> 2]', '4[null -> 3]']
      });

      list.splice(0, 1);
      expect(detector.collectChanges()).toEqualCollectionRecord({
        collection: ['2[1 -> 0]', '3[2 -> 1]', '4[3 -> 2]'],
        moves: ['2[1 -> 0]', '3[2 -> 1]', '4[3 -> 2]'],
        removals: ['1[0 -> null]']
      });

      list.unshift(1);
      expect(detector.collectChanges()).toEqualCollectionRecord({
        collection: ['1[null -> 0]', '2[0 -> 1]', '3[1 -> 2]', '4[2 -> 3]'],
        additions: ['1[null -> 0]'],
        moves: ['2[0 -> 1]', '3[1 -> 2]', '4[2 -> 3]']
      });
    });
  });


  describe('map watching', function() {
    var setupMap, map;
    beforeEach(function() {
      setupMap = function(m) {
        setup();
        map = m || {};
      }
    });


    it('should detect no changes initially', function() {
      setupMap();
      detector.watch(map, null, 'handler');
      expect(detector.collectChanges()).toEqualMapRecord({});
    });


    it('should detect when a new property is added to an empty map', function() {
      setupMap();
      detector.watch(map, null, 'handler');

      map['a'] = 'A';
      expect(detector.collectChanges()).toEqualMapRecord({
        map: ['a[null -> A]'],
        additions: ['a[null -> A]']
      });
    });


    it('should detect when a new property is added to a non-empty map', function() {
      setupMap({'a': 'A'});
      detector.watch(map, null, 'handler');
      detector.collectChanges();

      map['b'] = 'B';
      expect(detector.collectChanges()).toEqualMapRecord({
        map: ['a', 'b[null -> B]'],
        additions: ['b[null -> B]']
      });
    })


    it('should detect when a map property value changes', function() {
      setupMap({'a': 'A'});
      detector.watch(map, null, 'handler');
      detector.collectChanges();

      map['a'] = 'a';
      expect(detector.collectChanges()).toEqualMapRecord({
        map: ['a[A -> a]'],
        changes: ['a[A -> a]']
      });
    });


    it('should detect when a map property value changes and addition in same turn', function() {
      setupMap({'a': 'A', 'b': 'B'});
      detector.watch(map, null, 'handler');
      detector.collectChanges();

      map['b'] = 'BB';
      map['d'] = 'D';
      expect(detector.collectChanges()).toEqualMapRecord({
        map: ['a', 'b[B -> BB]', 'd[null -> D]'],
        additions: ['d[null -> D]'],
        changes: ['b[B -> BB]']
      });
    });


    it('should detect removal from map', function() {
      setupMap({'a': 'A', 'b': 'BB', 'd': 'D'});
      detector.watch(map, null, 'handler');
      detector.collectChanges();

      delete map['b'];
      expect(detector.collectChanges()).toEqualMapRecord({
        map: ['a', 'd'],
        removals: ['b[BB -> null]'] 
      });
    });


    it('should detect removal of multiple properties in same turn', function() {
      setupMap({'a': 'A', 'd': 'D'});
      detector.watch(map, null, 'handler');
      detector.collectChanges();

      delete map['a'];
      delete map['d'];
      expect(detector.collectChanges()).toEqualMapRecord({
        removals: ['a[A -> null]', 'd[D -> null]']
      });
    });


    it('should test string keys by value rather than by reference', function() {
      setupMap({'foo': 0});
      detector.watch(map, null, null);
      detector.collectChanges();

      map['f' + 'oo'] = 0;
      expect(detector.collectChanges()).toEqualMapRecord({});
    });


    /* TODO: name this consistently with other "ignore NaN != NaN" tests */
    it('should ignore NaN -> NaN', function() {
      setupMap({'foo': NaN});
      detector.watch(map, null, null);
      detector.collectChanges();

      expect(detector.collectChanges()).toEqualMapRecord({});
    });


    it('should detect change when NaN -> non-NaN', function() {
      setupMap({'foo': NaN});
      detector.watch(map, null, null);
      detector.collectChanges();

      map['foo'] = 17;
      expect(detector.collectChanges()).toEqualMapRecord({
        map: ['foo[NaN -> 17]'],
        changes: ['foo[NaN -> 17]']
      });
    });
  });
});

class _User {
  constructor(first, last, age) {
    this.first = first;
    this.last = last;
    this.age = age;
  }
}
