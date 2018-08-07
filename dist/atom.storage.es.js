import { acyclicEqualsU } from 'infestines';

var storages = new WeakMap();
var usedOptions = void 0;
if (process.env.NODE_ENV !== 'production') usedOptions = new WeakMap();

var getAtoms = function getAtoms(storage) {
  var atoms = storages.get(storage);
  if (!atoms) storages.set(storage, atoms = {});
  return atoms;
};

var tryParse = function tryParse(json) {
  try {
    return JSON.parse(json);
  } catch (error) {
    return error;
  }
};

var seemsValid = function seemsValid(data) {
  return !(data instanceof Error) && data && 'value' in data;
};

var getValue = function getValue(storage, key, schema, defaultValue, time) {
  var json = storage.getItem(key);
  if (!json) return defaultValue;

  var data = tryParse(json);
  if (!seemsValid(data) || !acyclicEqualsU(data.schema, schema) || acyclicEqualsU(data.value, defaultValue)) {
    storage.removeItem(key);
    return defaultValue;
  }

  if (0 <= time) {
    data.expires = time + Date.now();

    storage.setItem(key, JSON.stringify(data));
  }

  return data.value;
};

var unsafeDeleteAtom = function unsafeDeleteAtom(_ref) {
  var storage = _ref.storage,
      key = _ref.key;

  var atoms = getAtoms(storage);
  delete atoms[key];
};

var expireNow = function expireNow(_ref2) {
  var storage = _ref2.storage,
      regex = _ref2.regex,
      unsafeDeleteAtoms = _ref2.unsafeDeleteAtoms;

  for (var i = 0; i < storage.length; ++i) {
    var key = storage.key(i);

    if (!regex.test(key)) continue;

    var data = tryParse(storage.getItem(key));
    if (!seemsValid(data)) continue;

    if (data.expires <= Date.now()) {
      storage.removeItem(key);

      if (unsafeDeleteAtoms) unsafeDeleteAtom({ storage: storage, key: key });
    }
  }
};

function Stored(options) {
  var key = options.key,
      storage = options.storage,
      defaultValue = options.value,
      Atom = options.Atom,
      time = options.time,
      schema = options.schema,
      debounce = options.debounce;


  var atoms = getAtoms(storage);

  var atom = atoms[key];
  if (!atom) {
    atoms[key] = atom = Atom(getValue(storage, key, schema, defaultValue, time));

    if (process.env.NODE_ENV !== 'production') usedOptions.set(atom, options);

    var changes = atom.changes();
    if (0 <= debounce) changes = changes.debounce(debounce);

    changes.onValue(function (value) {
      if (acyclicEqualsU(value, defaultValue)) {
        storage.removeItem(key);
      } else {
        var data = { value: value };

        if (schema !== undefined) data.schema = schema;

        if (0 <= time) data.expires = time + Date.now();

        storage.setItem(key, JSON.stringify(data));
      }
    });
  } else if (process.env.NODE_ENV !== 'production') {
    var oldOptions = usedOptions.get(atom);
    for (var k in options) {
      if (!acyclicEqualsU(options[k], oldOptions[k])) console.warn('atom.storage: Created two atoms with same storage and key ' + JSON.stringify(key) + ', but different ' + JSON.stringify(k) + ': first ' + JSON.stringify(oldOptions[k]) + ' and later ' + JSON.stringify(options[k]) + '.');
    }
  }

  return atom;
}

export default Stored;
export { unsafeDeleteAtom, expireNow };
