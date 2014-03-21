import {
  AST,
  FieldReadAST,
  ContextReferenceAST,
  PureFunctionAST,
  MethodAST,
  ConstantAST
} from '../src/ast';

import {
  GetterCache,
  DirtyCheckingChangeDetector
} from '../src/dirty_checking';

import {
  WatchGroup,
  RootWatchGroup
} from '../src/watch_group';

import {
  Logger
} from '../test/helpers';

describe('WatchGroup', function() {
  var context, watchGrp, detector, logger = new Logger;

  function parse(expression) {
    var currentAST = new ContextReferenceAST();
    expression.split('.').forEach(function(name) {
      currentAST = new FieldReadAST(currentAST, name);
    });
    return currentAST;
  }

  function setup(ctx={}) {
    context = ctx;
    detector = new DirtyCheckingChangeDetector(new GetterCache({}));
    watchGrp = new RootWatchGroup(detector, context);
  }

  // reaction function to log the current value
  function logCurrentValue(v, p) {
    logger.log(v);
  }

  // helper to generate a reaction function which logs an arbitrary value
  function logValue(v) {
    return function() {
      logger.log(v);
    }
  }

  afterEach(function() {
    logger.clear();
  });


  describe('watch lifecycle', function() {
    it('should prevent reaction fn on removed', function() {
      setup({'a': 'hello'});
      var watch;
      watchGrp.watch(parse('a'), function(v, p) {
        logger.log('removed');
        watch.remove();
      });
      watch = watchGrp.watch(parse('a'), logCurrentValue);
      watchGrp.detectChanges();
      expect(`${logger}`).toEqual('removed');
    });
  });


  describe('property chaining', function() {
    it ('should read watched property', function() {
      setup({'a': 'hello'});

      // should fire on initial adding
      expect(watchGrp.fieldCost).toBe(0);
      var watch = watchGrp.watch(parse('a'), logCurrentValue);
      expect(watch.expression).toBe('a');
      expect(watchGrp.fieldCost).toBe(1);
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');
    });


    it('should not log changes on extra detectChanges', function() {
      setup({'a': 'hello'});
      var watch = watchGrp.watch(parse('a'), logCurrentValue);
      watchGrp.detectChanges();
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');
    })


    it('should detect value change', function() {
      setup({'a': 'hello'});
      watchGrp.watch(parse('a'), logCurrentValue);
      watchGrp.detectChanges();
      context.a = 'bye';
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello;bye');
    });


    it('should not react when previously watched field changes', function() {
      setup({'a': 'hello'});
      var watch = watchGrp.watch(parse('a'), logCurrentValue);
      watchGrp.detectChanges();
      watch.remove();

      expect(watchGrp.fieldCost).toBe(0);
      context.a = 'cant see me';
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');
    });


    it('should not react when unwatched field changes', function() {
      setup({'a': 'hello'});
      watchGrp.watch(parse('a'), logCurrentValue);
      watchGrp.detectChanges();

      context.b = "cant see me";
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');
    });


    it('should not increase field cost when context contains nested objects', function() {
      setup({'a': {'b': 'hello'}});

      // should fire on initial adding
      expect(watchGrp.fieldCost).toBe(0);
      expect(detector.count).toBe(0);
    });


    it('should watch all fields in property chain when watched', function() {
      setup({'a': {'b': 'hello'}});
      var watch = watchGrp.watch(parse('a.b'), logCurrentValue);

      expect(watch.expression).toBe('a.b');
      expect(watchGrp.fieldCost).toBe(2);
      expect(detector.count).toBe(2);
    });


    it('should detect changes to nested property value', function() {
      setup({'a': {'b': 'hello'}});
      watchGrp.watch(parse('a.b'), logCurrentValue);

      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');
    });


    it('should not react on extra detectChanges for nested object properties', function() {
      setup({'a': {'b': 'hello'}});
      watchGrp.watch(parse('a.b'), logCurrentValue);

      watchGrp.detectChanges();
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');
    });


    it('should not react when intermediary object is replaced with "equal" object', function() {
      setup({'a': {'b': 'hello'}});
      watchGrp.watch(parse('a.b'), logCurrentValue);

      watchGrp.detectChanges();
      context.a = {'b': 'hello'};
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');
    });


    it('should react when intermediary object changes and watched field value changes', function() {
      setup({'a': {'b': 'hello'}});
      watchGrp.watch(parse('a.b'), logCurrentValue);
      watchGrp.detectChanges();

      context.a = {'b': 'hello2'};
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello;hello2');
    });


    it('should react when nested watched field value changes', function() {
      setup({'a': {'b': 'hello'}});
      watchGrp.watch(parse('a.b'), logCurrentValue);
      watchGrp.detectChanges();

      // should detect when watched fields value changes
      context.a.b = 'bye';
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello;bye');
    });


    it('should remove associated all associated field watches when watch removed', function() {
      setup({'a': {'b': 'hello'}});
      var watch = watchGrp.watch(parse('a.b'), logCurrentValue);

      // should cleanup after itself
      watch.remove();
      expect(watchGrp.fieldCost).toBe(0);
    });


    it('should not react when previously watched nested field changes', function() {
      setup({'a': {'b': 'hello'}});
      var watch = watchGrp.watch(parse('a.b'), logCurrentValue);
      watchGrp.detectChanges();

      watch.remove();
      context.a.b = 'cant see me';
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');
    });


    it('should not react when unwatched nested field changes', function() {
      setup({'a': {'b': 'hello'}});
      watchGrp.watch(parse('a.b'), logCurrentValue);
      watchGrp.detectChanges();

      context.a.c = "cant see me";
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('hello');
    });


    it('should reuse handlers', function() {
      setup();
      var user1 = {'first': 'misko', 'last': 'hevery'};
      var user2 = {'first': 'misko', 'last': 'Hevery'};

      context.user = user1;

      var watch = watchGrp.watch(parse('user'), logCurrentValue);
      var watchFirst = watchGrp.watch(parse('user.first'), logCurrentValue);
      var watchLast = watchGrp.watch(parse('user.last'), logCurrentValue);

      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual([user1, 'misko', 'hevery']);
      logger.clear();

      context.user = user2;
      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual([user2, 'Hevery']);
    });


    it('should cleanup reused handlers', function() {
      setup({'user': {'first': 'misko', 'last': 'hevery'}});
      var watch = watchGrp.watch(parse('user'), logCurrentValue);
      var watchFirst = watchGrp.watch(parse('user.first'), logCurrentValue);
      var watchLast = watchGrp.watch(parse('user.last'), logCurrentValue);

      watch.remove();
      expect(watchGrp.fieldCost).toBe(3);

      watchFirst.remove();
      expect(watchGrp.fieldCost).toBe(2);

      watchLast.remove();
      expect(watchGrp.fieldCost).toBe(0);
    });


    it('should throw when watch is removed twice', function() {
      setup();
      var watch = watchGrp.watch(parse('a'), logCurrentValue);

      watch.remove();
      expect(function() {
        watch.remove();
      }).toThrow('Already deleted!');
    });


    // TODO: `should eval pure FunctionApply` is this applicable to ES6?


    it('should increase eval cost for pure function watches', function() {
      setup({'a': {'val': 1}, 'b': {'val': 2}});

      var watch = watchGrp.watch(new PureFunctionAST('add', function(a, b) {
        return a + b;
      }, [parse('a.val'), parse('b.val')]), logCurrentValue);

      // a; a.val; b; b.val;
      expect(watchGrp.fieldCost).toBe(4);
      // add
      expect(watchGrp.evalCost).toBe(1);
    });


    it('should react when pure function return value changes', function() {
      setup({'a': {'val': 1}, 'b': {'val': 2}});

      var watch = watchGrp.watch(new PureFunctionAST('add', function(a, b) {
        logger.log('+');
        return a + b;
      }, [parse('a.val'), parse('b.val')]), logCurrentValue);

      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual(['+', 3]);
    });


    it('should not react when pure function returns old value', function() {
      setup({'a': {'val': 1}, 'b': {'val': 2}});

      var watch = watchGrp.watch(new PureFunctionAST('add', function(a, b) {
        logger.log('+');
        return a + b;
      }, [parse('a.val'), parse('b.val')]), logCurrentValue);

      watchGrp.detectChanges();
      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual(['+', 3]);
    });


    it('should react when pure function return value changes', function() {
      setup({'a': {'val': 1}, 'b': {'val': 2}});

      var watch = watchGrp.watch(new PureFunctionAST('add', function(a, b) {
        logger.log('+');
        return a + b;
      }, [parse('a.val'), parse('b.val')]), logCurrentValue);

      watchGrp.detectChanges();

      // multiple arg changes should only trigger function once.
      context.a.val = 3;
      context.b.val = 4;

      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual(['+', 3, '+', 7]);
    });


    it('should cleanup eval cost when watch removed', function() {
      setup({'a': {'val': 1}, 'b': {'val': 2}});

      var watch = watchGrp.watch(new PureFunctionAST('add', function(a, b) {
        logger.log('+');
        return a + b;
      }, [parse('a.val'), parse('b.val')]), logCurrentValue);

      watch.remove();
      expect(watchGrp.fieldCost).toBe(0);
      expect(watchGrp.evalCost).toBe(0);
    });


    it('should not react when unwatched eval arguments change', function() {
      setup({'a': {'val': 1}, 'b': {'val': 2}});

      var watch = watchGrp.watch(new PureFunctionAST('add', function(a, b) {
        logger.log('+');
        return a + b;
      }, [parse('a.val'), parse('b.val')]), logCurrentValue);

      watch.remove();
      context.a.val = 0;
      context.b.val = 0;

      watchGrp.detectChanges();
      expect(logger.toArray()).toEqual([]);
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


    function setupRegisterDuringReaction() {
      var fn = function(arg) {
        logger.log(`fn(${arg})`);
        return arg;
      }
      setup({'obj': {'fn': fn}, 'arg1': 'OUT', 'arg2': 'IN'});

      var ast = new MethodAST(parse('obj'), 'fn', [parse('arg1')]);
      var watch = watchGrp.watch(ast, function(v, p) {
        var ast = new MethodAST(parse('obj'), 'fn', [parse('arg2')]);
        watchGrp.watch(ast, function(v, p) {
          logger.log(`reaction: ${v}`);
        });
      });
    }


    it('should call methods of string primitives', function() {
      setup({'text': 'abc'});
      var ast = new MethodAST(parse('text'), 'toUpperCase', []);
      watchGrp.watch(ast, logCurrentValue);
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('ABC');
    });


    it('should call methods of number primitives', function() {
      setup({num: 1.46483});
      var ast = new MethodAST(parse('num'), 'toFixed', []);
      watchGrp.watch(ast, logCurrentValue);
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('1');
    });


    it('should not eval a function if registered during reaction', function() {
      setup({'text': 'abc'});
      var ast = new MethodAST(parse('text'), 'toLowerCase', []);
      var watch = watchGrp.watch(ast, function(v, p) {
        var ast = new MethodAST(parse('text'), 'toUpperCase', []);
        watchGrp.watch(ast, logCurrentValue);
      });

      watchGrp.detectChanges();
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('ABC');
    });

    it('should not call functions or reacitons when registering method watches', function() {
      setupRegisterDuringReaction();
      expect(`${logger}`).toBe('');
    });

    it('should eval function eagerly when registered during reaction', function() {
      setupRegisterDuringReaction();
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('fn(OUT);fn(IN);reaction: IN');
    });


    it('should not call reaction functions when result of watch registered during reaction does not change', function() {
      setupRegisterDuringReaction();
      watchGrp.detectChanges();
      logger.clear();
      watchGrp.detectChanges();
      expect(`${logger}`).toBe('fn(OUT);fn(IN)');
    });


    describe('child group', function() {
      var proxy1, proxy2, proxy3, child1a, child1b, child2;

      function setupChildGroups(detectAndClear) {
        setup();
        watchGrp.watch(parse('a'), logValue('0a'));
        proxy1 = Object.create(context);
        proxy2 = Object.create(context);
        proxy3 = Object.create(context);
        child1a = watchGrp.newGroup(proxy1);
        child1b = watchGrp.newGroup(proxy2);
        child2 = child1a.newGroup(proxy3);

        child1a.watch(parse('a'), logValue('1a'));
        child1b.watch(parse('a'), logValue('1b'));
        watchGrp.watch(parse('a'), logValue('0A'));
        child1a.watch(parse('a'), logValue('1A'));
        child2.watch(parse('a'), logValue('2A'));

        if (detectAndClear === true) {
          watchGrp.detectChanges();
          logger.clear();
        }
      }

      afterEach(function() {
        proxy1 = proxy2 = proxy3 = child1a = child1b = child2 = null;
      });


      it('should set field cost to expected value', function() {
        setupChildGroups();
        expect(watchGrp.fieldCost).toBe(1);
        expect(watchGrp.totalFieldCost).toBe(4);
      });


      it('should count change for each group watching property', function() {
        setupChildGroups();
        expect(watchGrp.detectChanges()).toBe(6);
      });


      it('should call reaction functions in order of registration', function() {
        setupChildGroups();
        watchGrp.detectChanges();
        expect(logger.toArray()).toEqual(['0a', '1a', '1b', '0A', '1A', '2A']);
      });


      it('should count change for each group watching property on value changed', function() {
        setupChildGroups(true);
        context.a = 1;
        expect(watchGrp.detectChanges()).toBe(6);
      });


      it('should call reaction functions in order on value changed', function() {
        setupChildGroups(true);
        context.a = 1;
        watchGrp.detectChanges();
        // TODO: what actual order is this?
        expect(logger.toArray()).toEqual(['0a', '0A', '1a', '1A', '2A', '1b']);
      });


      it('should not call reaction functions for removed child groups', function() {
        setupChildGroups(true);

        context.a = 2;
        child1a.remove(); // should also remove child2
        expect(watchGrp.detectChanges()).toBe(3);
      });


      it('should call remaining reaction functions in order of registration on value changed', function() {
        setupChildGroups(true);

        context.a = 2;
        child1a.remove(); // should also remove child2
        watchGrp.detectChanges();
        expect(logger.toArray()).toEqual(['0a', '0A', '1b']);
      });


      it('should clean up field cost for child groups when removed along with parents', function() {
        setupChildGroups(true);
        child1a.remove(); // should also remove child2
        expect(watchGrp.fieldCost).toBe(1);
        expect(watchGrp.totalFieldCost).toBe(2);
      });


      // TODO: `should remove all method watches in group and group\'s children` --- Is this
      // applicable to ES6?


      // TODO: `should add watches within its own group` --- This test uses MethodAST, which is not
      // implemented yet.


      it('should not call reaction function on removed group', function() {
        setup({ 'name': 'misko' });

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
        setup();
        var childContext = Object.create(context);
        context.a = 'OK';
        context.b = 'BAD';
        childContext.b = 'OK';
        watchGrp.watch(parse('a'), function(v, p) {
          logger.log(v);
        });
        watchGrp.newGroup(childContext).watch(parse('b'), logCurrentValue);

        watchGrp.detectChanges();
        expect(logger.toArray()).toEqual(['OK', 'OK']);
        logger.clear();

        context.a = 'A';
        childContext.b = 'B';

        watchGrp.detectChanges();
        expect(logger.toArray()).toEqual(['A', 'B']);
      });
    });
  });
});
