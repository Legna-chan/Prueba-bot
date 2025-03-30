export class Cache extends Map {
    /**
     * El intervalo en el que se ejecutará una función que eliminará todas las keys que ya expiraron, por defecto es 0 (La función no se ejecuta)
     * @param {number} interval 
     */
    constructor(interval = 0) {
        super();
        /**
         * @type {number}
         */
        this.interval = interval;
        /**
         * @type {Map<string, number>}
         */
        this.expirationTimes = new Map();
        if (interval > 0) {
            this.startExpirationInterval();
        }
    }
    startExpirationInterval() {
        if (this.expirationInterval === null && this.interval > 0) {
            this.expirationInterval = setInterval(() => {
                const now = Date.now();
                this.expirationTimes.forEach((ttl, key) => {
                    if (now > ttl) {
                        this.expirationTimes.delete(key);
                        super.delete(key);
                    }
                });
                if (this.expirationTimes.size === 0) {
                    clearInterval(this.expirationInterval);
                    this.expirationInterval = null;
                }
            }, this.interval);
        }
    }
    set(key, data, ttl = this.interval) {
        super.set(key, data);
        const expirationTime = Date.now() + ttl;
        this.expirationTimes.set(key, expirationTime);
        this.startExpirationInterval();
        return this;
    }
    get(key) {
        const expirationTime = this.expirationTimes.get(key);
        if (Date.now() > expirationTime) {
            this.expirationTimes.delete(key);
            super.delete(key);
            return undefined;
        }
        return super.get(key);
    }
    delete(key) {
        this.expirationTimes.delete(key);
        return super.delete(key);
    }
    clear() {
        this.expirationTimes.clear();
        super.clear();
    }
}

export class CacheLRU extends Map {
    /**
     * El límite de keys que se almacenará en el cache, por defecto es 100
     * @param {number} capacity 
     */
    constructor(capacity = 100) {
        super();
        this.capacity = capacity;
    }
    get(key) {
        if (!super.has(key)) {
            return undefined;
        }
        const value = super.get(key);
        super.delete(key);
        super.set(key, value);
        return value;
    }
    set(key, value) {
        if (super.size >= this.capacity) {
            super.delete(super.keys().next().value);
        }
        super.set(key, value);
        return this;
    }
}