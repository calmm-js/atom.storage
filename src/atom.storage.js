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

const getValue = (storage, key, schema, value) => {
  const json = storage.getItem(key)
  if (!json)
    return value

  const data = tryParse(json)
  if (!seemsValid(data))
    return value

  if (data.schema !== schema)
    return value

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
  const {value, Atom, time, schema, debounce} = options

  const atoms = getAtoms(storage)

  let atom = atoms[key]
  if (!atom) {
    atoms[key] = atom = Atom(getValue(storage, key, schema, value))

    if (process.NODE_ENV !== "production")
      usedOptions.set(atom, options)

    let changes = atom.changes()
    if (0 <= debounce)
      changes = changes.debounce(debounce)

    changes.onValue(value => {
      const data = {value}

      if (schema !== undefined)
        data.schema = schema

      if (0 <= time)
        data.expires = time + Date.now()

      storage.setItem(key, JSON.stringify(data))
    })
  } else if (process.NODE_ENV !== "production") {
    const oldOptions = usedOptions.get(atom)
    for (const k in options) {
      if (options[k] !== oldOptions[k])
        throw new Error(`atom.storage: Created two atoms with same storage and key ${show(key)}, but different ${show(k)}: first ${show(oldOptions[k])} and later ${show(options[k])}.`)
    }
  }

  return atom
}
