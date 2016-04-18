const storages = new WeakMap()

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

      if (unsafeDeleteAtoms) {
        const atoms = getAtoms(storage)
        delete atoms[key]
      }
    }
  }
}

export default ({key,
                 value,
                 Atom,
                 storage,
                 time,
                 schema,
                 debounce}) => {
  const atoms = getAtoms(storage)

  let atom = atoms[key]
  if (!atom) {
    atoms[key] = atom = Atom(getValue(storage, key, schema, value))

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
  }

  return atom
}
