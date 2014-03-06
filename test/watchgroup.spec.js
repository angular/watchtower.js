import {
  AST,
  FieldReadAST,
  ContextReferenceAST,
  PureFunctionAST,
  ConstantAST
} from '/base/src/ast.js';

import {
  GetterCache,
  DirtyCheckingChangeDetector
} from '/base/src/dirty_checking.js';

import {
  WatchGroup,
  RootWatchGroup
} from '/base/src/watch_group.js';

import {
  Logger
} from '/base/test/helpers.js';

describe('WatchGroup', function() {
  var context, watchGrp, detector, logger = new Logger;

  function parse(expression) {
    var currentAST = new ContextReferenceAST();
    expression.split('.').forEach(function(name) {
      currentAST = new FieldReadAST(currentAST, name);
    });
    return currentAST;
  }

  beforeEach(function() {
    context = {};
    detector = new DirtyCheckingChangeDetector(new GetterCache({}));
    watchGrp = new RootWatchGroup(detector, context);
    logger.clear();
  });

  describe('watch lifecycle', function() {
    it('should prevent reaction fn on removed', function() {
      context.a = 'hello';
      var watch;
      watchGrp.watch(parse('a'), function(v, p) {
        logger.log('removed');
        watch.remove();
      });
      watch = watchGrp.watch(parse('a'), function(v, p) {
        logger.log(v);
      });
      watchGrp.detectChanges();
      expect(`${logger}`).toEqual('removed');
    });
  });


  describe('property chaining', function() {
    it ('should read property', function() {
      context.a = 'hello';

      // should fire on initial adding
      expect(watchGrp.fieldCost).toBe(0);
      var watch = watchGrp.watch(parse('a'), function(v, p) {
        logger.log(v);
      });
      expect(watch.expression).toBe('a');
      expect(watchGrp.fieldCost).toBe(1);
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');

      // make sure no new changes are logged on extra detectChanges
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');

      // Should detect value change
      context.a = 'bye';
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello;bye');

      // Should cleanup after itself
      watch.remove();
      expect(watchGrp.fieldCost).toBe(0);
      context.a = 'cant see me';
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello;bye');
    });


    it('should read property chain', function() {
      context.a = {
        b: 'hello'
      };

      // should fire on initial adding
      expect(watchGrp.fieldCost).toBe(0);
      expect(detector.count).toBe(0);
      var watch = watchGrp.watch(parse('a.b'), function (v, p) {
        logger.log(v);
      });
      expect(watch.expression).toBe('a.b');
      expect(watchGrp.fieldCost).toBe(2);
      expect(detector.count).toBe(2);
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');

      // make sure no new changes are logged on extra detectChanges
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');

      // make sure no changes are logged when intermediary object changes
      context.a = {'b': 'hello'};
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');

      // should detect when intermediary object changes and watched field's value changes
      context.a = {'b': 'hello2'};
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello;hello2');

      // should detect when watched fields value changes
      context.a.b = 'bye';
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello;hello2;bye');

      // should cleanup after itself
      watch.remove();
      expect(watchGrp.fieldCost).toBe(0);
      context.a.b = 'cant see me';
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello;hello2;bye');
    });


    it('should reuse handlers', function() {
      var user1 = {'first': 'misko', 'last': 'hevery'};
      var user2 = {'first': 'misko', 'last': 'Hevery'};

      context.user = user1;

      // should fire on initial adding
      expect(watchGrp.fieldCost).toBe(0);
      var watch = watchGrp.watch(parse('user'), function(v, p) {
        logger.log(v);
      });

      var watchFirst = watchGrp.watch(parse('user.first'), function(v, p) {
        logger.log(v);
      });

      var watchLast = watchGrp.watch(parse('user.last'), function(v, p) {
        logger.log(v);
      });

      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual([user1, 'misko', 'hevery']);
      logger.clear();

      context.user = user2;
      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual([user2, 'Hevery']);

      watch.remove();
      expect(watchGrp.fieldCost).toBe(3);

      watchFirst.remove();
      expect(watchGrp.fieldCost).toBe(2);

      watchLast.remove();
      expect(watchGrp.fieldCost).toBe(0);

      expect(function() {
        watch.remove();
      }).toThrow('Already deleted!');
    });


    // TODO: `should eval pure FunctionApply` is this applicable to ES6?


    it('should eval pure function', function() {
      context.a = {'val': 1};
      context.b = {'val': 2};

      var watch = watchGrp.watch(new PureFunctionAST('add', function(a, b) {
        logger.log('+');
        return a + b;
      }, [parse('a.val'), parse('b.val')]), function(v, p) {
        logger.log(v);
      });

      // a; a.val; b; b.val;
      expect(watchGrp.fieldCost).toBe(4);
      // add
      expect(watchGrp.evalCost).toBe(1);

      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual(['+', 3]);

      // extra checks should not trigger functions
      watchGrp.detectChanges();
      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual(['+', 3]);

      // multiple arg changes should only trigger function once.
      context.a.val = 3;
      context.b.val = 4;

      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual(['+', 3, '+', 7]);

      watch.remove();
      expect(watchGrp.fieldCost).toBe(0);
      expect(watchGrp.evalCost).toBe(0);

      context.a.val = 0;
      context.b.val = 0;

      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual(['+', 3, '+', 7]);
    });


    // These various specs from the Dart repository depend on a reflection API which may not be
    // available in ES6. Investigation is needed to determine if these can truly be ported to
    // ES6.
    // TODO: `should eval closure` is this applicable to ES6?
    // TODO: `should eval method` is this applicable to ES6?
    // TODO: `should eval method chain` is this applicable to ES6?
    // TODO: `should not return null when evaling method first time` is this applicable to ES6?
    // TODO: `should wrap iterable in ObservableList` is this applicable to ES6?
    // TODO: `should watch literal arrays made of expressions` --- depends on FunctionApply

    it('should read constant', function() {
      // should fire on initial adding
      expect(watchGrp.fieldCost).toBe(0);
      var watch = watchGrp.watch(new ConstantAST(123), function(v, p) {
        logger.log(v);
      });
      expect(watch.expression).toBe('123');
      expect(watchGrp.fieldCost).toBe(0);
      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual([123]);

      // make sure no new changes are logged on extra detect changes
      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual([123]);
    });


    it('should watch pure function whose result goes to pure function', function() {
      context.a = 1;
      var ast = new PureFunctionAST('-', function(v) {
        return -v;
      }, [new PureFunctionAST('++', function(v) {
        return v + 1;
      }, [parse('a')])]);
      var watch = watchGrp.watch(ast, function(v, p) {
        logger.log(v);
      });

      expect(watchGrp.detectChanges()).not.toBe(null);
      expect(logger.toArray()).toEqual([-2]);
      logger.clear();

      context.a = 2;
      expect(watchGrp.detectChanges()).not.toBe(null);
      expect(logger.toArray()).toEqual([-3]);
    });


    describe('child group', function() {
      it('should remove all field watches in group and group\'s children', function() {
        watchGrp.watch(parse('a'), function(v, p) {
          logger.log('0a');
        });
        var proxy1 = Object.create(context);
        var proxy2 = Object.create(context);
        var proxy3 = Object.create(context);
        var child1a = watchGrp.newGroup(proxy1);
        var child1b = watchGrp.newGroup(proxy2);
        var child2 = child1a.newGroup(proxy3);

        child1a.watch(parse('a'), function(v, p) {
          logger.log('1a');
        });
        child1b.watch(parse('a'), function(v, p) {
          logger.log('1b');
        });
        watchGrp.watch(parse('a'), function(v, p) {
          logger.log('0A');
        });
        child1a.watch(parse('a'), function(v, p) {
          logger.log('1A');
        });
        child2.watch(parse('a'), function(v, p) {
          logger.log('2A');
        });

        // flush initial reaction functions
        expect(watchGrp.detectChanges()).toBe(6);
        expect(logger.toArray()).toEqual(['0a', '1a', '1b', '0A', '1A', '2A']);
        expect(watchGrp.fieldCost).toBe(1);
        expect(watchGrp.totalFieldCost).toBe(4);
        logger.clear();

        context.a = 1;
        expect(watchGrp.detectChanges()).toBe(6);
        expect(logger.toArray()).toEqual(['0a', '0A', '1a', '1A', '2A', '1b']);
        logger.clear();

        context.a = 2;
        child1a.remove(); // should also remove child2
        expect(watchGrp.detectChanges()).toBe(3);
        expect(logger.toArray()).toEqual(['0a', '0A', '1b']);
        expect(watchGrp.fieldCost).toBe(1);
        expect(watchGrp.totalFieldCost).toBe(2);
      });


      // TODO: `should remove all method watches in group and group\'s children` --- Is this
      // applicable to ES6?


      // TODO: `should add watches within its own group` --- This test uses MethodAST, which is not
      // implemented yet.


      it('should not call reaction function on removed group', function() {
        context.name = 'misko';
        var child = watchGrp.newGroup(context);
        watchGrp.watch(parse('name'), function(v, p) {
          logger.log(`root ${v}`);
          if (v === 'destroy') {
            child.remove();
          }
        });
        child.watch(parse('name'), function(v, p) {
          logger.log(`child ${v}`);
        });
        watchGrp.detectChanges();
        expect(logger.toArray()).toEqual(['root misko', 'child misko']);
        logger.clear();

        context.name = 'destroy';
        watchGrp.detectChanges();
        expect(logger.toArray()).toEqual(['root destroy']);
      });


      it('should watch children', function() {
        var childContext = Object.create(context);
        context.a = 'OK';
        context.b = 'BAD';
        childContext.b = 'OK';
        watchGrp.watch(parse('a'), function(v, p) {
          logger.log(v);
        });
        watchGrp.newGroup(childContext).watch(parse('b'), function(v, p) {
          logger.log(v);
        });

        watchGrp.detectChanges();
        expect(logger.toArray()).toEqual(['OK', 'OK']);
        logger.clear();

        context.a = 'A';
        childContext.b = 'B';

        watchGrp.detectChanges();
        expect(logger.toArray()).toEqual(['A', 'B']);
        logger.clear();
      });
    });
  });
});
