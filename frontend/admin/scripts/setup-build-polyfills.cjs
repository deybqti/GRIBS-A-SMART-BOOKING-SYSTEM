/**
 * Injects browser-ish globals so CRA's webpack/HtmlWebpackPlugin
 * can run during server-side builds (Node has no localStorage/window).
 */

const createInMemoryStorage = () => {
  const store = new Map()
  return {
    get length() {
      return store.size
    },
    key(index) {
      return Array.from(store.keys())[index] ?? null
    },
    getItem(key) {
      const value = store.get(String(key))
      return value === undefined ? null : value
    },
    setItem(key, value) {
      store.set(String(key), String(value))
    },
    removeItem(key) {
      store.delete(String(key))
    },
    clear() {
      store.clear()
    }
  }
}

if (typeof globalThis.window === 'undefined') {
  globalThis.window = {}
}

if (typeof globalThis.window.dispatchEvent !== 'function') {
  globalThis.window.dispatchEvent = () => {}
}

const ensureStorage = (prop) => {
  let exists = false
  try {
    exists = typeof globalThis[prop] !== 'undefined'
  } catch (_) {
    exists = false
  }
  if (!exists) {
    Object.defineProperty(globalThis, prop, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: createInMemoryStorage()
    })
  }
}

ensureStorage('localStorage')
ensureStorage('sessionStorage')

