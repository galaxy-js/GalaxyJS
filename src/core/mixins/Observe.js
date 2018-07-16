import ProxyObserver from 'https://cdn.jsdelivr.net/gh/LosMaquios/ProxyObserver@v0.3.3/index.js'

/**
 * Observe - Watching mechanism
 *
 * @mixin
 */
export default {

  /**
   * Watch a given `path` from the state
   *
   * @param {string} path
   * @param {Function} watcher
   *
   * @return {Function}
   */
  $watch (path, watcher) {
    let $observer
    let dispatch

    let { state } = this
    const keys = path.split('.')

    keys.forEach((key, index) => {
      if (index !== keys.length - 1) {
        state = state[key]

        if (!state) throw new GalaxyError(`Wrong path at segment: '.${key}'`)
      } else {
        $observer = ProxyObserver.get(state)

        if (key === '*') {
          dispatch = change => {
            watcher(
              change.value, change.old,

              // We need to pass extra properties
              // for deep observing.
              change.property, change.target
            )
          }
        } else {
          dispatch = change => {
            if (change.property === key) {
              watcher(change.value, change.old)
            }
          }
        }
      }
    })

    if ($observer && dispatch) {
      $observer.subscribe(dispatch)

      return () => {
        $observer.unsubscribe(dispatch)
      }
    }
  }
}
