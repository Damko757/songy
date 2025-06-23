type DequeueItem<T> =
  | {
      value: T; ///< Item's value
      prev?: DequeueItem<T>; ///< Previous element (or undefined if none), closer to front
      next?: DequeueItem<T>; ///< Next element (or undefined if none), closer to back
    }
  | undefined;

/**
 * Double ended queue
 */
export class Dequeue<T> {
  protected front: DequeueItem<T> = undefined; ///< Pointer to item at front
  protected back: DequeueItem<T> = undefined; ///< Pointer to item at back
  size: number = 0; ///< Number of elements in dequeue

  [Symbol.iterator]() {
    return this.iteratorFromFront();
  }

  /**
   * Creates iterator of values with modifiable direction
   * @param fromFront If it should iterate from Front or Back
   * @returns Iterator
   */
  protected _iterator(fromFront: boolean) {
    let currentElement = fromFront ? this.front : this.back;
    return {
      next(): IteratorResult<T> {
        if (!currentElement) return { value: undefined as any, done: true };

        const value = currentElement.value;
        currentElement = fromFront ? currentElement.next : currentElement.prev; // Switching to next
        return { value: value, done: false };
      },
    };
  }

  /**
   * @returns Iterator from the Front
   */
  iteratorFromFront() {
    return this._iterator(true);
  }
  /**
   * @returns Iterator from the Back
   */
  iteratorFromBack() {
    return this._iterator(false);
  }

  constructor(from?: Iterable<T>) {
    this.addFrontMultiple(from ?? []);
  }

  /**
   * Removes all elements, makes dequeue clean
   */
  clear() {
    this.front = this.back = undefined;
    this.size = 0;
  }

  /**
   * Inserts `value` to the front
   * @param value Value to insert
   */
  addFront(value: T) {
    // this.front inside if to make the TS happy when this.front can be undefined (this.size == 0 <=> this.front == undefined)
    if (!this.front) this.front = this.back = { value: value };
    else this.front = this.front.prev = { value, next: this.front };
    this.size++;
  }

  /**
   * Inserts `value` to the back
   * @param value Value to insert
   */
  addBack(value: T) {
    if (!this.back) this.front = this.back = { value };
    else this.back = this.back.next = { value, prev: this.back };
    this.size++;
  }

  /**
   * Inserts all of the `values` to the front
   * Order is preserved. Inserting [a, b, c] will result in deque {FRONT = a, b, c, ...}
   * @param value Value to insert
   */
  addFrontMultiple(values: Iterable<T>) {
    let i = 0;
    const originalFront = this.front;
    let lastInserted: DequeueItem<T> = undefined;

    for (const value of values) {
      // First element will be at the front
      if (i++ == 0) {
        this.addFront(value);
        lastInserted = this.front;
        continue;
      }

      this.size++; // Add front automatically increases size

      // Next value are inserted between front and originalFront
      lastInserted!.next = {
        value: value,
        next: originalFront,
        prev: this.front,
      };
      if (originalFront) originalFront.prev = this.front?.next;

      lastInserted = lastInserted!.next; // Moving cursor to next
    }
  }
  /**
   * Inserts all of the `values` to the back
   * Order is preserved. Inserting [a, b, c] will result in deque {...,  a, b, c = BACK}
   * @param value Value to insert
   */
  addBackMultiple(values: Iterable<T>) {
    for (const value of values) this.addBack(value);
  }

  /**
   * Removes value currently at the front
   * @returns Removed value
   */
  removeFront() {
    const value = this.peekFront();
    if (this.front === this.back) this.front = this.back = undefined;
    else (this.front = this.front!.next)!.prev = undefined;

    if (value !== undefined) this.size--;
    return value;
  }

  /**
   * Removes value currently at the back
   * @returns Removed value
   */
  removeBack() {
    let value = this.peekBack();
    if (this.front === this.back) this.front = this.back = undefined;
    else (this.back = this.back!.prev)!.next = undefined;

    if (value !== undefined) this.size--;
    return value;
  }

  /**
   * Peeks at value at the front
   * @returns Item at the front or undefined if none
   */
  peekFront() {
    return this.front?.value;
  }

  /**
   * Peeks at value at the back
   * @returns Item at the back or undefined if none
   */
  peekBack() {
    return this.back?.value;
  }
}
