import {
  AST,
  FieldReadAST,
  ContextReferenceAST
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
  });
});
