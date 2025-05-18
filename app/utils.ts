import { DNSAnswer } from "./dns-packet/DNSAnswer";
import type { DNSAnswerType } from "./types";

/**
 * Encodes a domain name into the DNS wire format.
 * The DNS wire format domain name is a sequence of labels, where each label is a
 * length byte followed by the label bytes. The last label is a 0 byte.
 *
 * @example
 * encodeDomainName("example.com") => <Buffer 07 65 78 61 6d 70 6c 65 03 63 6f 6d 00>
 * @param domainName - The domain name to encode
 * @returns The encoded domain name
 */
export function encodeDomainName(domainName: string): Buffer {
  const labels = domainName.split(".");
  const bytes = labels.flatMap((label) => [
    label.length,
    ...Buffer.from(label),
  ]);
  return Buffer.from([...bytes, 0]);
}

// Alternate method using String.fromCharCode()
// Useful for cases where you want to return a string first and convert later
export function encodeDomainNameAlt(domainName: string): Buffer {
  const encodedStr =
    domainName
      .split(".")
      .map((label) => String.fromCharCode(label.length) + label)
      .join("") + "\x00";
  return Buffer.from(encodedStr, "latin1"); // Use latin1 to preserve byte values
}

/**
 * Decodes a DNS wire format domain name into a string.
 * @param buffer The DNS wire format domain name.
 * @returns The decoded domain name as a string.
 */
export function decodeDomainName(buffer: Buffer, offset: number = 0): string {
  let startIndex = offset;
  const labels: string[] = [];

  while (startIndex < buffer.length) {
    const labelLength = buffer[startIndex];
    if (labelLength === 0) break;
    labels.push(
      buffer
        .subarray(startIndex + 1, startIndex + 1 + labelLength)
        .toString("latin1")
    );
    startIndex += labelLength + 1;
  }

  return labels.join(".");
}

/**
 * Decodes multiple DNS records from a Buffer.
 * @param buffer The Buffer containing the DNS records.
 * @param recordOffset The offset into the Buffer where the records start.
 * @param recordCount The number of records to decode.
 * @returns An object containing an array of decoded DNSAnswer objects and the offset immediately after the decoded records.
 */
export function decodeRecord(
  buffer: Buffer,
  recordOffset: number = 0,
  recordCount: number = 0
): {
  decodedRecords: DNSAnswerType[];
  nextOffset: number;
} {
  let offset = recordOffset;
  const decodedRecords: DNSAnswerType[] = [];
  let count = recordCount;
  while (count > 0 && offset < buffer.length) {
    const { result: record, nextOffset } = DNSAnswer.decode(buffer, offset);
    decodedRecords.push(record.toObject());
    offset = nextOffset;
    count--;
  }
  return { decodedRecords, nextOffset: offset };
}

/**
 * Breaks a DNS packet into chunks of individual DNS questions.
 * @param buffer The Buffer containing the DNS packet.
 * @param offset The offset into the Buffer where the questions start.
 * @param questionCOUNT The number of questions to break out.
 * @returns An object containing an array of Buffer objects, each containing a DNS question,
 * and the total length of all the questions.
 */
export function getQuestionBufferChunks(
  buffer: Buffer,
  offset: number = 0,
  questionCOUNT: number
): {
  questionBufferChunks: Buffer[];
  questionLength: number;
} {
  let startIndex = offset;
  const questionBufferChunks: Buffer[] = [];
  while (questionCOUNT > 0 && startIndex < buffer.length) {
    let remainingBuffer = buffer.subarray(startIndex, buffer.length);
    let nullIndex = remainingBuffer.findIndex((byte) => byte === 0x00); // Find the index of the first null byte , i.e the end of the domain name
    let endIndex = nullIndex + 4; // 4 bytes for type and class
    questionBufferChunks.push(remainingBuffer.subarray(0, endIndex + 1));
    startIndex += endIndex + 1;
    questionCOUNT--;
  }
  return { questionBufferChunks, questionLength: startIndex - offset };
}

/**
 * Breaks a DNS packet into chunks of individual DNS answers.
 * @param buffer The Buffer containing the DNS packet.
 * @param offset The offset into the Buffer where the answers start.
 * @param answerCOUNT The number of answers to break out.
 * @returns An object containing an array of Buffer objects, each containing a DNS answer,
 * and the total length of all the answers.
 */
export function getAnswerBufferChunks(
  buffer: Buffer,
  offset: number,
  answerCOUNT: number
): {
  chunks: Buffer[];
  size: number;
} {
  let startIndex = offset;
  const answerBufferChunks: Buffer[] = [];
  while (answerCOUNT > 0 && startIndex < buffer.length) {
    let remainingBuffer = buffer.subarray(startIndex, buffer.length);
    let nullIndex = remainingBuffer.findIndex((byte) => byte === 0x00); // Find the index of the first null byte , i.e the end of the domain name
    let indexOfRdlength = nullIndex + 8; // 8 bytes for type, class and ttl
    let rdlength = remainingBuffer.readUInt16BE(indexOfRdlength); // Read the length of the RD field
    let endIndex = indexOfRdlength + rdlength;
    answerBufferChunks.push(remainingBuffer.subarray(0, endIndex + 1));
    startIndex += endIndex + 1;
    answerCOUNT--;
  }
  return { chunks: answerBufferChunks, size: startIndex - offset };
}
