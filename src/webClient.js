const { wait, EventBus, isSupported } = require('./webUtils');
const { EventType } = require('./types');

const Status = {
	Connected: 0,
	Disconnected: 0
};

const WebClient = function(options) {
	if(!isSupported()) {
		return;
	}

	const bus = new EventBus();
	let status = Status.Disconnected;
	let driver = null;

	const send = (type, data) => {
		if(status === Status.Connected && driver?.send) {
			const event = { type, data };
			driver.send(JSON.stringify(event));
		}
	};

	const connect = () => {
		return new Promise((resolve) => {
			driver = new WebSocket(options.host, options.protocol);

			driver.onerror = (error) => {
				console.error('WebSocker connection error', error);
				resolve(false);
			};

			driver.onopen = () => {
				status = Status.Connected;
				send(EventType.Init, {
					pid: options.pid
				});
				resolve(true);
			};

			driver.onclose = (event) => {
				driver = null;
				status = Status.Disconnected;

				if(!event.wasClean) {
					reconnect();
				}
			};

			driver.onmessage = (event) => {
				const event = JSON.parse(event.data);
				bus.trigger(event);
			};
		});
	};

	const reconnect = async () => {
		while(status !== Status.Connected) {
			await wait(3000);
			await connect();
		}
	};

	this.connect = async () => {
		await connect();
	};

	this.disconnect = () => {
		status = Status.Disconnected;
		driver.close();
	};

	this.send = (type, data) => {
		send(type, data);
	};

	this.addListener = (type, callback) => {
		bus.add(type, callback);
	};

	this.removeListener = (type, callback) => {
		bus.remove(type, callback);
	};
};

WebClient.supported = isSupported;

module.exports = WebClient;