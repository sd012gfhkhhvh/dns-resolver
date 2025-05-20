export enum QR_FLAG {
  QUERY = 0,
  RESPONSE = 1,
}

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
export interface DNSHeaderType {
  /**
   * A 16 bit identifier assigned by the program that generates any kind of query.
   */
  id?: number;
  /**
   * A one bit field that specifies whether this message is a query (0), or a response (1).
   */
  qr?: number;
  /**
   * A four bit field that specifies kind of query in this message.
   * This value is set by the originator of a query
   * and copied into the response.
   */
  opcode?: OpCode;
  /**
   * Authoritative Answer - this bit is valid in responses,
   * and specifies that the responding name server is an authority for the domain name in question section.
   */
  aa?: number;
  /**
   * TrunCation - specifies that this message was truncated.
   */
  tc?: number;
  /**
   * Recursion Desired - this bit may be set in a query
   * and is copied into the response.
   * If RD is set, it directs the name server to pursue the query recursively.
   * Recursive query support is optional.
   */
  rd?: number;
  /**
   * Recursion Available - this be is set or cleared in a response,
   * and denotes whether recursive query support is available in the name server.
   */
  ra?: number;
  /**
   * Reserved for future use.
   * Must be zero in all queries and responses.
   */
  z?: number;
  /**
   * Response code - this 4 bit field is set as part of
   * responses.
   * The values have the following interpretation:
   */
  rcode?: ResponseCode;
  /**
   * an unsigned 16 bit integer that specifies the number of entries in the question section.
   */
  qdcount?: number;
  /**
   * an unsigned 16 bit integer that specifies the number of resource records in the answer section.
   */
  ancount?: number;
  /**
   * an unsigned 16 bit integer that specifies the number of name server resource records in the authority records section.
   */
  nscount?: number;
  /**
   * an unsigned 16 bit integer that specifies the number of resource records in the additional records section.
   */
  arcount?: number;
}

/**
 * The structure of a DNS question.
 *
 * A DNS question is a request for information about a specific resource record.
 * It contains the domain name, type, and class of the resource record.
 */
export interface DNSQuestionType {
  /**
   * The domain name of the resource record.
   */
  name?: string;
  /**
   * The type of the resource record.
   */
  type?: RecordType;
  /**
   * The class of the resource record.
   */
  class?: RecordClass;
}

/**
 * The structure of a DNS answer.
 *
 * A DNS answer is a resource record that answers a DNS query.
 * It contains the domain name, type, class, TTL, rdlength, and rdata.
 * The rdata depends on the type of the resource record.
 */
export interface DNSAnswerType {
  /**
   * The domain name of the resource record.
   */
  name?: string;
  /**
   * The type of the resource record.
   */
  type?: RecordType;
  /**
   * The class of the resource record.
   */
  class?: RecordClass;
  /**
   * The time to live of the resource record in seconds.
   */
  ttl?: number;
  /**
   * The length of the rdata field in octets.
   */
  rdlength?: number;
  /**
   * The data for the resource record.
   */
  rdata?: RDataType;
}

export type RDataType = string; // TODO: add more types for different record types

/**
 * The possible types of resource records.
 */
export enum RecordType {
  /**
   * a host address
   */
  A = 1,
  /**
   * an authoritative name server
   */
  NS = 2,
  /**
   * a mail destination (Obsolete - use MX)
   */
  MD = 3,
  /**
   * a mail forwarder (Obsolete - use MX)
   */
  MF = 4,
  /**
   * the canonical name for an alias
   */
  CNAME = 5,
  /**
   * marks the start of a zone of authority
   */
  SOA = 6,
  /**
   * a mailbox domain name (EXPERIMENTAL)
   */
  MB = 7,
  /**
   * a mail group member (EXPERIMENTAL)
   */
  MG = 8,
  /**
   * a mail rename domain name (EXPERIMENTAL)
   */
  MR = 9,
  /**
   * a null RR (EXPERIMENTAL)
   */
  NULL = 10,
  /**
   * a well known service description
   */
  WKS = 11,
  /**
   * a domain name pointer
   */
  PTR = 12,
  /**
   * host information
   */
  HINFO = 13,
  /**
   * mailbox or mail list information
   */
  MINFO = 14,
  /**
   * mail exchange
   */
  MX = 15,
  /**
   * text strings
   */
  TXT = 16,

  /**
   * IPv6 address
   */
  AAAA = 28,
}

export enum RecordTypeString {
  A = "A",
  NS = "NS",
  MD = "MD",
  MF = "MF",
  CNAME = "CNAME",
  SOA = "SOA",
  MB = "MB",
  MG = "MG",
  MR = "MR",
  NULL = "NULL",
  WKS = "WKS",
  PTR = "PTR",
  HINFO = "HINFO",
  MINFO = "MINFO",
  MX = "MX",
  TXT = "TXT",
}

/**
 * Enum of valid DNS record classes.
 * @see https://tools.ietf.org/html/rfc1035#section-3.2.4
 */
export enum RecordClass {
  /**
   * the Internet
   */
  IN = 1,
  /**
   * the CSNET class (Obsolete - used only for examples in
   * some obsolete RFCs)
   */
  CS = 2,
  /**
   * the CHAOS class
   */
  CH = 3,
  /**
   * Hesiod [Dyer 87]
   */
  HS = 4,
}
/**
 * Represents the structure of a DNS packet.
 *
 * A DNS packet consists of a header, a list of questions, a list of answers,
 * a list of authority records, and a list of additional records.
 */
export interface DNSPacketType {
  /**
   * The header of the DNS packet.
   */
  header: DNSHeaderType;

  /**
   * The list of questions in the DNS packet.
   */
  questions: DNSQuestionType[];

  /**
   * The list of answers in the DNS packet.
   */
  answers: DNSAnswerType[];

  /**
   * The list of authority records in the DNS packet.
   */
  authorities: DNSAnswerType[];

  /**
   * The list of additional records in the DNS packet.
   */
  additionals: DNSAnswerType[];
}
