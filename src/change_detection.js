/**
 * Stub implementations of the change detection API.
 * All of these throws can likely be removed at a later date, depending on the behaviour of the
 * Traceur compiler, and the changing ES6 spec.
 *
 * At the moment, Trait types are not being used as they are not in the current Harmony draft.
 * Unfortunately, this makes the composition of multiple classes, which is found in Angular.dart's
 * implementation, rather difficult. This will be improved upon in the future, however will quite
 * likely involve breaking changes.
 *
 * TODO:
 * Most of the getter/setter routines are unnecessary and likely cause performance hits. I'll
 * need to measure, but I don't think there is much benefit for these. For simplicity, some have
 * been commented out for the time being.
 */
export class ChangeDetectorGroup {
  watch(context, field, handler) { throw "watch() not implemented"; }

  remove() { throw "remove() not implemented"; }

  newGroup() { throw "newGroup() not implemented"; }
}

export class ChangeDetector extends ChangeDetectorGroup {
  collectChanges(exceptionHandler, stopWatch) { throw "collectChanges() not implemented"; }
}

class Record {
  get object() { throw "get object() not implemented"; }

  get field() { throw "get field() not implemented"; }

  get handler() { throw "get handler() not implemented"; }

  //get currentValue() { throw "get currentValue() not implemented"; }

  //get previousValue() { throw "get previousValue() not implemented"; }
}

export class ChangeRecord extends Record {
  //get nextChange() { throw "get nextChange() not implemented"; }
}

// I'm not sure that there is any area in the code in which a WatchRecord is used
// where a ChangeRecord isn't --- But we don't have strong typing in JS, so we
// can probably make this work regardless
export class WatchRecord extends ChangeRecord {
  set object(value) { throw "set object() not implemented"; }

  check() { throw "check() not implemented"; }

  remove() { throw "remove() not implemented"; }
}

/**
 * TODO: refactor this, the crazy amount of types is not super helpful.
 */
export class MapChangeRecord {
  get map() { throw "get map() not implemented"; }

  get mapHead() { throw "get mapHead() not implemented"; }

  get changesHead() { throw "get changesHead() not implemented"; }

  get additionsHead() { throw "get additionsHead() not implemented"; }

  get removalsHead() { throw "get removalsHead() not implemented"; }

  forEachChange(fn) { throw "forEachChange() not implemented"; }

  forEachAddition(fn) { throw "forEachAddition() not implemented"; }

  forEachRemoval(fn) { throw "forEachRemoval() not implemented"; }
}

export class MapKeyValue {
  get key() { throw "get key() not implemented"; }
  get previousValue() { throw "get previousValue() not implemented"; }
  get currentValue() { throw "get currentValue() not implemented"; }
  get nextKeyValue() { throw "get nextKeyValue() not implemented"; }
  get nextAddedKeyValue() { throw "get nextAddedKeyValue() not implemented"; }
  get nextRemovedKeyValue() { throw "get nextRemovedKeyValue() not implemented"; }
  get nextChangedKeyValue() { throw "get nextChangedKeyValue() not implemented"; }
}

export class CollectionChangeRecord {
  get iterable() { throw "get iterable() not implemented"; }

  get collectionHead() { throw "get collectionHead() not implemented"; }

  get additionsHead() { throw "get additionsHead() not implemented"; }

  get movesHead() { throw "get movesHead() not implemented"; }

  get removalsHead() { throw "get removalsHead() not implemented"; }

  forEachAddition(fn) { throw "forEachAddition() not implemented"; }

  forEachMove(fn) { throw "forEachMove() not implemented"; }

  forEachRemoval(fn) { throw "forEachRemoval() not implemented"; }
}

export class CollectionChangeItem {
  //get previousIndex() { throw "get previousIndex() not implemented"; }

  //get currentIndex() { throw "get currentIndex() not implemented"; }

  //get item() { throw "get item() not implemented"; }

  get nextCollectionItem() { throw "get nextCollectionItem() not implemented"; }

  get nextAddedItem() { throw "get nextAddedItem() not implemented"; }

  get nextRemovedItem() { throw "get nextRemovedItem() not implemented"; }
}
