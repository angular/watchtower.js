import {
  ChangeDetector
} from './change_detection.js';

export class GetterCache {
  constructor(map) {
    this._map = map;
  }
}

export class DirtyCheckingChangeDetector extends ChangeDetector {
  collectChanges() {
    return null;
  }
  watch() {}
  newGroup() {}
}
