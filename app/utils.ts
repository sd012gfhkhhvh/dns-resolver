import { DNSAnswer } from "./dns/DNSAnswer";
import {
  RecordType,
  RecordTypeString,
  type DNSAnswerType,
  type ENCODED_LABELS,
} from "./types";

/**
 * Encodes a domain name into the DNS wire format with message compression.
 * The DNS wire format domain name is a sequence of labels, where each label is a
 * length byte followed by the label bytes. The last label is a 0 byte or a pointer.
 * Message compression is utilized to eliminate repetition of domain names by using pointers.
 * A domain name in a message can be represented as either:
 *  - a sequence of labels ending in a zero octet
 *  - a pointer
 *  - a sequence of labels ending with a pointer
 *
 * @example
 * encodeDomainName("example.com") => <Buffer 07 65 78 61 6d 70 6c 65 03 63 6f 6d 00>
 * @param domainName - The domain name to encode
 * @param encodedLabels - A map of already encoded labels to their offsets for compression.
 * @param nextOffset - The current position in the message for calculating offsets.
 * @returns The encoded domain name as a Buffer.
 */
export function encodeDomainName(
  domainName: string,
  encodedLabels?: ENCODED_LABELS,
  nextOffset?: number
): Buffer {
  let result = Buffer.alloc(0);
  let index = -1;
  // check for compression possibility
  if (encodedLabels) {
    // console.log("encodedLabels: ", encodedLabels, "\n");

    // check if the entire domain name is already encoded
    if (domainName in encodedLabels) {
      index = 0;
      result = encodePointer(encodedLabels[domainName]);
    } else {
      // check if any part of the domain name is already encoded
      for (let label in encodedLabels) {
        index = domainName.indexOf(label); // return the index of the first match
        if (index != -1) {
          result = encodePointer(encodedLabels[label]); // compress into a pointer
          break;
        }
      }
    }
  }
  // if compression is not possible or partial compression has already done in the previous step
  if (index === -1 || index > 0) {
    const remainingLabelSequence =
      index > 0 ? domainName.slice(0, index) : domainName;
    const labels = remainingLabelSequence.split(".").filter((el) => el != ""); // remove any empty labels like "a." => ["a", ""]
    const bytes = labels.flatMap((label) => {
      return [label.length, ...Buffer.from(label)];
    });
    // concatenate the newly encoded label sequence with the pointer if present
    result =
      result.length > 0
        ? Buffer.from([...bytes, ...result]) // a sequence of labels ending with a pointer | a pointer
        : Buffer.from([...bytes, 0]); //  a sequence of labels ending in a zero octet

    // store the new label sequence into the encodedLabels object
    if (encodedLabels && nextOffset) {
      encodedLabels[domainName] = nextOffset;
    }
  }
  return result;
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
 * Decodes a domain name from a Buffer.
 *
 * This function handles the message compression scheme described in RFC 1035, Section 4.1.4.
 * In order to reduce the size of messages, the domain system utilizes a compression scheme which
 * eliminates the repetition of domain names in a message.  In this scheme, an entire domain name or
 * a list of labels at the end of a domain name is replaced with a pointer to a prior occurrence of
 * the same name.
 * 
 * The pointer takes the form of a two octet sequence:

 * -  +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 * -  | 1  1|                OFFSET                   |
 * -  +--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+--+
 *
 * @param buffer - The Buffer containing the domain name to decode.
 * @param offset - The offset into the Buffer where the domain name starts.
 * @returns An object containing the decoded domain name as a string and
 * the offset immediately after the decoded domain name.
 */
export function decodeDomainName(
  buffer: Buffer,
  offset: number
): { domainName: string; nextOffset: number } {
  let startIndex = offset;
  const labels: string[] = [];

  while (startIndex < buffer.length) {
    // If the first two bits of the first octet are 1, then this is a pointer
    if (isPointer(buffer, startIndex)) {
      const pointerOffset = decodePointer(
        buffer.subarray(startIndex, startIndex + 2)
      );
      // decode the pointer and add the corresponding domain name to the labels array
      labels.push(decodeDomainName(buffer, pointerOffset).domainName);
      startIndex += 2;
      break; // exit the loop if a pointer is encountered
    } else {
      const labelLength = buffer[startIndex];
      if (labelLength === 0) {
        startIndex += 1;
        break; // exit the loop if the label length is 0, i.e null byte indicates the end of the domain name
      }
      // decode the label and add it to the labels array
      labels.push(
        buffer
          .subarray(startIndex + 1, startIndex + 1 + labelLength)
          .toString("latin1")
      );
      startIndex += labelLength + 1;
    }
  }

  return {
    domainName: labels.join("."),
    nextOffset: startIndex,
  };
}

/**
 * Checks if the given buffer at the given offset is a DNS pointer.
 * A DNS pointer is a 2-byte sequence that starts with two 1 bits, since the label must begin with two zero bits because
 * labels are restricted to 63 octets or less.
 * @param buffer The buffer to check.
 * @param offset The offset into the buffer to check.
 * @returns True if the buffer is a DNS pointer, false otherwise.
 */
export function isPointer(buffer: Buffer, offset: number = 0) {
  let firstByte = buffer[offset].toString(2).padStart(8, "0");
  return firstByte.startsWith("11"); // if the first two bits are '1' then it is a pointer
}

/**
 * Encodes a pointer by creating a two-octet sequence.
 *
 * @param {number} offset - The offset from the start of the message.
 * @returns {Buffer} - The encoded pointer as a two-octet sequence.
 */
export function encodePointer(offset: number): Buffer {
  // Convert offset to 14-bit binary value
  const offsetBinary = (offset & 0x3fff).toString(2).padStart(14, "0");

  // Prepend two 1s
  const pointerBinary = "11" + offsetBinary;

  // Convert to two-octet sequence
  const pointerOctets = Buffer.alloc(2);
  pointerOctets.writeUInt16BE(parseInt(pointerBinary, 2), 0);

  return pointerOctets;
}

/**
 * Decodes a pointer by extracting the offset from the two-octet sequence.
 *
 * @param {Buffer} pointerBuffer - The encoded pointer as a 2-byte Buffer.
 * @returns {number} - The decoded offset.
 */
export function decodePointer(pointerBuffer: Buffer): number {
  // Convert 2-byte Buffer to 16-bit binary value
  const pointerBinary = pointerBuffer
    .readUInt16BE(0)
    .toString(2)
    .padStart(16, "0");

  // Remove first two bits (11)
  const offsetBinary = pointerBinary.slice(2);

  // Convert to integer
  const offset = parseInt(offsetBinary, 2);

  return offset;
}

/**
 * Decodes multiple DNS records from a Buffer.
 * @param buffer The Buffer containing the DNS records.
 * @param recordOffset The offset into the Buffer where the records start.
 * @param recordCount The number of records to decode.
 * @returns An object containing an array of decoded DNSAnswer objects and the offset immediately after the decoded records.
 */
export function decodeRecords(
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
 * Encodes multiple DNS records from an array of raw objects into a Buffer.
 * @param records The array of raw DNSAnswer objects to encode.
 * @param nextOffset The offset into the Buffer where the records should be encoded.
 * @returns An object containing the encoded Buffer and the offset immediately after the encoded records.
 */
export function encodeRecords(
  records: DNSAnswerType[],
  nextOffset: number
): {
  encodedRecords: Buffer;
  nextOffset: number;
} {
  let encodedRecords = Buffer.alloc(0);
  let offset = nextOffset;

  for (const record of records) {
    const encodedRecord = DNSAnswer.encodeRaw(record, offset, this);
    encodedRecords = Buffer.concat([encodedRecords, encodedRecord]);
    offset += encodedRecord.length;
  }

  return {
    encodedRecords,
    nextOffset: offset,
  };
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

/**
 * Validates a domain name against a regular expression pattern.
 *
 * The pattern ensures that the domain name consists of alphanumeric characters,
 * and may include hyphens and dots, followed by a top-level domain with at least
 * two alphabetic characters.
 *
 * @param domain - The domain name to validate.
 * @returns A boolean indicating whether the domain name is valid.
 */

export function isValidDomain(domain: string): boolean {
  // empty string
  if (domain === "" || domain === undefined || domain === null) return false;

  // Regular expression pattern for domain name validation
  const domainRegex = /^[a-zA-Z0-9]+([\-\.]{1}[a-zA-Z0-9]+)*\.[a-zA-Z]{2,}$/;

  // Check if the domain matches the pattern
  const isDomainValid = domainRegex.test(domain);

  // Check if each label of the domain label sequence is of max length 63
  const labels = domain.split(".");
  const isLabelLengthValid = labels.every((label) => label.length <= 63);

  // Return true if both checks pass
  return isDomainValid && isLabelLengthValid;
}

/**
 * Checks if a given string is a valid DNS record type.
 *
 * @param type - The string to check.
 * @returns A boolean indicating whether the string is a valid DNS record type.
 */
export function isValidType(type: string) {
  // empty string
  if (type === "" || type === undefined || type === null) return false;
  return RecordType[type.toUpperCase() as RecordTypeString] !== undefined;
}

/**
 * Validates whether a given string is a valid IPv4 address.
 *
 * @param ip - The IPv4 address to validate.
 * @returns A boolean indicating whether the input is a valid IPv4 address.
 */
export function isValidIpv4(ip: string): boolean {
  if (!ip) return false;

  const ipv4Regex =
    /^(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])\.(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[1-9]?[0-9])$/;

  return ipv4Regex.test(ip);
}

/**
 * Returns a random element from the given array.
 *
 * @param array - The array to pick an element from.
 * @returns A random element from the array.
 */
export function pickRandomFromArray(array: Array<any>): any {
  return array[Math.floor(Math.random() * array.length)];
}
