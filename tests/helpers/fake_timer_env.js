function createFakeTimerEnv() {
  let now = 0;
  let nextId = 1;
  const timers = new Map();
  const rafTimers = new Map();

  function setTimeoutFn(cb, delay = 0) {
    const id = nextId++;
    timers.set(id, { id, cb, runAt: now + Number(delay), interval: null });
    return id;
  }

  function clearTimeoutFn(id) {
    timers.delete(id);
  }

  function setIntervalFn(cb, delay = 0) {
    const id = nextId++;
    timers.set(id, { id, cb, runAt: now + Number(delay), interval: Number(delay) });
    return id;
  }

  function clearIntervalFn(id) {
    timers.delete(id);
  }

  function requestAnimationFrameFn(cb) {
    const id = nextId++;
    rafTimers.set(id, { id, cb, runAt: now + 16 });
    return id;
  }

  function cancelAnimationFrameFn(id) {
    rafTimers.delete(id);
  }

  function advanceBy(ms) {
    const target = now + ms;
    while (true) {
      let nextTask = null;
      let nextMap = null;
      for (const task of timers.values()) {
        if (task.runAt <= target && (!nextTask || task.runAt < nextTask.runAt)) {
          nextTask = task;
          nextMap = timers;
        }
      }
      for (const task of rafTimers.values()) {
        if (task.runAt <= target && (!nextTask || task.runAt < nextTask.runAt)) {
          nextTask = task;
          nextMap = rafTimers;
        }
      }
      if (!nextTask) break;
      now = nextTask.runAt;
      if (nextTask.interval !== null && nextTask.interval !== undefined) {
        nextTask.runAt = now + nextTask.interval;
      } else {
        nextMap.delete(nextTask.id);
      }
      nextTask.cb();
    }
    now = target;
  }

  return {
    setTimeoutFn,
    clearTimeoutFn,
    setIntervalFn,
    clearIntervalFn,
    requestAnimationFrameFn,
    cancelAnimationFrameFn,
    advanceBy,
    timers,
  };
}

module.exports = { createFakeTimerEnv };
