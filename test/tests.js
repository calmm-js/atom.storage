import Atom           from "kefir.atom"
import * as I         from "infestines"
import {LocalStorage} from "node-localstorage"
import * as Kefir     from "kefir"

const localStorage = new LocalStorage("./test-storage~")

import AtomStorage, {expireNow} from "../src/atom.storage"

const expire = () =>
  expireNow({unsafeDeleteAtoms: true, // NOTE: This option is not used typically.
             storage: localStorage,
             regex: /^test:/})

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
    if (!I.acyclicEqualsU(actual, expect))
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

  localStorage.setItem("lol", "trigger a line")
  localStorage.setItem("test:lol", "trigger a line")

  testEq('{var x1 = Stored({key: "test:x", schema: [1], value: [10]});' +
         ' x1.set([101]);' +
         ' var x2 = Stored({key: "test:x", schema: [1], value: [10]});' +
         ' return Kefir.combine([x1, Kefir.constant(x1 === x2), x2]);}',
         [[101], true, [101]])

  testEq('{var y = Stored({key: "test:y", debounce: 0, value: "a", time: 10});' +
         ' y.set("b");' +
         ' return Kefir.later(100).flatMap(() => {' +
         ' expire();' +
         ' return Stored({key: "test:y", value: "c", time: 10}) })}',
         "c")

  testEq('{var z = Stored({key: "test:z", value: "a", time: 1000});' +
         ' z.set("b");' +
         ' z.set("a");' +
         ' z.set("b");' +
         ' return Kefir.later(10).flatMap(() => {' +
         ' expire();' +
         ' return Stored({key: "test:z", value: "a", time: 1000}) })}',
         "b")
})
