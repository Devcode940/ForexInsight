// Type declarations for the 'wav' npm package.
// The package doesn't ship its own types, so we declare the minimal
// surface area we actually use.

declare module 'wav' {
  import { Writable } from 'stream';

  export interface WriterOptions {
    channels?: number;
    sampleRate?: number;
    bitDepth?: number;
    format?: number;
  }

  export class Writer extends Writable {
    constructor(options?: WriterOptions);
  }

  export class Reader extends Writable {
    constructor(options?: WriterOptions);
  }
}
