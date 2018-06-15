export default class GalaxyError extends Error {}

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
