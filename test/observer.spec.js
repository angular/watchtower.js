import {
  GetterCache,
  DirtyCheckingChangeDetector,
  DirtyCheckingChangeDetectorGroup
} from '../src/dirty_checking';

describe('observer', function() {
  var getterCache, detector, setup, setupUser, selector;

  beforeEach(function() {
    setup = function(observer) {
      getterCache = new GetterCache({
        'name': function(o) { return o.name; }
      });

      selector = new ExplicitObserverSelector(observer);
      detector = new DirtyCheckingChangeDetector(getterCache, selector);
    }
  });

  describe('selector', function() {
    it('should receive object instance for use in selection process', function() {
      var observer = new ExplicitObserver(),
          user = new _User('Rob');

      setup(observer);
      detector.watch(user, 'name', null);

      expect(selector.lastObj).toBe(user);
    });

    it('should recieve field name for use in selection process', function() {
      var observer = new ExplicitObserver(),
          user = new _User('Rob');

      setup(observer);
      detector.watch(user, 'name', null);

      expect(selector.lastField).toBe('name');
    });

    it('should return an observer if obj/field observation is possible', function() {
      var observer = new ExplicitObserver(),
          user = new _User('Rob');

      setup(observer);
      detector.watch(user, 'name', null);

      expect(selector.observersReturned).toBe(1);
    });

    it('should return null if obj/field observation is not possible', function() {
      var user = new _User('Rob');

      setup(null);
      detector.watch(user, 'name', null);

      expect(selector.observersReturned).toBe(1);
    });
  });

  describe('instances', function() {
    it('are opened by the dirty checking mechanism', function() {
      var observer = new ExplicitObserver(),
          user = new _User('Rob');

      setup(observer);
      detector.watch(user, 'name', null);

      expect(observer.openCalls).toBe(1);
    });

    it('are provided with a callback by the dirty checking mechanism', function() {
      var observer = new ExplicitObserver(),
          user = new _User('Rob');

      setup(observer);
      detector.watch(user, 'name', null);

      expect(observer.callback).not.toBe(null);
    });

    it('immediately notify the dirty checker when opened', function() {
      var observer = new ExplicitObserver(),
          user = new _User('Rob');

      setup(observer);
      detector.watch(user, 'name', null);

      var changes = detector.collectChanges();
      expect(changes.iterate()).toBe(true);
    });

    it('notify the dirty checker when changes occur in the observed object', function() {
      var observer = new ExplicitObserver(),
          user = new _User('Rob');

      setup(observer);
      detector.watch(user, 'name', null);

      var changes = detector.collectChanges();
      expect(changes.iterate()).toBe(true);

      changes = detector.collectChanges();
      expect(changes.iterate()).toBe(false);

      observer.notify('Eisenberg');

      changes = detector.collectChanges();
      expect(changes.iterate()).toBe(true);
    });

    //TODO: internally, it appears that remove calls are not being made...
    xit('closes observers when dirty checking records are removed', function() {
      var observer = new ExplicitObserver(),
          user = new _User('Rob'),
          group;

      setup(observer);
      group = detector.newGroup();
      group.watch(user, 'name', null);

      expect(observer.closeCalls).toBe(0);
      group.remove();
      expect(observer.closeCalls).toBe(1);
    });
  });
});

class _User {
  constructor(name) {
    this.name = name;
  }
}

class ExplicitObserverSelector{
  constructor(observer){
    this.observer = observer;
    this.observersReturned = 0;
  }

  getObserver(obj, field){
    var observer;
    
    this.lastObj = obj;
    this.lastField = field;

    if(this.observer){
      this.observer.obj = obj;
      this.observer.field = field;
    }

    this.observersReturned++;
    return this.observer;
  }
}

class ExplicitObserver{
  constructor(){
    this.openCalls = 0;
    this.closeCalls = 0;
  }

  notify(value){
    this.obj[this.field] = value;
    this.callback(value);
  }

  open(callback){
    this.openCalls++;
    this.callback = callback;
    return this.obj[this.field];
  }

  close(){
    this.closeCalls++;
    this.callback = null;
  }
}