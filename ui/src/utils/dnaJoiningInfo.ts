import { decode, encode } from "@msgpack/msgpack";

export interface DnaJoiningInfo {
  originalDnaHash: Uint8Array;
  name: string;
  networkSeed: string;
}

// Encode a dna clone description as a base64 string for easily sharing
export const encodeDnaJoiningInfo = (originalDnaHash: Uint8Array, name: string, networkSeed: string): string =>  {
  console.log({originalDnaHash, name, networkSeed});
  const val = btoa(String.fromCharCode.apply(null, encode({originalDnaHash, name, networkSeed})));
  console.log(val);
  console.log(encode(originalDnaHash));
  return val;
}

// Decode base64 string back to clone description
export const decodeDnaJoiningInfo = (shareCode: string): DnaJoiningInfo => {
  const val = decode(new Uint8Array(atob(shareCode).split("").map((c) => c.charCodeAt(0)))) as DnaJoiningInfo;
  console.log(val);
  return val;
}
