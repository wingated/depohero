class PCMProcessor extends AudioWorkletProcessor {

    //private buffer;//: Float32Array;
    //private writeIndex;//: number = 0;
    //private bufferSize;//: number = 4000; // 4000 samples = 16000 * 0.25 seconds

    constructor(options) {
        super();
        this.bufferSize = options.processorOptions.bufferSize || 4000;
        this.buffer = new Float32Array(this.bufferSize);
        this.writeIndex = 0;
    }

    process(inputs) {  // 
        const input = inputs[0][0]; // Single channel
        if (!input) return true;

        for (let i = 0; i < input.length; i++) {
            this.buffer[this.writeIndex++] = input[i];

            if (this.writeIndex >= this.bufferSize) {
                // Convert buffer to 16-bit PCM
                const pcm16 = new Int16Array(this.bufferSize);
                for (let j = 0; j < this.bufferSize; j++) {
                    pcm16[j] = Math.max(-32768, Math.min(32767, this.buffer[j] * 32768));
                }
                this.port.postMessage(pcm16);
                this.writeIndex = 0; // Reset buffer index
            }
        }
        return true;
    }
}

registerProcessor("pcm-processor", PCMProcessor);