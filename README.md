Minimalistic
[`Storage`](https://developer.mozilla.org/en-US/docs/Web/API/Storage)
(e.g. [`localStorage`](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage))
implementation for Atoms.

[![npm version](https://badge.fury.io/js/atom.storage.svg)](http://badge.fury.io/js/atom.storage) [![Build Status](https://travis-ci.org/calmm-js/atom.storage.svg?branch=master)](https://travis-ci.org/calmm-js/atom.storage) [![](https://david-dm.org/calmm-js/atom.storage.svg)](https://david-dm.org/calmm-js/atom.storage) [![](https://david-dm.org/calmm-js/atom.storage/dev-status.svg)](https://david-dm.org/calmm-js/atom.storage#info=devDependencies) [![Gitter](https://img.shields.io/gitter/room/calmm-js/chat.js.svg?style=flat-square)](https://gitter.im/calmm-js/chat)

## Usage

You must first provide an `Atom` implementation.  You can use either

```js
import Atom from "bacon.atom"
```

or

```js
import Atom from "kefir.atom"
```

for example.  See [`bacon.atom`](https://github.com/calmm-js/bacon.atom) and
[`kefir.atom`](https://github.com/calmm-js/kefir.atom) for details.

The default import

```js
import Stored from "atom.storage"
```

is a function to create an atom whose contents are stored.

### Creating a Stored atom

To create an atom whose contents are stored, you pass a key, a default value,
the desired `Atom` constructor, and the desired
[`Storage`](https://developer.mozilla.org/en-US/docs/Web/API/Storage) object to
the `Stored` constructor.  For example:

```js
const stored = Stored({key: "my-stored-model",
                       value: defaultValue,
                       Atom,
                       storage: localStorage})
```

The given default value is only used when the given storage does not already
contain a value for the given key.

The value of the atom is converted to a string by calling
[`JSON.stringify`](https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify).

Note that when a stored atom is created, the (default) value is not stored.  The
value is stored only after a `modify` method call that actually results in a new
value for the stored atom.

### Full options

The full argument object to `Stored` can be described as follows:

```js
{key: String,
 value: JSON,
 Atom: JSON => AbstractMutable,
 storage: Storage,
 time: Maybe Milliseconds,
 schema: Maybe (Number | Boolean | String | null),
 debounce: Maybe Milliseconds}
```

The `time`, if specified, is the number of milliseconds after which the value is
considered to have expired.  If not specified, the value never expires.

The `schema`, if specified, is stored with the value, and checked when a stored
atom is created.  If the stored `schema` is not equal, as determined by `===`,
to the given value, then the stored value is ignored and the given default is
used instead.

The `debounce`, if specified, is the debounce period, in milliseconds, to use
for storing values.  If not specified, values are stored immediately.  Note that
`debounce: 0` is different from no debounce.

### Expiring

The named export

```js
import {expireNow} from "atom.storage"
```

is a function that takes a `{storage, regex}` argument object.  `expireNow` goes
through items in the `storage`, whose keys match the given `regex`, and removes
items that have expired.  You typically call `expireNow` once immediately or
shortly after your app starts.  For example:

```js
expireNow({storage: localStorage, regex: /^my-unique-app-prefix:/})
```

### Combining with Undo

`Stored` directly returns the object it constructs with `Atom`.  This means that
you can combine `Stored` with more complex ways to create atoms.  In particular,
you can combine `Stored` with `Undo` from
[`atom.undo`](https://github.com/calmm-js/atom.undo).  You can decide whether
you create an `Undo` atom with `Stored`:

```js
const storesFullHistory =
  Undo({value, Atom: value => Stored({key, value, storage, Atom})})
```

Or a stored `Atom` with `Undo`:

```js
const storesLatestValue =
  Stored({key, value, storage, Atom: value => Undo({value, Atom})})
```

Both of these combinations return an undoable atom and can be useful.
