import { BaseDNSComponent } from "./BaseDNSComponent";
import { DNSHeader } from "./DNSHeader";
import { DNSQuestion } from "./DNSQuestion";
import { DNSAnswer } from "./DNSAnswer";
import {
  RecordClass,
  RecordType,
  type DNSAnswerType,
  type DNSHeaderType,
  type DNSPacketType,
  type DNSQuestionType,
} from "../types";
import { decodeRecord } from "../utils";

export class DNSPacket extends BaseDNSComponent<DNSPacketType> {
  header: DNSHeaderType;
  questions: DNSQuestionType[];
  answers: DNSAnswerType[];
  authorities: DNSAnswerType[];
  additionals: DNSAnswerType[];

  /**
   * Constructs a DNSPacket with the given data.
   *
   * @param {Partial<DNSPacket>} [data={}] - The data to construct the DNSPacket with.
   * The following properties are supported:
   * - header: The DNS header.
   * - questions: An array of DNS questions.
   * - answers: An array of DNS answers.
   * - authorities: An array of DNS authority records.
   * - additionals: An array of additional DNS records.
   */

  constructor(data: Partial<DNSPacket> = {}) {
    super();
    this.header =
      data.header ||
      DNSHeader.decode(DNSHeader.encodeRaw({})).result.toObject();
    this.questions = data.questions || [];
    this.answers = data.answers || [];
    this.authorities = data.authorities || [];
    this.additionals = data.additionals || [];
  }

  /**
   * Encodes the DNS packet into a Buffer.
   *
   * @returns The encoded DNS packet as a Buffer.
   */
  encode(): Buffer {
    return Buffer.concat([
      DNSHeader.encodeRaw(this.header),
      ...this.questions.map((question) => DNSQuestion.encodeRaw(question)),
      ...this.answers.map((answer) => DNSAnswer.encodeRaw(answer)),
      ...this.authorities.map((authority) => DNSAnswer.encodeRaw(authority)),
      ...this.additionals.map((additional) => DNSAnswer.encodeRaw(additional)),
    ]);
  }

  /**
   * Encodes a DNS packet from a raw object into a Buffer.
   *
   * @param {DNSPacketType} data - The raw DNS packet object.
   * @returns The encoded DNS packet as a Buffer.
   */
  static encodeRaw(data: DNSPacketType): Buffer {
    return new DNSPacket(data).encode();
  }

  /**
   * Converts the DNS packet to a raw object.
   *
   * @returns The raw object representation of the DNS packet.
   */
  toObject(): DNSPacketType {
    return {
      header: this.header,
      questions: this.questions.map((question) => question),
      answers: this.answers.map((answer) => answer),
      authorities: this.authorities.map((authority) => authority),
      additionals: this.additionals.map((additional) => additional),
    };
  }

  /**
   * Decodes a DNS packet from a Buffer.
   * @param {Buffer} buffer The Buffer to decode from.
   * @param {number} [offset=0] The offset to start decoding from.
   * @returns The decoded DNS packet as an object.
   * @throws {Error} If the packet length is invalid or if there is a problem decoding the packet.
   */
  static decode(buffer: Buffer, offset: number = 0): DNSPacket {
    // Check packet length
    if (buffer.length < 12) {
      throw new Error("Invalid packet length");
    }

    // Decode header
    const { result: decodedHeaderInstance, nextOffset: hOffset } =
      DNSHeader.decode(buffer, offset);

    const decodedHeader = decodedHeaderInstance.toObject();

    const questionCOUNT: number = decodedHeader.qdcount || 0;
    const answerCOUNT: number = decodedHeader.ancount || 0;
    const authorityCOUNT: number = decodedHeader.nscount || 0;
    const additionalCOUNT: number = decodedHeader.arcount || 0;

    if (questionCOUNT < 1) {
      throw new Error("At least one question is required");
    }

    // Decode questions
    let qOffset = hOffset;
    const decodedQuestions: DNSQuestionType[] = [];
    let qCount = questionCOUNT;
    while (qCount > 0 && qOffset < buffer.length) {
      const { result: question, nextOffset } = DNSQuestion.decode(
        buffer,
        qOffset
      );
      decodedQuestions.push(question.toObject());
      qOffset = nextOffset;
      qCount--;
    }

    // Decode answers
    const {
      decodedRecords: decodedAnswers,
      nextOffset: ansOffset,
    }: { decodedRecords: DNSAnswerType[]; nextOffset: number } = decodeRecord(
      buffer,
      qOffset,
      answerCOUNT
    );

    // Decode authorities
    const {
      decodedRecords: decodedAuthorities,
      nextOffset: auOffset,
    }: { decodedRecords: DNSAnswerType[]; nextOffset: number } = decodeRecord(
      buffer,
      ansOffset,
      authorityCOUNT
    );

    // Decode additionals
    const {
      decodedRecords: decodedAdditionals,
      nextOffset: addOffset,
    }: { decodedRecords: DNSAnswerType[]; nextOffset: number } = decodeRecord(
      buffer,
      auOffset,
      additionalCOUNT
    );

    return new DNSPacket({
      header: decodedHeader,
      questions: decodedQuestions,
      answers: decodedAnswers,
      authorities: decodedAuthorities,
      additionals: decodedAdditionals,
    });
  }
}

// Example usage
const dnsPacketRaw = {
  header: {
    id: 1234,
    qr: 0,
    opcode: 0,
    aa: 0,
    tc: 0,
    rd: 1,
    ra: 0,
    z: 0,
    rcode: 0,
    qdcount: 2,
    ancount: 2,
    nscount: 1,
    arcount: 1,
  },
  questions: [
    {
      name: "google.com",
      type: RecordType.A,
      class: RecordClass.IN,
    },
    {
      name: "mail.google.com",
      type: RecordType.A,
      class: RecordClass.IN,
    },
  ],
  answers: [
    {
      name: "google.com",
      type: RecordType.A,
      class: RecordClass.IN,
      ttl: 3600,
      rdlength: 4,
      rdata: Buffer.from([1, 2, 3, 4]),
    },
    {
      name: "mail.google.com",
      type: RecordType.A,
      class: RecordClass.IN,
      ttl: 3600,
      rdlength: 4,
      rdata: Buffer.from([2, 2, 3, 4]),
    },
  ],
  authorities: [
    {
      name: "facebook.com",
      type: RecordType.CNAME,
      class: RecordClass.IN,
      ttl: 3600,
      rdlength: 4,
      rdata: Buffer.from([3, 2, 3, 4]),
    },
  ],
  additionals: [
    {
      name: "yahoo.com",
      type: RecordType.CNAME,
      class: RecordClass.IN,
      ttl: 3600,
      rdlength: 4,
      rdata: Buffer.from([4, 2, 3, 4]),
    },
  ],
};

// const encodedPacket = DNSPacket.encodeRaw(dnsPacketRaw);
// console.log("endcoded packet: ", encodedPacket);

// const decodedPacket = DNSPacket.decode(encodedPacket);
// console.log("decoded packet: ", decodedPacket.toObject());
