import { describe, expect, it } from "bun:test";
import { Dequeue } from "../../src/Helpers/Dequeue";

describe("Basic functions", () => {
  it("addFront", () => {
    const dequeue = new Dequeue<number>();
    expect(dequeue.size).toBe(0);
    expect(dequeue.addFront(1)).toBeUndefined();
    expect(dequeue.size).toBe(1);
    expect(dequeue.addFront(2)).toBeUndefined();
    expect(dequeue.addFront(3)).toBeUndefined();
    expect(dequeue.size).toBe(3);

    expect(dequeue.peekFront()).toBe(3);
    expect(dequeue.peekBack()).toBe(1);
  });
  it("addBack", () => {
    const dequeue = new Dequeue();
    expect(dequeue.size).toBe(0);
    expect(dequeue.addBack(1)).toBeUndefined();
    expect(dequeue.size).toBe(1);
    expect(dequeue.addBack(2)).toBeUndefined();
    expect(dequeue.addBack(3)).toBeUndefined();
    expect(dequeue.size).toBe(3);

    expect(dequeue.peekFront()).toBe(1);
    expect(dequeue.peekBack()).toBe(3);
  });

  it("addBackMultiple", () => {
    const dequeue = new Dequeue();

    dequeue.addFront(0);
    dequeue.addBackMultiple([1, 2, 3, 4, 5]);
    let v = 0;
    for (const value of dequeue) {
      expect(value).toBe(v++);
    }

    expect(dequeue.size).toBe(6);
  });

  it("addFrontMultiple", () => {
    const dequeue = new Dequeue();

    dequeue.addFront(6);
    dequeue.addFrontMultiple([1, 2, 3, 4, 5]);
    let v = 1;
    for (const value of dequeue) {
      expect(value).toBe(v++);
    }

    expect(dequeue.size).toBe(6);
  });

  it("remove", () => {
    const dequeue = new Dequeue();

    dequeue.addBackMultiple([1, 2, 3, 4, 5]);

    expect(dequeue.removeBack()).toBe(5);
    expect(dequeue.peekBack()).toBe(4);
    expect(dequeue.peekFront()).toBe(1);

    expect(dequeue.removeFront()).toBe(1);
    expect(dequeue.peekBack()).toBe(4);
    expect(dequeue.peekFront()).toBe(2);

    expect(dequeue.size).toBe(3);
  });

  it("clear", () => {
    const dequeue = new Dequeue(Array(100).map((_, i) => i));
    expect(dequeue.size).toBe(100);
    dequeue.clear();
    expect(dequeue.size).toBe(0);
    expect(dequeue.peekFront()).toBeUndefined();
    expect(dequeue.peekBack()).toBeUndefined();
  });

  it("combination", () => {
    const dequeue = new Dequeue<number>();
    expect(dequeue.peekFront()).toBeUndefined();
    expect(dequeue.peekBack()).toBeUndefined();

    dequeue.addFront(1);
    expect(dequeue.size).toBe(1);
    expect(dequeue.peekFront()).toBe(1);
    expect(dequeue.peekBack()).toBe(1);

    dequeue.addBack(10);
    expect(dequeue.size).toBe(2);
    expect(dequeue.peekFront()).toBe(1);
    expect(dequeue.peekBack()).toBe(10);

    dequeue.addBack(5);
    expect(dequeue.size).toBe(3);

    expect(dequeue.removeFront()).toBe(1);
    expect(dequeue.size).toBe(2);

    dequeue.clear();
    dequeue.addBackMultiple([1, 2, 3]);
    expect(dequeue.size).toBe(3);
  });
});
