class Cache {
    constructor() {
        this.store = new Map();
    }

    set(key, value, ttl) {
        const expiry = ttl > 0 ? Date.now() + ttl : null;
        this.store.set(key, { value, expiry });
        console.log(`📦 Cache SET: ${key} (TTL: ${ttl > 0 ? ttl / 1000 + 's' : 'infinite'})`);
    }

    get(key) {
        const item = this.store.get(key);
        if (!item) {
            console.log(`❌ Cache MISS: ${key}`);
            return null;
        }

        if (item.expiry && Date.now() > item.expiry) {
            this.store.delete(key);
            console.log(`⏰ Cache EXPIRED: ${key}`);
            return null;
        }

        console.log(`✅ Cache HIT: ${key}`);
        return item.value;
    }

    clear() {
        this.store.clear();
        console.log('🧹 Cache cleared');
    }

    size() {
        return this.store.size;
    }
}

module.exports = new Cache();
