class PCMProcessor extends AudioWorkletProcessor {
    process(inputs: Float32Array[][]) {
        const input = inputs[0][0]; // Single channel

        if (input) {
            const pcm16 = new Int16Array(input.length);
            for (let i = 0; i < input.length; i++) {
                pcm16[i] = Math.max(-32768, Math.min(32767, input[i] * 32768)); // Convert float to int16
            }
            this.port.postMessage(pcm16);
        }
        return true;
    }
}

registerProcessor("pcm-processor", PCMProcessor);