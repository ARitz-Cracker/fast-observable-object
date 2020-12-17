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