declare module 'resonance-audio' {
  export interface ResonanceAudioOptions {
    ambisonicOrder?: number;
    dimensions?: {
      width: number;
      height: number;
      depth: number;
    };
    materials?: {
      left: string;
      right: string;
      front: string;
      back: string;
      down: string;
      up: string;
    };
  }

  export interface ResonanceAudioSource {
    input: AudioNode;
    setPosition(x: number, y: number, z: number): void;
    setOrientation(
      forwardX: number,
      forwardY: number,
      forwardZ: number,
      upX: number,
      upY: number,
      upZ: number
    ): void;
  }

  export class ResonanceAudio {
    output: AudioNode;
    
    constructor(context: AudioContext, options?: ResonanceAudioOptions);
    
    createSource(): ResonanceAudioSource;
    
    setRoomProperties(
      dimensions: { width: number; height: number; depth: number },
      materials: {
        left: string;
        right: string;
        front: string;
        back: string;
        down: string;
        up: string;
      }
    ): void;
    
    setListenerPosition(x: number, y: number, z: number): void;
    
    setListenerOrientation(
      forwardX: number,
      forwardY: number,
      forwardZ: number,
      upX: number,
      upY: number,
      upZ: number
    ): void;
  }
}