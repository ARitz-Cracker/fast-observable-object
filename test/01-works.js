/* eslint-disable prefer-arrow-callback */
/* eslint-disable no-magic-numbers */
const chai = require("chai");
chai.use(require("chai-as-promised"));
chai.use(require("chai-eventemitter2")());
const expect = chai.expect;

const {FastObjectObserver} = require("../index");
describe("Observable objects", function(){
	it("observes when properties are changed", function(){
		const observer = new FastObjectObserver({});
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [["a"], "aa"]})
			.on(() => {
				observer.object.a = "aa";
			});
	});
	it("observed objects with their own properties", function(){
		const observer = new FastObjectObserver({a: "aa"});
		expect(observer.object).to.have.own.property("a", "aa");
	});
	it("deletes properties set to undefined", function(){
		const observer = new FastObjectObserver({a: "aa"});
		observer.object.a = undefined;
		expect(observer.object).to.not.have.own.property("a");
		expect(observer.object).to.not.have.property("a");
	});
	it("does not emit a change event when a property is set to undefined", function(){
		const observer = new FastObjectObserver({a: "aa"});
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.object.a = undefined;
			});
	});
	it("emits a deletion event when a property is deleted (set to undefiend)", function(){
		const observer = new FastObjectObserver({a: "aa"});
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyDeleted", {withArgs: [["a"]]})
			.on(() => {
				observer.object.a = undefined;
			});
		expect(observer.object).to.not.haveOwnProperty("a");
	});
	it("works with pre-defined nested objects", function(){
		const observer = new FastObjectObserver({o: {a: "aa"}});
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [["o", "a"], "bb"]})
			.on(() => {
				observer.object.o.a = "bb";
			});
	});
	it("works with nested objects defined in runtime", function(){
		const observer = new FastObjectObserver({});
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [["o"], {a: "aa"}]})
			.to.emit("propertyChanged", {withArgs: [["o", "a"], "bb"]})
			.on(() => {
				observer.object.o = {a: "aa"};
				observer.object.o.a = "bb";
			});
	});
	it("observes arrays", function(){
		const observer = new FastObjectObserver([]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [[0], "aa"]})
			.on(() => {
				observer.object[0] = "aa"
			});
	});
	it("observes pre-defined nested arrays", function(){
		const observer = new FastObjectObserver([[]]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [[0, 0], "aa"]})
			.on(() => {
				observer.object[0][0] = "aa"
			});
	});
	it("observes nested arrays defined in runtime", function(){
		const observer = new FastObjectObserver([]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [[0], []]})
			.to.emit("propertyChanged", {withArgs: [[0, 0], "aa"]})
			.on(() => {
				observer.object[0] = [];
				observer.object[0][0] = "aa"
			});
	});
	it("works with Array#push", function(){
		const observer = new FastObjectObserver([]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [[0], "a"]})
			.to.emit("propertyChanged", {withArgs: [[1], "b"]})
			.to.emit("propertyChanged", {withArgs: [[2], "c"]})
			.on(() => {
				observer.object.push("a");
				observer.object.push("b");
				observer.object.push("c");
			});
		expect(observer.object).to.deep.equal(["a", "b", "c"]);
	});
	it("works with Array#pop", function(){
		const observer = new FastObjectObserver(["a", "b", "c"]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [["length"], 2]})
			.to.emit("propertyChanged", {withArgs: [["length"], 1]})
			.to.emit("propertyChanged", {withArgs: [["length"], 0]})
			.on(() => {
				observer.object.pop();
				observer.object.pop();
				observer.object.pop();
			});
		expect(observer.object).to.deep.equal([]);
		const observer2 = new FastObjectObserver(["a"]);
		expect(observer2.object.pop()).to.equal("a");
	});
	it("works with Array#splice", function(){
		const observer = new FastObjectObserver(["a", "b", "c", "d"]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [[1], "e"]})
			.to.emit("propertyChanged", {withArgs: [[2], "f"]})
			.on(() => {
				observer.object.splice(1, 2, "e", "f");
			});
		expect(observer.object).to.deep.equal(["a", "e", "f", "d"]);

		const observer2 = new FastObjectObserver(["a", "b", "c", "d"]);
		expect(observer2)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [[1], "e"]})
			.to.emit("propertyChanged", {withArgs: [[2], "d"]})
			.to.emit("propertyChanged", {withArgs: [["length"], 3]})
			.on(() => {
				observer2.object.splice(1, 2, "e");
			});
		expect(observer2.object).to.deep.equal(["a", "e", "d"]);
	});
	it("has Array#splice return a copy of the object", function(){
		const originalB = {b: {}};
		const observer = new FastObjectObserver([{a: {}}, originalB]);
		const [resultB] = observer.object.splice(1, 1);
		expect(resultB).to.not.equal(originalB);
		expect(resultB).to.deep.equal({b: {}});
		expect(observer.object).to.deep.equal([{a: {}}]);
	});
	it("works with Array#sort", function(){
		const observer = new FastObjectObserver(["d", "c", "b", "a"]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [[0], "a"]})
			.to.emit("propertyChanged", {withArgs: [[1], "b"]})
			.to.emit("propertyChanged", {withArgs: [[2], "c"]})
			.to.emit("propertyChanged", {withArgs: [[3], "d"]})
			.on(() => {
				observer.object.sort();
			});
		expect(observer.object).to.deep.equal(["a", "b", "c", "d"]);
	});


	it("FIXME? throws when circular objects are attempted to be observed", function(){
		// This is only because I don't want to deal with the paths and shit changing rn
		const originalObject = {};
		const observer = new FastObjectObserver(originalObject);
		expect(function(){
			observer.object.o = originalObject;
		}).to.throw("Cannot observe a circular object");
	});

	it("FIXME? throws when an object has multiple potential paths", function(){
		// This is only because I don't want to deal with the paths and shit changing rn
		const duplicateObject = {};
		const observer = new FastObjectObserver();
		expect(function(){
			observer.object.a = duplicateObject;
			observer.object.b = duplicateObject;
		}).to.throw("Cannot observe a circular object");
	});

	it("Throws when non-pure objects are observed", function(){
		// Maybe add an exception for buffers and arrays, anything else would be too big of a headache
		const observer = new FastObjectObserver({});
		expect(function(){
			observer.object.o = new Uint8Array([1, 2, 3, 4]);
		}).to.throw("only \"pure\" objects and arrays are supported");
	});
	it("ignores potentially unsafe properties", function(){
		const observer = new FastObjectObserver({});
		observer.object.valueOf = "on noes!";
		expect(observer.object.valueOf).to.equal(Object.prototype.valueOf);
	});
	it("ignores potentially unsafe properties on definition", function(){
		const observer = new FastObjectObserver({valueOf: "oh noes!"});
		expect(observer.object.valueOf).to.equal(Object.prototype.valueOf);
	});
	it("doesn't throw change events if the existing value matches new value", function(){
		const observer = new FastObjectObserver({o: {a: "aa"}});
		expect(observer)
			.to.emit("propertyChanged", {count: 0})
			.to.emit("error", {count: 0})
			.on(() => {
				observer.object.o.a = "aa";
			});
	});
	it("allows deleted objects to be re-added", function(){
		const innerObject = {};
		const observer = new FastObjectObserver();
		expect(function(){
			observer.object.o = innerObject;
			observer.object.o = undefined;
			observer.object.o = innerObject;
		}).not.to.throw();
	});
	it("allows objects that were replaced with other values to be re-added", function(){
		const innerObject = {};
		const observer = new FastObjectObserver();
		expect(function(){
			observer.object.o = innerObject;
			observer.object.o = "asdf";
			observer.object.o = innerObject;
		}).not.to.throw();
	});
	it("allows nested objects that were deleted to be re-added", function(){
		const innerObject = {innerInner: {}};
		const observer = new FastObjectObserver();
		expect(function(){
			observer.object.o = innerObject;
			observer.object.o = "asdf";
			observer.object.o = innerObject.innerInner;
		}).not.to.throw();
	});
	it("allows properties to be added on nested objects", function(){
		const observer = new FastObjectObserver({o: {}});
		expect(function(){
			observer.object.o.o = "aaaa";
		}).not.to.throw();
		expect(observer.object.o.o).to.equal("aaaa");
	});
	it("has the abilities for values to be set/changed/deleted without emitting an event", function(){
		const observer = new FastObjectObserver({});
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.setValue(["a"], "a");
			});
		expect(observer.object.a).to.equal("a");
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.setValue(["a"], "b");
			});
		expect(observer.object.a).to.equal("b");
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyDeleted", {count: 0})
			.on(() => {
				observer.setValue(["a"], undefined);
			});
		expect(observer.object).to.not.haveOwnProperty("a")
	});
	it("has the abilities for values to be set/changed/deleted without emitting an event (nested objects)", function(){
		const observer = new FastObjectObserver({o: {}});
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.setValue(["o", "a"], "a");
			});
		expect(observer.object.o.a).to.equal("a");
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.setValue(["o", "a"], "b");
			});
		expect(observer.object.o.a).to.equal("b");
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyDeleted", {count: 0})
			.on(() => {
				observer.setValue(["o", "a"], undefined);
			});
		expect(observer.object.o).to.not.haveOwnProperty("a")
	});
	it("has values silent set still observable", function(){
		const observer = new FastObjectObserver({});
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.setValue(["a"], "a");
			});
		expect(observer.object.a).to.equal("a");
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [["a"], "b"]})
			.on(() => {
				observer.object.a = "b";
			});
		expect(observer.object.a).to.equal("b");
	});
	it("has values silent set still observable (nested)", function(){
		const observer = new FastObjectObserver({o: {}});
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.setValue(["o", "a"], "a");
			});
		expect(observer.object.o.a).to.equal("a");
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [["o", "a"], "b"]})
			.on(() => {
				observer.object.o.a = "b";
			});
		expect(observer.object.o.a).to.equal("b");
	});
	it("allows you to emit an event anyway when directly setting the value", function(){
		const observer = new FastObjectObserver({o: {}});
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [["o", "a"], "a"]})
			.on(() => {
				observer.setValue(["o", "a"], "a", true);
			});
		expect(observer.object.o.a).to.equal("a");
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyDeleted", {withArgs: [["o", "a"]]})
			.on(() => {
				observer.setValue(["o", "a"], undefined, true);
			});
		expect(observer.object.o).to.not.haveOwnProperty("a");
	});
	it("has the abilities for values to be set/changed/deleted without emitting an event (arrays)", function(){
		const observer = new FastObjectObserver([]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.setValue([0], "a");
			});
		expect(observer.object).to.deep.equal(["a"]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.setValue([0], "b");
			});
		expect(observer.object).to.deep.equal(["b"]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyDeleted", {count: 0})
			.on(() => {
				observer.setValue(["length"], 0);
			});
			expect(observer.object).to.deep.equal([]);
	});
	it("has the abilities for values to be set/changed/deleted without emitting an event (nested arrays)", function(){
		const observer = new FastObjectObserver([[]]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.setValue([0, 0], "a");
			});
		expect(observer.object).to.deep.equal([["a"]]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.setValue([0, 0], "b");
			});
		expect(observer.object).to.deep.equal([["b"]]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.setValue([0, "length"], 0);
			});
			expect(observer.object).to.deep.equal([[]]);
	});
	it("has values silent set still observable (arrays)", function(){
		const observer = new FastObjectObserver([]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.setValue([0], "a");
			});
		expect(observer.object).to.deep.equal(["a"]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [[0], "b"]})
			.on(() => {
				observer.object[0] = "b";
			});
		expect(observer.object).to.deep.equal(["b"]);
	});
	it("has values silent set still observable (nested arrays)", function(){
		const observer = new FastObjectObserver([[]]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {count: 0})
			.on(() => {
				observer.setValue([0, 0], "a");
			});
		expect(observer.object).to.deep.equal([["a"]]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [[0, 0], "b"]})
			.on(() => {
				observer.object[0][0] = "b";
			});
		expect(observer.object).to.deep.equal([["b"]]);
	});
	it("allows you to emit an event anyway when directly setting the value (arrays)", function(){
		const observer = new FastObjectObserver([[]]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [[0, 0], "a"]})
			.on(() => {
				observer.setValue([0, 0], "a", true);
			});
		expect(observer.object).to.deep.equal([["a"]]);
	});
	it("only allows array-relevent values to be set to arrays", function(){
		const someSymbol = Symbol("something");
		const observer = new FastObjectObserver([]);
		observer.object[someSymbol] = "asdf";
		expect(observer.object[someSymbol]).to.equal(undefined);
		observer.object.asdf = "asdf";
		expect(observer.object.asdf).to.equal(undefined);
	});
	it("makes a \"hole-y\" array when a value is set to undefined", function(){
		const someSymbol = Symbol("something");
		const observer = new FastObjectObserver(["asdf"]);
		
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyDeleted", {withArgs: [[0]]})
			.on(() => {
				observer.object[0] = undefined;
			});
		expect(observer.object.length).to.equal(1);
		expect(observer.object).to.not.haveOwnProperty("0");
	});
	it("makes a \"hole-y\" array when a value is set to undefined", function(){
		const someSymbol = Symbol("something");
		const observer = new FastObjectObserver(["asdf"]);
		
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyDeleted", {withArgs: [[0]]})
			.on(() => {
				observer.object[0] = undefined;
			});
		expect(observer.object.length).to.equal(1);
		expect(observer.object).to.not.haveOwnProperty("0");
	});
	it("allows deleted objects to be re-added (arrays)", function(){
		const innerObject = {};
		const observer = new FastObjectObserver([]);
		expect(function(){
			observer.object[0] = innerObject;
			observer.object[0] = undefined;
			observer.object[0] = innerObject;
		}).not.to.throw();
	});
	it("allows objects that were replaced with other values to be re-added (arrays)", function(){
		const innerObject = {};
		const observer = new FastObjectObserver([]);
		expect(function(){
			observer.object[0] = innerObject;
			observer.object[0] = "asdf";
			observer.object[0] = innerObject;
		}).not.to.throw();
	});
	it("allows objects that were deleted with Array#pop or length setting to be re-added", function(){
		const innerObject = {};
		const observer = new FastObjectObserver([innerObject]);
		expect(function(){
			observer.object.pop();
			observer.object[0] = innerObject;
		}).not.to.throw();
		observer.object.push("asdf");
		// Senity check before part 2 of test
		expect(observer.object).to.deep.equal([innerObject, "asdf"]);
		expect(function(){
			observer.object.length = 0;
			observer.object[0] = innerObject;
		}).not.to.throw();
	});
	it("allows objects that were deleted with Array#splice to be re-added", function(){
		const innerObject = {};
		const observer = new FastObjectObserver(["a", "b", innerObject, "d"]);
		observer.object.splice(0, 3, "c");
		// Sanity test
		expect(observer.object).to.deep.equal(["c", "d"]);
		expect(function(){
			observer.object[0] = innerObject;
		}).not.to.throw();
	});
	it("has arrays with objects which correctly emit the right paths after being moved by Array#splice", function(){
		const observer = new FastObjectObserver(["a", "b", "c", "d", {a: "aaaa"}]);
		observer.object.splice(0, 4);
		// Sanity test
		expect(observer.object).to.deep.equal([{a: "aaaa"}]);
		expect(observer)
			.to.emit("error", {count: 0})
			.to.emit("propertyChanged", {withArgs: [[0, "a"], "asdf"]})
			.on(() => {
				observer.object[0].a = "asdf";
			});
	});

});
