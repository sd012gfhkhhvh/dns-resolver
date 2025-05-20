import { BaseDNSComponent } from "./BaseDNSComponent";
import { OpCode, QR_FLAG, ResponseCode, type DNSHeaderType } from "../types";

/**
 * Represents a DNS header.
 *
 * A DNS header contains the request id, query response flag, query opcode, authoritative
 * answer flag, truncated flag, recursion desired flag, recursion available flag, reserved
 * flag, response code, number of questions, number of answers, number of authorities,
 * and number of additionals.
 */
export class DNSHeader extends BaseDNSComponent<DNSHeaderType> {
  id: number;
  qr: QR_FLAG;
  opcode: OpCode;
  aa: number;
  tc: number;
  rd: number;
  ra: number;
  z: number;
  rcode: ResponseCode;
  qdcount: number;
  ancount: number;
  nscount: number;
  arcount: number;
  /**
   * Constructs a DNSHeader with the given data.
   *
   * @param {Partial<DNSHeaderType>} [data={}] - The data to construct the DNSHeader with.
   * The following properties are supported:
   * - id: The request id.
   * - qr: The query response flag.
   * - opcode: The query opcode.
   * - aa: The authoritative answer flag.
   * - tc: The truncated flag.
   * - rd: The recursion desired flag.
   * - ra: The recursion available flag.
   * - z: The reserved flag.
   * - rcode: The response code.
   * - qdcount: The number of questions.
   * - ancount: The number of answers.
   * - nscount: The number of authorities.
   * - arcount: The number of additionals.
   */
  constructor(data: Partial<DNSHeaderType> = {}) {
    super();
    this.id = data.id ?? 0;
    this.qr = data.qr ?? QR_FLAG.QUERY;
    this.opcode = data.opcode ?? OpCode.STANDARD_QUERY;
    this.aa = data.aa ?? 0;
    this.tc = data.tc ?? 0;
    this.rd = data.rd ?? 0;
    this.ra = data.ra ?? 0;
    this.z = data.z ?? 0;
    this.rcode = data.rcode ?? ResponseCode.NO_ERROR;
    this.qdcount = data.qdcount ?? 0;
    this.ancount = data.ancount ?? 0;
    this.nscount = data.nscount ?? 0;
    this.arcount = data.arcount ?? 0;
  }

  /**
   * Encodes the DNS header into a 12 byte Buffer.
   *
   * The DNS header is structured as follows:
   * - The first 2 bytes is the id.
   * - The next 2 bytes are all the flags.
   *   - The qr flag is the first bit of the first byte.
   *   - The opcode is the next 4 bits.
   *   - The aa, tc, rd, ra, z, and rcode are the next 6 bits.
   * - The next 2 bytes are the qdcount.
   * - The next 2 bytes are the ancount.
   * - The next 2 bytes are the nscount.
   * - The final 2 bytes are the arcount.
   *
   * @returns {Buffer} The encoded DNS header.
   */
  encode(): Buffer {
    // The header is 12 bytes long
    const header = Buffer.alloc(12);
    // The first 2 bytes is the id
    header.writeUInt16BE(this.id, 0);
    // The next 2 bytes are all the flags
    // The qr flag is the first bit of the first byte
    // The opcode is the next 4 bits
    // The aa, tc, rd, ra, z, and rcode are the next 6 bits
    const flags =
      (this.qr << 15) |
      (this.opcode << 11) |
      (this.aa << 10) |
      (this.tc << 9) |
      (this.rd << 8) |
      (this.ra << 7) |
      (this.z << 4) |
      this.rcode;
    header.writeUInt16BE(flags, 2);
    // The next 2 bytes are the qdcount
    header.writeUInt16BE(this.qdcount, 4);
    // The next 2 bytes are the ancount
    header.writeUInt16BE(this.ancount, 6);
    // The next 2 bytes are the nscount
    header.writeUInt16BE(this.nscount, 8);
    // The final 2 bytes are the arcount
    header.writeUInt16BE(this.arcount, 10);
    return header;
  }

  /**
   * A static method to encode a DNS header from a raw object.
   *
   * @param data - The raw DNS header object.
   * @returns The encoded DNS header.
   */
  static encodeRaw(data: DNSHeaderType): Buffer {
    return new DNSHeader(data).encode();
  }

  /**
   * Converts the DNS header into a raw object.
   *
   * @returns The raw object representation of the DNS header.
   */
  toObject(): DNSHeaderType {
    return {
      id: this.id,
      qr: this.qr,
      opcode: this.opcode,
      aa: this.aa,
      tc: this.tc,
      rd: this.rd,
      ra: this.ra,
      z: this.z,
      rcode: this.rcode,
      qdcount: this.qdcount,
      ancount: this.ancount,
      nscount: this.nscount,
      arcount: this.arcount,
    };
  }

  /**
   * Decodes a DNS header from a Buffer.
   * @param data The Buffer to decode from.
   * @param offset The offset to start decoding from.
   * @returns An object with two properties: result and offset.
   * result is the decoded DNSHeader.
   * offset is the offset immediately after the decoded header.
   */
  static decode(
    buffer: Buffer,
    offset: number = 0
  ): { result: DNSHeader; nextOffset: number } {
    return {
      result: new DNSHeader({
        id: buffer.readUInt16BE(offset),
        qr: (buffer.readUInt16BE(offset + 2) >> 15) & 1,
        opcode: (buffer.readUInt16BE(offset + 2) >> 11) & 15,
        aa: (buffer.readUInt16BE(offset + 2) >> 10) & 1,
        tc: (buffer.readUInt16BE(offset + 2) >> 9) & 1,
        rd: (buffer.readUInt16BE(offset + 2) >> 8) & 1,
        ra: (buffer.readUInt16BE(offset + 2) >> 7) & 1,
        z: (buffer.readUInt16BE(offset + 2) >> 4) & 15,
        rcode: buffer.readUInt16BE(offset + 2) & 15,
        qdcount: buffer.readUInt16BE(offset + 4),
        ancount: buffer.readUInt16BE(offset + 6),
        nscount: buffer.readUInt16BE(offset + 8),
        arcount: buffer.readUInt16BE(offset + 10),
      }),
      nextOffset: offset + 12,
    };
  }
}
// NOTE: Pros of returning a class instance insatade of a raw object in decode method
// -Encapsulates logic — the class handles behavior (e.g., encode(), toObject()) and state.
// -You can call other instance methods later (e.g., validate(), clone()).
// -Easier to extend — add extra logic like lazy parsing or caching.

const testHeader = new DNSHeader({
  id: 1234,
  qr: QR_FLAG.RESPONSE,
  // qdcount: 1,
  // ancount: 1,
});

// console.log(testHeader.encode());
// const { result: decodedHeader, nextOffset: hOffset } = DNSHeader.decode(
//   testHeader.encode()
// );
// const obj = decodedHeader.toObject();
// console.log(obj);
