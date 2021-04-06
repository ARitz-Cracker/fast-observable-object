/* eslint-disable class-methods-use-this */
const {EventEmitter} = require("events");
const {isSafeProperty} = require("safeify-object");
const symbolObserver = Symbol.for("ca.aritzcracker.fast_object_observer");
class FastObjectObserver extends EventEmitter {
	/**
	 * @param {Object} observedObject the object to
	 * @param {FastObjectObserver} parentObserver
	 * @param {string} parentObserverKey
	 */
	constructor(observedObject = {}, parentObserver, parentObserverKey){
		super();
		const proxy = new Proxy(observedObject, {
			get: (proxyTarget, key) => {
				this._defineGetterSetter(key);
				return this._getterCallback(key);
			},
			set: (proxyTarget, key, value) => {
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
		 * You want this. Change or add your peroperties here. If you want to delete a property, _DO NOT_ use the
		 * `delete` keyword. Set the property's value to `undefined`.
		 */
		this.object = Object.create(proxy);
		Object.defineProperty(this.object, symbolObserver, {
			value: this,
			configurable: false,
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
	/**
	 * Override this function to set your own property criteria
	 * @param {string} key
	 */
	isInvalidProperty(key){
		return !isSafeProperty(key);
	}
	/**
	 * @private
	 * @param {string} key
	 */
	_observeNestedObject(key){
		const obj = this._observedObject[key];
		if(typeof obj !== "object" || obj === null){
			return;
		}
		if(Object.getPrototypeOf(obj) !== Object.prototype){
			// TODO: Add support for Arrays and Buffers, maybe. Those must use proxies so using them would be very slow
			throw new TypeError("Currently only \"pure\" objects are supported");
		}
		const observer = new FastObjectObserver(obj, this, key);
		this._observedObject[key] = observer.object;
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
		if(value === undefined){
			if(typeof oldValue === "object" && oldValue !== null && oldValue[symbolObserver] != null){
				this._observedObjects.delete(oldValue[symbolObserver]._observedObject);
			}
			delete this._observedObject[key];
			delete this.object[key];
			/**
			 * @event FastObjectObserver#propertyDeleted
			 * @param {Array<string>} path
			 */
			this._rootObserver.emit("propertyDeleted", this._objectPath.concat(key));
			return true;
		}
		this._observedObject[key] = value;
		if(typeof value === "object" && value !== null){
			this._observeNestedObject(key);
		}
		/**
		 * @event FastObjectObserver#propertyChanged
		 * @param {Array<string>} path
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
}
module.exports = {FastObjectObserver};
