/* eslint-disable class-methods-use-this */
const {EventEmitter} = require("events");
const {isSafeProperty} = require("safeify-object");
const symbolObserver = Symbol.for("ca.aritzcracker.fast_object_observer");

/**
 * Creates a pure, deep copy of an observed object
 * @template T
 * @param {T} obj
 * @returns {T}
 */
const observedObjectToPureObject = function(obj){
	// return JSON.parse(JSON.stringify(obj)) // haha, can't do this cuz of bigints!!!!!
	if(typeof obj !== "object" || obj === null || !obj[symbolObserver]){
		return obj;
	}
	/** @type {FastObjectObserver} */
	const observer = obj[symbolObserver];
	const originalObject = observer._observedObject;
	/* istanbul ignore next */
	const result = Array.isArray(obj) ? [] : {};
	// No prototype pollution here! Properties have already been checked for safty ☺☺☺☺☺☺
	for(const k in originalObject){
		result[k] = observedObjectToPureObject(originalObject[k]);
	}
	return result;
};

/**
 * Nested object obserers, faster than proxies! (Except when using arrays)
 * @template T
 */
class FastObjectObserver extends EventEmitter {
	/**
	 * @param {T} observedObject the object to observe
	 * @param {FastObjectObserver} [parentObserver] internal
	 * @param {string | number} [parentObserverKey] internal
	 */
	constructor(observedObject = {}, parentObserver, parentObserverKey){
		super();
		if(observedObject[symbolObserver]){
			/* This hack is only used to facilitate Array#splice. Putting observed objects in observed objects can
			   really cause problems and is considered undefined behaviour */
			/** @type {FastObjectObserver} */
			const oldObserver = observedObject[symbolObserver];
			/* istanbul ignore next */
			if(parentObserver == null || oldObserver._rootObserver !== parentObserver._rootObserver){
				throw new Error("Attempted to put an observed object in an observed object");
			}
			observedObject = oldObserver._observedObject;
			const oldObservedObject = oldObserver.object;
			// Make old object observer useless
			for(const k in observedObject){
				oldObserver._deleteNestedObject(k);
			}
			oldObserver._observedObject = null;
			oldObserver._observedObjects.delete(observedObject);
			for(const k in oldObservedObject){
				delete oldObservedObject[k];
			}
		}


		/**
		 * @type {boolean}
		 * Whether or not proxy mode is being used
		 */
		this.proxyMode = Object.getPrototypeOf(observedObject) !== Object.prototype;
		if(
			this.proxyMode &&
			!Array.isArray(observedObject)
		){
			// TODO: Add support for Buffers, maybe.
			throw new TypeError("Currently only \"pure\" objects and arrays are supported");
		}

		const proxy = this.proxyMode ?
			new Proxy(observedObject, {
				get: (_, key) => {
					switch(key){
						case symbolObserver:
							return this;
						case "pop":
							/* This hack exists because normally, when the "length" set trapped is triggered, when
							Array#pop is called the array's value is _already_ deleted! Which means we're unable to know
							if the removed value was within of our list of this._observedObjects */
							return () => {
								const poppedVal = this._observedObject[this._observedObject.length - 1];
								this.object.length -= 1;
								return poppedVal;
							};
						case "splice":
							/* This hack exists for similar reasons as above */
							return (...args) => {
								/** @type {number} */
								const length = this._observedObject.length;
								const existingValues = new Set();
								// Calling splice on a copy first, otherwise _deleteNestedObject won't work
								/** @type {any[]} */
								const arrayCopy = this._observedObject.slice();
								const resultCopy = arrayCopy.splice(...args);
								for(let i = 0; i < arrayCopy.length; i += 1){
									const val = arrayCopy[i];
									// This is mainly for objects but w/e
									existingValues.add(val);
								}
								for(let i = 0; i < resultCopy.length; i += 1){
									// This must be done before _deleteNestedObject otherwise it won't work
									resultCopy[i] = observedObjectToPureObject(resultCopy[i]);
								}
								for(let i = 0; i < length; i += 1){
									const val = this._observedObject[i];
									if(!existingValues.has(val)){
										this._deleteNestedObject(i);
									}
								}
								for(let i = 0; i < arrayCopy.length; i += 1){
									// Emit the neccisary propery changed events
									this.object[i] = arrayCopy[i];
								}
								this.object.length = arrayCopy.length;
								return resultCopy;
							};
						default:
							return this._observedObject[key];
					}
				},
				set: (_, key, value) => {
					if(typeof key !== "string"){
						return false;
					}
					const keyNum = Number(key);
					if((isNaN(keyNum) || keyNum < 0 || (keyNum % 1) !== 0) && key !== "length"){
						return false;
					}
					const oldValue = this._observedObject[key];
					if(Object.is(oldValue, value)){
						return true;
					}
					this._deleteNestedObject(key);
					if(key === "length"){
						for(let i = this._observedObject.length - 1; i >= value; i -= 1){
							// Ensure any truncated object values are removed
							this._deleteNestedObject(i);
						}
					}
					if(value === undefined){
						delete this._observedObject[key];
						delete this.object[key];
						this._rootObserver.emit("propertyDeleted", this._objectPath.concat(
							/* istanbul ignore next */
							isNaN(keyNum) ? key : keyNum
						));
						return true;
					}
					this._observedObject[key] = value;
					this._observeNestedObject(isNaN(keyNum) ? key : keyNum);
					this._rootObserver.emit(
						"propertyChanged",
						this._objectPath.concat(isNaN(keyNum) ? key : keyNum),
						value
					);
					return true;
				}
			}) :
			new Proxy(observedObject, {
				get: (_, key) => {
					this._defineGetterSetter(key);
					return this._getterCallback(key);
				},
				set: (_, key, value) => {
					this._defineGetterSetter(key, true);
					return this._setterCallback(key, value);
				}
			});
		if(parentObserver == null){
			this._observedObjects = new Set([observedObject]);
			this._rootObserver = this;
			this._objectPath = [];
		}else{
			/** @private @type {Set} */
			this._observedObjects = parentObserver._observedObjects;
			if(this._observedObjects.has(observedObject)){
				throw new TypeError("Cannot observe a circular object");
			}
			this._observedObjects.add(observedObject);
			/** @private @type {FastObjectObserver} */
			this._rootObserver = parentObserver._rootObserver;
			/** @private @type {Array<string>} */
			this._objectPath = parentObserver._objectPath.concat(parentObserverKey);
		}
		this._observedObject = observedObject;
		/**
		 * @type {T}
		 * You want this. Change or add your peroperties here. If you want to delete a property, _DO NOT_ use the
		 * `delete` keyword. Set the property's value to `undefined`.
		 */
		this.object = this.proxyMode ? proxy : Object.create(proxy);
		if(this.proxyMode){
			for(const k in observedObject){
				this._observeNestedObject(Number(k));
			}
		}else{
			Object.defineProperty(this.object, symbolObserver, {
				configurable: false,
				value: this,
				writable: false
			});
			for(const k in observedObject){
				if(this.isInvalidProperty(k)){
					delete observedObject[k];
				}else{
					this._defineGetterSetter(k);
				}
			}
		}
	}
	/**
	 * Override this function to set your own property criteria
	 * @param {string | number} key
	 */
	isInvalidProperty(key){
		return !isSafeProperty(String(key));
	}
	/**
	 * @private
	 * @param {string | number} key
	 */
	_observeNestedObject(key){
		const obj = this._observedObject[key];
		if(typeof obj !== "object" || obj === null){
			return;
		}
		const observer = new FastObjectObserver(obj, this, key);
		this._observedObject[key] = observer.object;
	}
	_deleteNestedObject(key){
		const obj = this._observedObject[key];
		if(typeof obj !== "object" || obj === null || obj[symbolObserver] == null){
			return;
		}
		/** @type {FastObjectObserver} */
		const oldObserver = obj[symbolObserver];
		if(oldObserver._observedObject == null){
			return;
		}
		const observedObject = oldObserver._observedObject;
		// Make old object observer useless
		for(const k in observedObject){
			oldObserver._deleteNestedObject(k);
		}
		oldObserver._observedObject = null;
		oldObserver._observedObjects.delete(observedObject);
		for(const k in obj){
			delete obj[k];
		}
		delete this._observedObject[key];
	}
	/**
	 * @private
	 * @param {string} key
	 */
	_defineGetterSetter(key, force = false){
		if(this.isInvalidProperty(key)){
			return;
		}
		if(force || this._observedObject[key] !== undefined){
			this._observeNestedObject(key);
			Object.defineProperty(this.object, key, {
				configurable: true,
				enumerable: true,
				get: this._getterCallback.bind(this, key),
				set: this._setterCallback.bind(this, key)
			});
		}
	}
	/**
	 * @private
	 * @param {string} key
	 * @param {*} value
	 */
	_setterCallback(key, value){
		if(this.isInvalidProperty(key)){
			return false;
		}
		const oldValue = this._observedObject[key];
		if(Object.is(oldValue, value)){
			return true;
		}
		if(typeof oldValue === "object" && oldValue !== null && oldValue[symbolObserver] != null){
			this._deleteNestedObject(key);
		}
		if(value === undefined){
			delete this._observedObject[key];
			delete this.object[key];
			/**
			 * @event FastObjectObserver#propertyDeleted
			 * @param {Array<string | number>} path
			 */
			this._rootObserver.emit("propertyDeleted", this._objectPath.concat(key));
			return true;
		}
		this._observedObject[key] = value;
		this._observeNestedObject(key);
		/**
		 * @event FastObjectObserver#propertyChanged
		 * @param {Array<string | number>} path
		 */
		this._rootObserver.emit("propertyChanged", this._objectPath.concat(key), value);
		return true;
	}
	/**
	 * @private
	 * @param {string} key
	 */
	_getterCallback(key){
		return this._observedObject[key];
	}
	/**
	 * Allows you to set a value to an object without emitting the property change event
	 * @param {Array<string | number>} path
	 * @param {any} value
	 * @param {boolean} [emitEvent=false]
	 */
	setValue(path, value, emitEvent){
		let object = this.object;
		const curPath = path.slice().reverse();
		while(curPath.length > 1){
			const key = curPath.pop();
			object = object[key];
			/* istanbul ignore next */
			if(typeof object !== "object" || object === null){
				throw new Error("FastObjectObserver#setValue: Path leads to or includes a non-object");
			}
		}
		/** @type {FastObjectObserver} */
		const observer = object[symbolObserver];
		/* istanbul ignore next */
		if(observer == null){
			throw new Error("This shouldn't happen, attempted to set a value on an non-observed object");
		}
		const key = curPath.pop();
		const rawObject = observer._observedObject;
		const oldVal = rawObject[key];
		/* istanbul ignore next */
		if(Object.is(oldVal, value)){
			return;
		}
		if(value === undefined){
			delete rawObject[key];
			delete object[key];
			if(emitEvent){
				observer._rootObserver.emit("propertyDeleted", observer._objectPath.concat(key));
			}
		}
		rawObject[key] = value;
		if(!observer.proxyMode){
			observer._defineGetterSetter(key);
		}
		if(emitEvent){
			observer._rootObserver.emit("propertyChanged", observer._objectPath.concat(key), value);
		}
	}
}
module.exports = {FastObjectObserver, observedObjectToPureObject};
