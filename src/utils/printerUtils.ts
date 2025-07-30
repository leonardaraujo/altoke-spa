// @ts-nocheck
/// <reference types="web-bluetooth" />
import usePrinterStore from "../store/printerStore";
export const connectToPrinter = async () => {
	return new Promise((resolve, reject) => {
		navigator.bluetooth
			.requestDevice({
				filters: [
					{
						services: ["000018f0-0000-1000-8000-00805f9b34fb"],
					},
				],
			})
			.then((device) => device.gatt?.connect())
			.then((server) =>
				server?.getPrimaryService("000018f0-0000-1000-8000-00805f9b34fb"),
			)
			.then((service) =>
				service?.getCharacteristic("00002af1-0000-1000-8000-00805f9b34fb"),
			)
			.then((toggleChar) => {
				usePrinterStore.getState().connect(toggleChar);
				resolve(toggleChar);
			})
			.catch((err) => {
				usePrinterStore.getState().disconnect();
				reject(err);
			});
	});
};

export const writeData = async (
	arrayBytes: Uint8Array,
	toggleCharacteristic: BluetoothRemoteGATTCharacteristic | null,
) => {
	if (!toggleCharacteristic) {
		return Promise.reject(new Error("Característica Bluetooth no disponible"));
	}

	// Tamaño máximo recomendado para los chunks (ajustar según necesidad)
	const maxChunkSize = 200;

	// Tiempo de espera entre chunks (ms)
	const delayBetweenChunks = 350;

	return new Promise<boolean>((resolve, reject) => {
		// Función para escribir un chunk con manejo de errores mejorado
		const writeChunk = async (
			chunk: Uint8Array,
			retryCount = 0,
		): Promise<boolean> => {
			try {
				await toggleCharacteristic.writeValue(chunk);
				return true;
			} catch (error) {
				// Intentar nuevamente hasta 3 veces antes de fallar
				if (retryCount < 3) {
					console.warn(
						`Error al escribir chunk, reintentando... (${retryCount + 1}/3)`,
					);
					await new Promise((r) => setTimeout(r, 500)); // Esperar antes de reintentar
					return writeChunk(chunk, retryCount + 1);
				}

				console.error("Error al escribir en la impresora:", error);
				usePrinterStore.getState().disconnect();
				reject(error);
				return false;
			}
		};

		// Función para enviar todos los chunks secuencialmente
		const sendChunks = async (chunks: Uint8Array[]): Promise<void> => {
			for (let i = 0; i < chunks.length; i++) {
				const success = await writeChunk(chunks[i]);
				if (!success) return; // Si hay un error, detener el proceso

				// Si no es el último chunk, esperar antes de enviar el siguiente
				if (i < chunks.length - 1) {
					await new Promise((r) => setTimeout(r, delayBetweenChunks));
				}
			}
			resolve(true);
		};

		// Dividir los datos en chunks
		const chunks: Uint8Array[] = [];

		if (arrayBytes.byteLength > maxChunkSize) {
			for (let i = 0; i < arrayBytes.byteLength; i += maxChunkSize) {
				const end = Math.min(i + maxChunkSize, arrayBytes.byteLength);
				chunks.push(arrayBytes.slice(i, end));
			}
		} else {
			chunks.push(arrayBytes);
		}

		// Iniciar el envío de chunks
		sendChunks(chunks).catch(reject);
	});
};
