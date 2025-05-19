import { RecordType, type RDataType } from "../types";

// -------------------------------- decodeRecordData ----------------------------------

/**
 * Decodes DNS record data from a Buffer.
 *
 * @param buffer The Buffer containing the DNS packet.
 * @param offset The offset into the Buffer where the record data starts.
 * @param type The type of the resource record.
 * @param rdlength The length of the rdata field.
 * @returns The decoded record data.
 */
export function decodeRecordData(
  buffer: Buffer,
  offset: number = 0,
  type: RecordType,
  rdlength: number
): RDataType {
  const rDataBuffer = buffer.subarray(offset, offset + rdlength); // extract the rdata buffer
  const data: RDataType = typeMap[type].decodeFn(rDataBuffer);
  return data;
}

/**
 * Decodes a DNS A record from a Buffer.
 *
 * @param buffer The Buffer containing the A record.
 * @returns The decoded A record as a string.
 */
export function decodeARecord(buffer: Buffer): string {
  return buffer.map((byte) => byte).join("."); // no need for explicit toString as map converts them into decimal digits and then join method converts them into string
}

// -------------------------------- encodeRecordData ----------------------------------

/**
 * Encodes DNS record data into a Buffer.
 *
 * @param data The record data to encode.
 * @param type The type of the resource record.
 * @returns The encoded record data as a Buffer.
 */
export function encodeRecordData(data: RDataType, type: RecordType): Buffer {
  const buffer = typeMap[type].encodeFn(data);
  return buffer;
}

/**
 * Encodes a DNS A record from a string.
 *
 * @param address The address to encode, in dotted decimal notation.
 * @returns The encoded A record as a Buffer.
 */
export function encodeArecord(address: string): Buffer {
  const octets = address.split(".").map((octet) => parseInt(octet));
  return Buffer.from(octets);
}

// typeMap ----------------------------------
export const typeMap: {
  [key in RecordType]: {
    decodeFn: (buffer: Buffer) => RDataType;
    encodeFn: (data: RDataType) => Buffer;
  };
} = {
  [RecordType.A]: { decodeFn: decodeARecord, encodeFn: encodeArecord },
  [RecordType.NS]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.MD]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.MF]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.CNAME]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.SOA]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.MB]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.MG]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.MR]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.NULL]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.WKS]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.PTR]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.HINFO]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.MINFO]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.MX]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
  [RecordType.TXT]: {
    decodeFn: (buffer: Buffer): RDataType => "Method not implemented",
    encodeFn: (data: RDataType): Buffer => Buffer.from([0]),
  },
};
