export enum OpCode {
  /**
   * Standard query, response to query.
   */
  STANDARD_QUERY = 0,
  /**
   * Inverse query.
   */
  INVERSE_QUERY = 1,
  /**
   * Server status request.
   */
  SERVER_STATUS = 2,
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
  /**
   * Server failure - The name server was unable to process this query due to a problem with the name server.
   */
  SERVER_FAILURE = 2,
  /**
   * Name Error - Meaningful only for responses from an authoritative name server, this code signifies that the domain name referenced in the query does not exist.
   */
  NAME_ERROR = 3,
  /**
   * Not Implemented - The name server does not support the requested kind of query.
   */
  NOT_IMPLEMENTED = 4,
  /**
   * Refused - The name server refuses to perform the specified operation for policy reasons. For example, a name server may not wish to provide the information to the particular requester, or a name server may not wish to perform a particular operation (e.g., zone transfer) for particular data.
   */
  REFUSED = 5,
}
export interface TDNSHeader {
  /**
   * A 16 bit identifier assigned by the program that generates any kind of query.
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
   * Recursion Available - this be is set or cleared in a response,
   * and denotes whether recursive query support is available in the name server.
   */
  ra: number;
  /**
   * Reserved for future use.
   * Must be zero in all queries and responses.
   */
  z: number;
  /**
   * Response code - this 4 bit field is set as part of
   * responses.
   * The values have the following interpretation:
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
      this.qr << 15 |
      this.opcode << 11 |
      this.aa << 10 |
      this.tc << 9 |
      this.rd << 8 |
      this.ra << 7 |
      this.z << 4 |
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

