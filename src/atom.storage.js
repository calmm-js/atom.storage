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

export const expireNow = ({storage, regex}) => {
  for (let i=0; i<storage.length; ++i) {
    const key = storage.key(i)
    if (!regex.test(key))
      continue

    const data = tryParse(storage.getItem(key))
    if (!seemsValid(data))
      continue

    if (data.expires <= Date.now())
      storage.removeItem(key)
  }
}

export default ({key,
                 value,
                 Atom,
                 storage,
                 time,
                 schema,
                 debounce}) => {
  const atom = Atom(getValue(storage, key, schema, value))

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

  return atom
}
