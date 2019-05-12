export default class GalaxyError extends Error {
  name = 'GalaxyError'
}

/**
 * Converts given `error`
 *
 * @param {Error} error
 *
 * @return {GalaxyError}
 */
export function galaxyError ({ message, stack }) {
  const galaxyError = new GalaxyError(message)

  // Setting up correct stack
  galaxyError.stack = stack

  return galaxyError
}
