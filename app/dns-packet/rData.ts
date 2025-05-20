import { RecordType, type RDataType } from "../types";
import { decodeDomainName, encodeDomainName } from "../utils";

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
  offset: number,
  type: RecordType,
  rdlength: number
): RDataType {
  // const rDataBuffer = buffer.subarray(offset, offset + rdlength); // extract the rdata buffer
  const data: RDataType = typeMap[type].decodeFn(buffer, offset, rdlength);
  return data;
}

/**
 * Decodes a DNS A record from a Buffer.
 *
 * @param buffer The Buffer containing the A record.
 * @returns The decoded A record as a string.
 */
export function decodeARecord(
  buffer: Buffer,
  offset: number,
  rdlength: number
): string {
  const rDataBuffer = buffer.subarray(offset, offset + rdlength);
  return rDataBuffer.map((byte) => byte).join("."); // no need for explicit toString as map converts them into decimal digits and then join method converts them into string
}

export function decodeAAAARecord(
  buffer: Buffer,
  offset: number,
  rdlength: number
): string {
  const rDataBuffer = buffer.subarray(offset, offset + rdlength);
  return rDataBuffer.map((byte) => byte).join(":");
}

export function decodeCNAMERecord(
  buffer: Buffer,
  offset: number,
  rdlength: number
): string {
  const { domainName } = decodeDomainName(buffer, offset);
  return domainName;
}

export function decodeNSRecord(
  buffer: Buffer,
  offset: number,
  rdlength: number
): string {
  const { domainName } = decodeDomainName(buffer, offset);
  return domainName;
}

export function decodeTXTRecord(
  buffer: Buffer,
  offset: number,
  rdlength: number
): string {
  const rDataBuffer = buffer.subarray(offset, offset + rdlength);
  return rDataBuffer.map((byte) => String.fromCharCode(byte)).join("");
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

export function encodeAAAARecord(address: string): Buffer {
  const octets = address.split(":").map((octet) => parseInt(octet, 16));
  return Buffer.from(octets);
}

export function encodeCNAMERecord(domainName: string): Buffer {
  return encodeDomainName(domainName);
}

export function encodeNSRecord(domainName: string): Buffer {
  return encodeDomainName(domainName);
}

export function encodeTXTRecord(data: string): Buffer {
  const bytes = data.split("").map((char) => char.charCodeAt(0));
  return Buffer.from(bytes);
}

// typeMap ----------------------------------
export const typeMap: {
  [key in RecordType]: {
    decodeFn: (buffer: Buffer, offset: number, rdlength: number) => RDataType;
    encodeFn: (data: RDataType) => Buffer;
  };
} = {
  [RecordType.A]: { decodeFn: decodeARecord, encodeFn: encodeArecord },
  [RecordType.AAAA]: { decodeFn: decodeAAAARecord, encodeFn: encodeAAAARecord },
  [RecordType.NS]: {
    decodeFn: decodeNSRecord,
    encodeFn: encodeNSRecord,
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
    decodeFn: decodeCNAMERecord,
    encodeFn: encodeCNAMERecord,
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
    decodeFn: decodeTXTRecord,
    encodeFn: encodeTXTRecord,
  },
};
