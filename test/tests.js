import Atom           from "kefir.atom"
import R              from "ramda"
import {LocalStorage} from "node-localstorage"
import Kefir          from "kefir"

const localStorage = new LocalStorage("./test-storage~")

import AtomStorage, {expireNow} from "../src/atom.storage"

const expire = () => expireNow({storage: localStorage, regex: /^test:/})

const Stored = props => AtomStorage({Atom, storage: localStorage, ...props})

function show(x) {
  switch (typeof x) {
  case "string":
  case "object":
    return JSON.stringify(x)
  default:
    return `${x}`
  }
}

const testEq = (expr, expect) => it(`${expr} => ${show(expect)}`, done => {
  const actual = eval(`(Stored, Kefir, expire) => ${expr}`)(Stored, Kefir, expire)
  const check = actual => {
    if (!R.equals(actual, expect))
      throw new Error(`Expected: ${show(expect)}, actual: ${show(actual)}`)
    done()
  }
  if (actual instanceof Kefir.Observable)
    actual.take(1).onValue(check)
  else
    check(actual)
})

describe("storage", () => {
  localStorage.clear()

  testEq('{var x1 = Stored({key: "test:x", value: 10});' +
         ' x1.set(101);' +
         ' var x2 = Stored({key: "test:x", value: 21});' +
         ' return x2;}',
         101)

  testEq('{var y = Stored({key: "test:y", value: "a", time: 10});' +
         ' y.set("b");' +
         ' return Kefir.later(30).flatMap(() => {' +
         ' expire();' +
         ' return Stored({key: "test:y", value: "c", time: 10}) })}',
         "c")

  testEq('{var y = Stored({key: "test:y", value: "a", time: 60});' +
         ' y.set("b");' +
         ' return Kefir.later(30).flatMap(() => {' +
         ' expire();' +
         ' return Stored({key: "test:y", value: "c", time: 10}) })}',
         "b")
})
