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
      list._argHandlerTail._nextArgHandlerItem = item;
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
