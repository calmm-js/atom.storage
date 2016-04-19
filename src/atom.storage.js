import * as R from "ramda"

const storages = new WeakMap()
let usedOptions
if (process.NODE_ENV !== "production")
  usedOptions = new WeakMap()

const getAtoms = storage => {
  let atoms = storages.get(storage)
  if (!atoms)
    storages.set(storage, atoms = {})
  return atoms
}

const tryParse = json => {
  try {
    return JSON.parse(json)
  } catch (error) {
    return error
  }
}

const seemsValid =
  data => data && data.constructor === Object && "value" in data

const getValue = (storage, key, schema, defaultValue, time) => {
  const json = storage.getItem(key)
  if (!json)
    return defaultValue

  const data = tryParse(json)
  if (!seemsValid(data) || !R.equals(data.schema, schema) || R.equals(data.value, defaultValue)) {
    storage.removeItem(key)
    return defaultValue
  }

  if (0 <= time) {
    data.expires = time + Date.now()

    storage.setItem(key, JSON.stringify(data))
  }

  return data.value
}

export const unsafeDeleteAtom = ({storage, key}) => {
  const atoms = getAtoms(storage)
  delete atoms[key]
}

export const expireNow = ({storage, regex, unsafeDeleteAtoms}) => {
  for (let i=0; i<storage.length; ++i) {
    const key = storage.key(i)

    if (!regex.test(key))
      continue

    const data = tryParse(storage.getItem(key))
    if (!seemsValid(data))
      continue

    if (data.expires <= Date.now()) {
      storage.removeItem(key)

      if (unsafeDeleteAtoms)
        unsafeDeleteAtom({storage, key})
    }
  }
}

function show(x) {
  switch (typeof x) {
  case "string":
  case "object":
    return JSON.stringify(x)
  default:
    return `${x}`
  }
}

export default ({key, storage, ...options}) => {
  const {value: defaultValue, Atom, time, schema, debounce} = options

  const atoms = getAtoms(storage)

  let atom = atoms[key]
  if (!atom) {
    atoms[key] = atom = Atom(getValue(storage, key, schema, defaultValue, time))

    if (process.NODE_ENV !== "production")
      usedOptions.set(atom, options)

    let changes = atom.changes()
    if (0 <= debounce)
      changes = changes.debounce(debounce)

    changes.onValue(value => {
      if (R.equals(value, defaultValue)) {
        storage.removeItem(key)
      } else {
        const data = {value}

        if (schema !== undefined)
          data.schema = schema

        if (0 <= time)
          data.expires = time + Date.now()

        storage.setItem(key, JSON.stringify(data))
      }
    })
  } else if (process.NODE_ENV !== "production") {
    const oldOptions = usedOptions.get(atom)
    for (const k in options) {
      if (!R.equals(options[k], oldOptions[k]))
        throw new Error(`atom.storage: Created two atoms with same storage and key ${show(key)}, but different ${show(k)}: first ${show(oldOptions[k])} and later ${show(options[k])}.`)
    }
  }

  return atom
}
