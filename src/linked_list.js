export class _LinkedListItem {
  static _initialize(item) {
    // TODO: Traceur assertions
    // assert(typeof item._previous === "undefined");
    // assert(typeof item._next === "undefined");
    item._next = item._previous = null;
  }
}

export class _LinkedList {
  static _initialize(list) {
    // TODO: Traceur assertions
    // assert(typeof list._head === "undefined");
    // assert(typeof list._tail === "undefined");
    list._tail = list._head = null;
  }

  static _add(list, item) {
    // TODO: Traceur assertions
    // assert(item._next === null);
    // assert(item._previous === null);
    if (list._tail === null) {
      list._head = list._tail = item;
    } else {
      item._previous = list._tail;
      list._tail._next = item;
      list._tail = item;
    }
    return item;
  }

  static _isEmpty(list) {
    return list._head === null;
  }

  static _remove(list, item) {
    var previous = item._previous;
    var next = item._next;

    if (previous === null) list._head = next;
    else previous._next = next;
    if (next === null) list._tail = previous;
    else next._previous = previous;
  }
}

export class _WatchList {
  static _initialize(list) {
    // TODO: Traceur assertions
    // assert(typeof list._watchHead === "undefined");
    // assert(typeof list._watchTail === "undefined");
    list._watchHead = list._watchTail = null;
  }

  static _add(list, item) {
    // TODO: Traceur assertions
    // assert(item._nextWatch === null);
    // assert(item._previousWatch === null);
    if (list._watchTail === null) {
      list._watchHead = list._watchTail = item;
    } else {
      item._previousWatch = list._watchTail;
      list._watchTail._nextWatch = item;
      list._watchTail = item;
    }
    return item;
  }

  static _isEmpty(list) {
    return list._watchHead === null;
  }

  static _remove(list, item) {
    var previous = item._previousWatch;
    var next = item._nextWatch;
    if (previous === null) list._watchHead = next;
    else previous._nextWatch = next;
    if (next === null) list._watchTail = previous;
    else next._previousWatch = previous;
  }
}

export class _WatchGroupList {
  static _add(list, item) {
    // TODO(caitp): Traceur assertions
    // assert(item._nextWatchGroup === null);
    // assert(item._prevWatchGroup === null);
    if (list._watchGroupTail === null) {
      list._watchGroupHead = list._watchGroupTail = item;
    } else {
      item._prevWatchGroup = list._watchGroupTail;
      list._watchGroupTail._nextWatchGroup = item;
      list._watchGroupTail = item;
    }
    return item;
  }

  static _isEmpty(list) {
    return list._watchGroupHead === null;
  }

  static _remove(list, item) {
    var previous = item._prevWatchGroup;
    var next = item._nextWatchGroup;

    if (previous === null) list._watchGroupHead = next;
    else previous._nextWatchGroup = next;
    if (next === null) list._watchGroupTail = previous;
    else next._prevWatchGroup = previous;
  }
}

export class _ArgHandlerList {
  static _initialize(list) {
    list._argHandlerHead = list._argHandlerTail = null;
  }

  static _add(list, item) {
    // TODO: Traceur assertions
    // assert(item._nextArgHandler === null);
    // assert(item._previousArgHandler === null);
    if (list._argHandlerTail === null) {
      list._argHandlerHead = list._argHandlerTail = item;
    } else {
      item._previousArgHandler = list._argHandlerTail;
      list._argHandlerTail._nextArgHandler = item;
      list._argHandlerTail = item;
    }
    return item;
  }

  static _isEmpty(list) {
    return list._argHandlerHead === null;
  }

  static _remove(list, item) {
    var previous = item._previousArgHandler;
    var next = item._nextArgHandler;

    if (previous === null) list._argHandlerHead = next;
    else previous._nextArgHandler = next;
    if (next === null) list._argHandlerTail = previous;
    else next._previousArgHandler = previous;
  }
}

export class _EvalWatchList {
  static _add(list, item) {
    // TODO: Traceur assertions
    // assert(item._nextEvalWatch === null);
    // assert(item._prevEvalWatch === null);
    var prev = list._evalWatchTail;
    var next = prev._nextEvalWatch;

    if (prev === list._marker) {
      list._evalWatchHead = list._evalWatchTail = item;
      prev = prev._prevEvalWatch;
      list._marker._prevEvalWatch = null;
      list._marker._nextEvalWatch = null;
    }
    item._nextEvalWatch = next;
    item._prevEvalWatch = prev;

    if (prev !== null) prev._nextEvalWatch = item;
    if (next !== null) next._prevEvalWatch = item;

    return (list._evalWatchTail = item);
  }

  static _isEmpty(list) {
    return list._evalWatchHead === null;
  }

  static _remove(list, item) {
    // TODO: Traceur assertions
    // assert(item.watchGrp === list);
    var prev = item._prevEvalWatch;
    var next = item._nextEvalWatch;

    if (list._evalWatchHead === list._evalWatchTail) {
      list._evalWatchHead = list._evalWatchTail = list._marker;
      list._marker._nextEvalWatch = next;
      list._marker._prevEvalWatch = prev;
      if (prev !== null) prev._nextEvalWatch = list._marker;
      if (next !== null) next._prevEvalWatch = list._marker;
    } else {
      if (item === list._evalWatchHead) list._evalWatchHead = next;
      if (item === list._evalWatchTail) list._evalWatchTail = prev;
      if (prev !== null) prev._nextEvalWatch = next;
      if (next !== null) next._prevEvalWatch = prev;
    }
  }
}