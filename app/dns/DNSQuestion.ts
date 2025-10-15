import { RecordClass, RecordType, type DNSQuestionType, type ENCODED_LABELS } from '../types'
import { encodeDomainName, decodeDomainName } from '../utils'
import { BaseDNSComponent } from './BaseDNSComponent'
import type { DNSPacket } from './DNSPacket'

/**
 * Represents a DNS question.
 *
 * A DNS question is a request for information about a specific resource record.
 * It contains the domain name, type, and class of the resource record.
 */
export class DNSQuestion extends BaseDNSComponent<DNSQuestionType> {
  name: string
  type: RecordType
  class: RecordClass
  dnsObject?: DNSPacket
  nextOffset?: number

  /**
   * Constructs a DNSQuestion with the given data.
   *
   * @param {Partial<DNSQuestionType>} [data={}] - The data to construct the DNSQuestion with.
   * The following properties are supported:
   * - name: The domain name for the DNS question.
   * - type: The record type of the DNS question.
   * - class: The record class of the DNS question.
   */

  constructor(data: Partial<DNSQuestionType> = {}) {
    super()
    this.name = data.name || ''
    this.type = data.type || RecordType.A
    this.class = data.class || RecordClass.IN
  }

  /**
   * Encodes the DNS question into a buffer.
   *
   * @returns The encoded DNS question as a Buffer.
   */
  encode(): Buffer {
    try {
      // Encode domain name to DNS format
      const nameBuffer = encodeDomainName(this.name, this.dnsObject?.encodedLabels, this.nextOffset)
      const bufferSize = nameBuffer.length + 4 // 2 bytes for type, 2 bytes for class
      const buffer = Buffer.alloc(bufferSize)

      // Copy name into buffer
      // nameBuffer.copy(buffer, 0);
      buffer.set(nameBuffer, 0)

      // Write type and class
      buffer.writeUInt16BE(this.type, nameBuffer.length)
      buffer.writeUInt16BE(this.class, nameBuffer.length + 2)

      return buffer
    } catch (e) {
      throw new Error(`Failed to encode DNS question: ${(e as Error).message}`)
    }
  }

  /**
   * Encodes a DNS question from a raw object into a Buffer.
   *
   * @param {DNSQuestionType} data - The raw DNS question object.
   * @param {number} nextOffset - The offset to start encoding from.
   * @param {DNSPacket} thisObject - The top-level DNSPacket object.
   * @returns The encoded DNS question as a Buffer.
   */
  static encodeRaw(data: DNSQuestionType, nextOffset: number, thisObject: DNSPacket): Buffer {
    const dnsQuestion = new DNSQuestion(data)
    dnsQuestion.nextOffset = nextOffset
    dnsQuestion.dnsObject = thisObject // Attach the top-level DNSPacket object
    return dnsQuestion.encode()
  }

  /**
   * Converts the DNS question into a raw object.
   *
   * @returns The raw object representation of the DNS question.
   */
  toObject(): DNSQuestionType {
    return {
      name: this.name,
      type: this.type,
      class: this.class,
    }
  }

  /**
   * Decodes a DNS question from a Buffer.
   *
   * @param buffer - The Buffer containing the DNS question in wire format.
   * @param offset - The offset in the Buffer to start decoding from.
   * @returns An object with two properties:
   *   - result: The decoded DNSQuestion instance.
   *   - nextOffset: The offset immediately after the decoded DNS question.
   */

  static decode(buffer: Buffer, offset: number = 0): { result: DNSQuestion; nextOffset: number } {
    try {
      const { domainName: decodedName, nextOffset } = decodeDomainName(buffer, offset)
      return {
        result: new DNSQuestion({
          name: decodedName,
          type: buffer.readUInt16BE(nextOffset),
          class: buffer.readUInt16BE(nextOffset + 2),
        }),
        nextOffset: nextOffset + 4,
      }
    } catch (e) {
      throw new Error(`Failed to decode DNS question: ${(e as Error).message}`)
    }
  }
}

// const question = new DNSQuestion({
//   name: 'google.com',
//   type: RecordType.A,
//   class: RecordClass.IN,
// })
// console.log(question.encode());
// const { result: decodedQuestion, nextOffset: qOffset } = DNSQuestion.decode(
//   question.encode()
// );
// console.log(decodedQuestion.toObject());

/*
NOTE:
function encodeDomainName(domainName: string): string {
  return (
    domainName
      .split(".")
      .map(
        (label) => `\\x${label.length.toString(16).padStart(2, "0")}${label}`
      )
      .join("") + "\\x00"
  );
}

Why it failed:
- This returns a string(\x06google\x03com\x00) with **escaped characters** like "\\x06", not actual bytes.
- `Buffer.write(returenedString, 0)` writes the literal characters — \, x, 0, 6 — as 4 bytes, instead of writing a single byte 0x06.
- This leads to incorrect DNS wire format encoding.

✅ Fix:
- Use `String.fromCharCode(label.length) + label` to generate real characters with byte values.
- Then use `Buffer.from(..., 'latin1')` to correctly convert the string into raw bytes.
- Or better, directly construct a `Buffer` using byte arrays for full control.
*/
