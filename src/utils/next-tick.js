const microtask = Promise.resolve()
const queue = nextTick.queue = []

/**
 * Defers execution of a given `callback`
 *
 * @param {Function} callback
 *
 * @return void
 */
export default function nextTick (callback) {
  if (!nextTick.waiting) {
    // Always flushing in a microtask
    microtask.then(nextTick.flush)
  }

  queue.push(callback)
}

/**
 * Determines when we are waiting to flush the queue
 *
 * @type {boolean}
 */
Object.defineProperty(nextTick, 'waiting', {
  enumerable: true,
  get () {
    return queue.length > 0
  }
})

/**
 * Defers a callback to be called
 * after flush the queue
 *
 * @param {Function} fn
 *
 * @return void
 */
nextTick.afterFlush = fn => {
  setTimeout(() => {
    if (nextTick.waiting) {
      return nextTick.afterFlush(fn)
    }

    fn()
  })
}

/**
 * Flushes the actual queue
 *
 * @return {boolean}
 */
nextTick.flush = () => {
  if (nextTick.waiting) {
    const callbacks = queue.slice()

    // Empty actual queue
    queue.length = 0

    for (const callback of callbacks) {
      callback()
    }
  }
}
