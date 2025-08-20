const clientsByKey = new Map();

function getKey(userId, titleId) {
	return `${userId}:${titleId}`;
}

function addClient(userId, titleId, res) {
	const key = getKey(userId, titleId);
	if (!clientsByKey.has(key)) {
		clientsByKey.set(key, new Set());
	}
	clientsByKey.get(key).add(res);
}

function removeClient(userId, titleId, res) {
	const key = getKey(userId, titleId);
	const set = clientsByKey.get(key);
	if (set) {
		set.delete(res);
		if (set.size === 0) {
			clientsByKey.delete(key);
		}
	}
}

function emitTo(userId, titleId, eventName, data) {
	const key = getKey(userId, titleId);
	const set = clientsByKey.get(key);
	if (!set || set.size === 0) return;
	const payload = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
	for (const res of set) {
		try {
			res.write(payload);
		} catch (e) {
			// Best-effort
		}
	}
}

function emitData(userId, titleId, data) {
	emitTo(userId, titleId, 'message', data);
}

module.exports = {
	addClient,
	removeClient,
	emitTo,
	emitData
}; 