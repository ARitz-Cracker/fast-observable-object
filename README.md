# fast-observable-object

Are proxies too _slow_ for you? Well, they are for me! In fact, Getter/setter functions are over 20 times faster! One
issue, you can only use them to listen to changing properties which have already been defined, while proxies allow you
to listen to any property access, including those which don't exist. One day, I had an amazing idea: What if, through
the magic of JS prototypes, I used _both_?!

What you see here is me doing exactly that.

```js
const {FastObjectObserver} = require("fast-observable-object");
const observer = new FastObjectObserver({
	prop: "value"
});
const observedObject = observer.object;
observedObject.prop = "other value"; // emits observer#propertyChanged(["prop"], "other value");
observedObject.nestedObject = {hello: "world!"}; // emits observer#propertyChanged(["nestedObject"], {hello: "world!"});
observedObject.nestedObject.hello = "everyone!"; // emits observer#propertyChanged(["nestedObject", "hello"], "everyone!");
// DO NOT use the delete keyword to delete properties
observedObject.nestedObject = undefined; // emits observer#propertyDeleted(["nestedObject"]);
```

Documentation will be uploaded to my website as soon that's up. There's still JSDoc comments all over the source,
though. So you should be fine.

There should be some things you should know, though.

* Only JSON-able objects as well as BigInts are supported. So no Buffers, Dates, or anything like that.
* Circular values or objects being in multiple places isn't allowed.
* Putting an observed object inside another observed object is undefined behaviour and shouldn't be done
* Child observe objects which have been deleted from their parent will be effectively unusable (or broken) afterwards.
* Note while this library can observe array's, they will be extremly slow compared to normal objects, as getter/setter functions cannot be defined on array's. Also note some additional pitfalls with arrays
  * Array#splice will always return a _copy_ of nested objects which have been removed
  * Array#copyWithin is undefined behaviour when moving objects around
  * Any Array function returns a copy of the array, while not modifying the observed array like Array#concat and Array#slice will not create a copy of nested objects, as long as such objects still exist within the original array they will still be observed
