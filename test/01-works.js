/* eslint-disable prefer-arrow-callback */
/* eslint-disable no-magic-numbers */
const chai = require("chai");
chai.use(require("chai-as-promised"));
chai.use(require("chai-eventemitter"));
const expect = chai.expect;

const {FastObjectObserver} = require("../index");
describe("Observable objects", function(){
	it("observes when properties are changed", function(){
		const observer = new FastObjectObserver({});
		expect(function(){
			observer.object.a = "aa";
		}).to.emitFrom(observer, "propertyChanged", ["a"], "aa");
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
		expect(function(){
			observer.object.a = undefined;
		}).to.not.emitFrom(observer, "propertyChanged");
	});
	it("emits a deletion event when a property is deleted (set to undefiend)", function(){
		const observer = new FastObjectObserver({a: "aa"});
		expect(function(){
			observer.object.a = undefined;
		}).to.emitFrom(observer, "propertyDeleted", ["a"]);
	});
	it("works with pre-defined nested objects", function(){
		const observer = new FastObjectObserver({o: {a: "aa"}});
		expect(function(){
			observer.object.o.a = "bb";
		}).to.emitFrom(observer, "propertyChanged", ["o", "a"], "bb");
	});
	it("works with objects defined in runtime", function(){
		const observer = new FastObjectObserver({});
		expect(function(){
			observer.object.o = {a: "aa"};
		}).to.emitFrom(observer, "propertyChanged", ["o"], {a: "aa"});
		expect(function(){
			observer.object.o.a = "bb";
		}).to.emitFrom(observer, "propertyChanged", ["o", "a"], "bb");
	});
	it("FIXME? throws when circular objects are attempted to be observed", function(){
		// This is only because I don't want to deal with the paths and shit changing rn
		const originalObject = {};
		const observer = new FastObjectObserver(originalObject);
		expect(function(){
			observer.object.o = originalObject;
		}).to.throw("Cannot observe a circular object");
	});

	it("FIXME? throws when non-pure objects are observed", function(){
		// Maybe add an exception for buffers and arrays, anything else would be too big of a headache
		const observer = new FastObjectObserver({});
		expect(function(){
			observer.object.o = [];
		}).to.throw("only \"pure\" objects are supported");
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
		expect(function(){
			observer.object.o.a = "aa";
		}).to.not.emitFrom(observer, "propertyChanged");
	});
	it("allows deleted objects to be re-added", function(){
		const innerObject = {};
		const observer = new FastObjectObserver();
		expect(function(){
			observer.object.o = innerObject;
			observer.object.o = undefined;
			observer.object.o = innerObject;
		}).to.throw();
	});
});
