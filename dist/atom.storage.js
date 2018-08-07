(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('infestines')) :
  typeof define === 'function' && define.amd ? define(['exports', 'infestines'], factory) :
  (factory((global.atom = global.atom || {}, global.atom.storage = {}),global.I));
}(this, (function (exports,infestines) { 'use strict';

  var storages = /*#__PURE__*/new WeakMap();
  var usedOptions = new WeakMap();

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
    if (!seemsValid(data) || !infestines.acyclicEqualsU(data.schema, schema) || infestines.acyclicEqualsU(data.value, defaultValue)) {
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

      usedOptions.set(atom, options);

      var changes = atom.changes();
      if (0 <= debounce) changes = changes.debounce(debounce);

      changes.onValue(function (value) {
        if (infestines.acyclicEqualsU(value, defaultValue)) {
          storage.removeItem(key);
        } else {
          var data = { value: value };

          if (schema !== undefined) data.schema = schema;

          if (0 <= time) data.expires = time + Date.now();

          storage.setItem(key, JSON.stringify(data));
        }
      });
    } else {
      var oldOptions = usedOptions.get(atom);
      for (var k in options) {
        if (!infestines.acyclicEqualsU(options[k], oldOptions[k])) console.warn('atom.storage: Created two atoms with same storage and key ' + JSON.stringify(key) + ', but different ' + JSON.stringify(k) + ': first ' + JSON.stringify(oldOptions[k]) + ' and later ' + JSON.stringify(options[k]) + '.');
      }
    }

    return atom;
  }

  exports.unsafeDeleteAtom = unsafeDeleteAtom;
  exports.expireNow = expireNow;
  exports.Stored = Stored;
  exports.default = Stored;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
