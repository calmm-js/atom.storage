import * as I from 'infestines'
import * as Kefir from 'kefir'
import Atom from 'kefir.atom'
import {LocalStorage} from 'node-localstorage'

const localStorage = new LocalStorage('./test-storage~')

import AtomStorage, {expireNow} from '../dist/atom.storage.cjs'

const expire = () =>
  expireNow({
    unsafeDeleteAtoms: true, // NOTE: This option is not used typically.
    storage: localStorage,
    regex: /^test:/
  })

const Stored = props => AtomStorage({Atom, storage: localStorage, ...props})

function show(x) {
  switch (typeof x) {
    case 'string':
    case 'object':
      return JSON.stringify(x)
    default:
      return `${x}`
  }
}

const toExpr = f =>
  f
    .toString()
    .replace(/\s+/g, ' ')
    .replace(/^\s*function\s*\(\s*\)\s*{\s*(return\s*)?/, '')
    .replace(/\s*;?\s*}\s*$/, '')
    .replace(/function\s*(\([a-zA-Z0-9, ]*\))\s*/g, '$1 => ')
    .replace(/\(([^),]+)\) =>/, '$1 =>')
    .replace(/{\s*return\s*([^{;]+)\s*;\s*}/g, '$1')
    .replace(/\(0, [^.]*[.]([^)]*)\)/g, '$1')
    .replace(/\$\d+/g, '')

const testEq = (expect, thunk) =>
  it(`${toExpr(thunk)} => ${show(expect)}`, done => {
    const actual = thunk()
    const check = actual => {
      if (!I.acyclicEqualsU(actual, expect))
        throw new Error(`Expected: ${show(expect)}, actual: ${show(actual)}`)
      done()
    }
    if (actual instanceof Kefir.Observable) actual.take(1).onValue(check)
    else check(actual)
  })

describe('storage', () => {
  localStorage.clear()

  localStorage.setItem('lol', 'trigger a line')
  localStorage.setItem('test:lol', 'trigger a line')

  testEq([[101], true, [101]], () => {
    const x1 = Stored({key: 'test:x', schema: [1], value: [10]})
    x1.set([101])
    const x2 = Stored({key: 'test:x', schema: [1], value: [10]})
    return Kefir.combine([x1, Kefir.constant(x1 === x2), x2])
  })

  testEq('c', () => {
    const y = Stored({key: 'test:y', debounce: 0, value: 'a', time: 10})
    y.set('b')
    return Kefir.later(100).flatMap(() => {
      expire()
      return Stored({key: 'test:y', value: 'c', time: 10})
    })
  })

  testEq('b', () => {
    const z = Stored({key: 'test:z', value: 'a', time: 1000})
    z.set('b')
    z.set('a')
    z.set('b')
    return Kefir.later(10).flatMap(() => {
      expire()
      return Stored({key: 'test:z', value: 'a', time: 1000})
    })
  })
})
