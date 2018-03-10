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
 * Flushes the actual queue
 *
 * @return {boolean}
 */
nextTick.flush = () => {
  if (nextTick.waiting) {
    const callbacks = queue.slice()
    const { length } = callbacks

    // Empty actual queue
    queue.length = 0

    for (let i = 0; i < length; ++i) {
      callbacks[i]()
    }
  }
}
