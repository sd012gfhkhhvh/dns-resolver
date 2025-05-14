export enum OpCode {
  /**
   * Standard query, response to query.
   */
  STANDARD_QUERY = 0,
}
export enum ResponseCode {
  /**
   * No error condition.
   */
  NO_ERROR = 0,
  /**
   * Format error - The name server was unable to interpret the query.
   */
  FORMAT_ERROR = 1,
}
export interface TDNSHeader {
  /**
   * The identification number copied the query and response.
   */
  id: number;
  /**
   * A one bit field that specifies whether this message is a query (0), or a response (1).
   */
  qr: number;
  /**
   * A four bit field that specifies kind of query in this message.
   * This value is set by the originator of a query
   * and copied into the response.
   */
  opcode: OpCode;
  /**
   * Authoritative Answer - this bit is valid in responses,
   * and specifies that the responding name server is an authority for the domain name in question section.
   */
  aa: number;
  /**
   * TrunCation - specifies that this message was truncated.
   */
  tc: number;
  /**
   * Recursion Desired - this bit may be set in a query
   * and is copied into the response.
   * If RD is set, it directs the name server to pursue the query recursively.
   * Recursive query support is optional.
   */
  rd: number;
  /**
   * Recursion Available - this be is set or cleared in a response
   * as a hint to the name server whether recursive query support is available
   * in the name server.
   */
  ra: number;
  /**
   * Reserved for future use.  Must be zero in all queries and responses.
   */
  z: number;
  /**
   * Response code - this 4 bit field is set as part of
   * responses.  The values have the following interpretation:
   */
  rcode: ResponseCode;
  /**
   * an unsigned 16 bit integer that specifies the number of entries in the question section.
   */
  qdcount: number;
  /**
   * an unsigned 16 bit integer that specifies the number of resource records in the answer section.
   */
  ancount: number;
  /**
   * an unsigned 16 bit integer that specifies the number of name server resource records in the authority records section.
   */
  nscount: number;
  /**
   * an unsigned 16 bit integer that specifies the number of resource records in the additional records section.
   */
  arcount: number;
}
export class DNSHeader {
  id: number = 0;
  qr: number = 0;
  opcode: OpCode = OpCode.STANDARD_QUERY;
  aa: number = 0;
  tc: number = 0;
  rd: number = 0;
  ra: number = 0;
  z: number = 0;
  rcode: ResponseCode = ResponseCode.NO_ERROR;
  qdcount: number = 0;
  ancount: number = 0;
  nscount: number = 0;
  arcount: number = 0;
  constructor(partial: Partial<TDNSHeader> = {}) {
    Object.assign(this, partial);
  }

  encode(): Buffer {
    // The header is 12 bytes long
    const header = Buffer.alloc(12);
    // The first 2 bytes is the id
    header.writeInt16BE(this.id, 0);
    // The next 2 bytes are all the flags
    // The qr flag is the first bit of the first byte
    // The opcode is the next 4 bits
    // The aa, tc, rd, ra, z, and rcode are the next 6 bits
    const flags =
      this.qr |
      this.opcode |
      this.aa |
      this.tc |
      this.rd |
      this.ra |
      this.z |
      this.rcode;
    header.writeInt16BE(flags, 2);
    // The next 2 bytes are the qdcount
    header.writeInt16BE(this.qdcount, 4);
    // The next 2 bytes are the ancount
    header.writeInt16BE(this.ancount, 6);
    // The next 2 bytes are the nscount
    header.writeInt16BE(this.nscount, 8);
    // The final 2 bytes are the arcount
    header.writeInt16BE(this.arcount, 10);
    return header;
  }
}
export default DNSHeader;

