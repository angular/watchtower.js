import {
  GetterCache,
  DirtyCheckingChangeDetector
} from '/base/src/dirty_checking.js';

describe('DirtyCheckingChangeDetector', function() {
  var getterCache, detector;

  beforeEach(function() {
    getterCache = new GetterCache({
      'first': function(o) { return o.first; },
      'age': function(o) { return o.age; }
    });

    detector = new DirtyCheckingChangeDetector(null, getterCache);
  });

  describe('object field', function() {
    it('should detect nothing', function() {
      var changes = detector.collectChanges();
      expect(changes).toBe(null);
    });

    it('should detect field changes', function() {
      var user = new _User('', '');
      var change;

      detector.watch(user, 'first', null);
      detector.watch(user, 'last', null);
      detector.collectChanges();

      change = detector.collectChanges();
      expect(change).toBe(null);

      user.first = 'misko';
      user.last = 'hevery';

      change = detector.collectChanges();
      expect(change.currentValue).toBe('misko');
      expect(change.previousValue).toBe('');
      expect(change.nextChange.currentValue).toBe('hevery');
      expect(change.nextChange.previousValue).toBe('');
      expect(change.nextChange.nextChange).toBe(null);

      // force different instance
      user.first = 'mis';
      user.first += 'ko';

      change = detector.collectChanges();
      expect(change).toBe(null);

      user.last = 'Hevery';
      change = detector.collectChanges();
      expect(change.currentValue).toBe('Hevery');
      expect(change.previousValue).toBe('hevery');
      expect(change.nextChange).toBe(null);
    });


    it('should ignore NaN != NaN', function() {
      var user = new _User();
      user.age = NaN;
      detector.watch(user, 'age', null);
      detector.collectChanges();

      var changes = detector.collectChanges();
      expect(changes).toBe(null);

      user.age = 17; /* lets be generous! */
      changes = detector.collectChanges();
      expect(changes.currentValue).toBe(17);
      expect(changes.previousValue).not.toBe(changes.previousValue); /* sort of isNaN */
      expect(changes.nextChange).toBe(null);
    });


    it('should treat map field dereference as []', function() {
      var obj = {'name': 'misko'};
      detector.watch(obj, 'name', null);
      detector.collectChanges();

      obj['name'] = 'Misko';
      var changes = detector.collectChanges();
      expect(changes.currentValue).toBe('Misko');
      expect(changes.previousValue).toBe('misko');
    });
  });


  describe('insertions / removals', function() {
    it('should insert at the end of the list', function() {
      var obj = {};
      var a = detector.watch(obj, 'a', 'a');
      var b = detector.watch(obj, 'b', 'b');

      obj['a'] = obj['b'] = 1;
      var changes = detector.collectChanges();
      expect(changes.handler).toBe('a');
      expect(changes.nextChange.handler).toBe('b');
      expect(changes.nextChange.nextChange).toBe(null);

      obj['a'] = obj['b'] = 2;
      a.remove();
      changes = detector.collectChanges();
      expect(changes.handler).toBe('b');
      expect(changes.nextChange).toBe(null);

      obj['a'] = obj['b'] = 3;
      b.remove();

      changes = detector.collectChanges();
      expect(changes).toBe(null);
    });


    it('should remove all watches in group and group\'s children', function() {
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
      expect(detector.collectChanges).toEqualChanges(['0a', '0A', '1b']);
    });


    it('should add watches within its own group', function() {
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
      var a = detector.newGroup();
      var aChild = a.newGroup();
      var b = detector.newGroup();
      expect(detector.collectChanges).not.toThrow();
    });    
  });


  describe('list watching', function() {
    it('should detect changes in list', function() {
      var list = [];
      var record = detector.watch(list, null, 'handler');
      expect(detector.collectChanges()).toBe(null);

      list.push('a');
      expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
        collection: ['a[null -> 0]'],
        additions: ['a[null -> 0]']
      });

      list.push('b');
      expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
        collection: ['a', 'b[null -> 1]'],
        additions: ['b[null -> 1]']
      });

      list.push('c');
      list.push('d');
      expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
        collection: ['a', 'b', 'c[null -> 2]', 'd[null -> 3]'],
        additions: ['c[null -> 2]', 'd[null -> 3]']
      });

      var change;
      list.splice(2, 1);
      expect(list).toEqual(['a', 'b', 'd']);
      expect(change = detector.collectChanges().currentValue).toEqualCollectionRecord({
        collection: ['a', 'b', 'd[3 -> 2]'],
        additions: [],
        moves: ['d[3 -> 2]'],
        removals: ['c[2 -> null]']
      });

      var change2;
      list.length = 0;
      list.push('d', 'c', 'b', 'a');
      expect(change2 = detector.collectChanges().currentValue).toEqualCollectionRecord({
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
      var list = ['a', 'boo'];
      detector.watch(list, null, null);
      detector.collectChanges();

      list[1] = 'b' + 'oo';
      expect(detector.collectChanges()).toBe(null);
    });


    it('should ignore [NaN] != [NaN]', function() {
      var list = [NaN];
      detector.watch(list, null, null);
      detector.collectChanges();

      expect(detector.collectChanges()).toBe(null);
    });


    it('should remove and add same item', function() {
      var list = ['a', 'b', 'c'];
      var record = detector.watch(list, null, 'handler');
      detector.collectChanges();

      list.splice(1, 1);
      expect(list).toEqual(['a', 'c']);
      expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
        collection: ['a', 'c[2 -> 1]'],
        moves: ['c[2 -> 1]'],
        removals: ['b[1 -> null]']
      });

      list.splice(1, 0, 'b');
      expect(list).toEqual(['a', 'b', 'c']);
      expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
        collection: ['a', 'b[null -> 1]', 'c[1 -> 2]'],
        additions: ['b[null -> 1]'],
        moves: ['c[1 -> 2]']
      });
    });


    it('should support duplicates', function() {
      var list = ['a', 'a', 'a', 'b', 'b'];
      var record = detector.watch(list, null, 'handler');
      detector.collectChanges();

      list.splice(0, 1);
      expect(list).toEqual(['a', 'a', 'b', 'b']);
      expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
        collection: ['a', 'a', 'b[3 -> 2]', 'b[4 -> 3]'],
        moves: ['b[3 -> 2]', 'b[4 -> 3]'],
        removals: ['a[2 -> null]']
      });
    });


    it('should support insertions/moves', function() {
      var list = ['a', 'a', 'b', 'b'];
      var record = detector.watch(list, null, 'handler');
      detector.collectChanges();
      list.unshift('b');
      expect(list).toEqual(['b', 'a', 'a', 'b', 'b']);
      expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
        collection: ['b[2 -> 0]', 'a[0 -> 1]', 'b[null -> 4]'],
        additions: ['b[null -> 4]'],
        moves: ['b[2 -> 0]', 'a[0 -> 1]', 'a[1 -> 2]']
      });
    });


    /* TODO: 'should support UnmodifiableListView' test has been removed, but it may be
       desirable to add a variation of this using Object.freeze(). */


    /* TODO: come up with a more meaningful description for this spec. This is really unclear.
       https://github.com/angular/angular.dart/blob/8e1e69d/test/change_detection/dirty_checking_change_detector_spec.dart#L336 */
    it('should bug', function() {
      var list = [1, 2, 3, 4];
      var record = detector.watch(list, null, 'handler');
      expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
        collection: ['1[null -> 0]', '2[null -> 1]', '3[null -> 2]', '4[null -> 4]'],
        additions: ['1[null -> 0]', '2[null -> 1]', '3[null -> 2]', '4[null -> 4]']
      });
      detector.collectChanges();

      list.splice(0, 1);
      expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
        collection: ['2[1 -> 0]', '3[2 -> 1]', '4[3 -> 2]'],
        moves: ['2[1 -> 0]', '3[2 -> 1]', '4[3 -> 2]'],
        removals: ['1[0 -> null]']
      });

      list.unshift(1);
      expect(detector.collectChanges().currentValue).toEqualCollectionRecord({
        collection: ['1[null -> 0]', '2[0 -> 1]', '3[1 -> 2]', '4[2 -> 3]'],
        additions: ['1[null -> 0]'],
        moves: ['2[0 -> 1]', '3[1 -> 2]', '4[2 -> 3]']
      });
    });
  });


  describe('map watching', function() {
    it('should do basic map watching', function() {
      var map = {};
      var record = detector.watch(map, null, 'handler');
      expect(detector.collectChanges()).toBe(null);

      map['a'] = 'A';
      expect(detector.collectChanges().currentValue).toEqualMapRecord({
        map: ['a[null -> A]'],
        additions: ['a[null -> A]']
      });

      map['b'] = 'B';
      expect(detector.collectChanges().currentValue).toEqualMapRecord({
        map: ['a', 'b[null -> B]'],
        additions: ['b[null -> B]']
      });

      map['b'] = 'BB';
      map['d'] = 'D';
      expect(detector.collectChanges().currentValue).toEqualMapRecord({
        map: ['a', 'b[B -> BB]', 'd[null -> D]'],
        additions: ['d[null -> D]'],
        changes: ['b[B -> BB]']
      });

      delete map['b'];
      expect(detector.collectChanges().currentValue).toEqualMapRecord({
        map: ['a', 'd'],
        removals: ['b[BB -> null]']
      });

      delete map['a'];
      delete map['d'];
      expect(detector.collectChanges().currentValue).toEqualMapRecord({
        map: ['a', 'd'],
        removals: ['a[A -> null]', 'd[D -> null]']
      });
    });


    it('should test string keys by value rather than by reference', function() {
      var map = {'foo': 0};
      detector.watch(map, null, null);
      detector.collectChanges();

      map['f' + 'oo'] = 0;
      expect(detector.collectChanges()).toBe(null);        
    });


    /* TODO: name this consistently with other "ignore NaN != NaN" tests */
    it('should not see a NaN value as a change', function() {
      var map = {'foo': NaN};
      detector.watch(map, null, null);
      detector.collectChanges();

      expect(detector.collectChanges()).toBe(null);
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
