export class ChangeDetectorGroup {
  watch(context, field, handler) {
    throw "watch() not implemented";
  }
  remove() {
    throw "remove() not implemented";
  }
  newGroup() {
    throw "newGroup() not implemented";
  }
}
export class ChangeDetector extends ChangeDetectorGroup {
  collectChanges(exceptionHandler, stopWatch) {
    throw "collectChanges() not implemented";
  }
}
class Record {
  get object() {
    throw "get object() not implemented";
  }
  get field() {
    throw "get field() not implemented";
  }
}
export class ChangeRecord extends Record {}
export class WatchRecord extends ChangeRecord {
  get object() {
    throw "get object() not implemented";
  }
  set object(value) {
    throw "set object() not implemented";
  }
  check() {
    throw "check() not implemented";
  }
  remove() {
    throw "remove() not implemented";
  }
}
export class MapChangeRecord {
  get map() {
    throw "get map() not implemented";
  }
  get mapHead() {
    throw "get mapHead() not implemented";
  }
  get changesHead() {
    throw "get changesHead() not implemented";
  }
  get additionsHead() {
    throw "get additionsHead() not implemented";
  }
  get removalsHead() {
    throw "get removalsHead() not implemented";
  }
  forEachChange(fn) {
    throw "forEachChange() not implemented";
  }
  forEachAddition(fn) {
    throw "forEachAddition() not implemented";
  }
  forEachRemoval(fn) {
    throw "forEachRemoval() not implemented";
  }
}
export class MapKeyValue {
  get key() {
    throw "get key() not implemented";
  }
  get previousValue() {
    throw "get previousValue() not implemented";
  }
  get currentValue() {
    throw "get currentValue() not implemented";
  }
  get nextKeyValue() {
    throw "get nextKeyValue() not implemented";
  }
  get nextAddedKeyValue() {
    throw "get nextAddedKeyValue() not implemented";
  }
  get nextRemovedKeyValue() {
    throw "get nextRemovedKeyValue() not implemented";
  }
  get nextChangedKeyValue() {
    throw "get nextChangedKeyValue() not implemented";
  }
}
export class CollectionChangeRecord {
  get iterable() {
    throw "get iterable() not implemented";
  }
  get collectionHead() {
    throw "get collectionHead() not implemented";
  }
  get additionsHead() {
    throw "get additionsHead() not implemented";
  }
  get movesHead() {
    throw "get movesHead() not implemented";
  }
  get removalsHead() {
    throw "get removalsHead() not implemented";
  }
  forEachAddition(fn) {
    throw "forEachAddition() not implemented";
  }
  forEachMove(fn) {
    throw "forEachMove() not implemented";
  }
  forEachRemoval(fn) {
    throw "forEachRemoval() not implemented";
  }
}
export class CollectionChangeItem {
  get nextCollectionItem() {
    throw "get nextCollectionItem() not implemented";
  }
  get nextAddedItem() {
    throw "get nextAddedItem() not implemented";
  }
  get nextRemovedItem() {
    throw "get nextRemovedItem() not implemented";
  }
}
