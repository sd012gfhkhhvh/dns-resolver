import { RecordClass, RecordType, type DNSAnswerType, type RDataType } from '../types'
import { decodeDomainName, encodeDomainName } from '../utils'
import { BaseDNSComponent } from './BaseDNSComponent'
import type { DNSPacket } from './DNSPacket'
import { decodeRecordData, encodeRecordData } from './rData'

/**
 * Represents a DNS answer.
 *
 * A DNS answer is a resource record that answers a DNS query.
 * It contains the domain name, type, class, TTL, rdlength, and rdata.
 * The rdata depends on the type of the resource record.
 */
export class DNSAnswer extends BaseDNSComponent<DNSAnswerType> {
  name: string
  type: RecordType
  class: RecordClass
  ttl: number
  rdlength: number
  rdata: RDataType
  dnsObject?: DNSPacket
  nextOffset?: number

  constructor(data: Partial<DNSAnswerType> = {}) {
    super()
    this.name = data.name || ''
    this.type = data.type || RecordType.A
    this.class = data.class || RecordClass.IN
    this.ttl = data.ttl || 0
    this.rdlength = data.rdlength || 0
    this.rdata = data.rdata || ''
  }

  /**
   * Encodes the DNS answer into a buffer.
   *
   * This function serializes the DNS answer fields into a binary format suitable
   * for network transmission. It encodes the domain name, type, class, TTL,
   * rdlength, and rdata into a single Buffer object.
   *
   * The buffer structure is as follows:
   * - The domain name is encoded in the DNS wire format.
   * - 2 bytes for the type field.
   * - 2 bytes for the class field.
   * - 4 bytes for the TTL (Time to Live).
   * - 2 bytes for the rdlength (length of the rdata field).
   * - The rdata field itself, which is rdlength bytes long.
   *
   * @returns The encoded DNS answer as a Buffer.
   */

  encode(): Buffer {
    // Encode domain name to DNS format
    const nameBuffer = encodeDomainName(this.name, this.dnsObject?.encodedLabels, this.nextOffset)

    const rDataOffset = this.nextOffset
      ? this.nextOffset + nameBuffer.length + 10
      : nameBuffer.length + 10

    const rData: Buffer = encodeRecordData.apply(this, [this.rdata, this.type, rDataOffset])

    let calculatedRdlength = rData.length
    // based on the presence of compression the rdlength can be different
    if (this.rdlength !== calculatedRdlength) {
      this.rdlength = calculatedRdlength
    }

    const bufferSize = nameBuffer.length + 10 + this.rdlength // 2 bytes for type, 2 bytes for class, 4 bytes for TTL, 2 bytes for rdlength, and rdlength bytes for rdata
    const buffer = Buffer.alloc(bufferSize)

    // Copy name into buffer
    // nameBuffer.copy(buffer, 0);
    buffer.set(nameBuffer, 0)

    // Write type, class, TTL, and rdlength
    buffer.writeUInt16BE(this.type, nameBuffer.length)
    buffer.writeUInt16BE(this.class, nameBuffer.length + 2)
    buffer.writeUInt32BE(this.ttl, nameBuffer.length + 4)

    buffer.writeUInt16BE(this.rdlength, nameBuffer.length + 8)

    // Copy rdata into buffer
    // rData.copy(buffer, nameBuffer.length + 10);
    buffer.set(rData, nameBuffer.length + 10)

    return buffer
  }

  /**
   * Encodes a DNS answer from a raw object into a Buffer.
   *
   * @param {DNSAnswerType} data - The raw DNS answer object.
   * @param {number} nextOffset - The offset to start encoding from.
   * @param {DNSPacket} thisObject - The top-level DNSPacket object.
   * @returns The encoded DNS answer as a Buffer.
   */
  static encodeRaw(data: DNSAnswerType, nextOffset: number, thisObject: DNSPacket): Buffer {
    const dnsAnswer = new DNSAnswer(data)
    dnsAnswer.nextOffset = nextOffset
    dnsAnswer.dnsObject = thisObject // Attach the top-level DNSPacket object
    return dnsAnswer.encode()
  }

  /**
   * Converts the DNS answer to a raw object.
   *
   * @returns The raw object representation of the DNS answer.
   */
  toObject(): DNSAnswerType {
    return {
      name: this.name,
      type: this.type,
      class: this.class,
      ttl: this.ttl,
      rdlength: this.rdlength,
      rdata: this.rdata,
    }
  }

  /**
   * Decodes a DNS answer from a Buffer.
   * @param buffer The Buffer to decode from.
   * @param offset The offset to start decoding from.
   * @returns An object with two properties: result and nextOffset.
   * result is the decoded DNSAnswer.
   * nextOffset is the offset immediately after the decoded answer.
   */
  static decode(buffer: Buffer, offset: number = 0): { result: DNSAnswer; nextOffset: number } {
    const { domainName: decodedName, nextOffset } = decodeDomainName(buffer, offset)

    const type = buffer.readUInt16BE(nextOffset)
    const _class = buffer.readUInt16BE(nextOffset + 2)
    const ttl = buffer.readUInt32BE(nextOffset + 4)

    const rdlength = buffer.readUInt16BE(nextOffset + 8) // 8 --> 2 byte for type, 2 byte for class, 4 byte for TTL
    const rdata = decodeRecordData(buffer, nextOffset + 10, type, rdlength)

    return {
      result: new DNSAnswer({
        name: decodedName,
        type,
        class: _class,
        ttl,
        rdlength,
        rdata,
      }),
      nextOffset: nextOffset + 10 + rdlength,
    }
  }
}

const testAnswer = new DNSAnswer({
  name: 'google.com',
  type: RecordType.A,
  class: RecordClass.IN,
  ttl: 3600,
  rdlength: 4,
  rdata: '1.2.3.4',
})
// console.log(testAnswer.encode());
// const { result: decodedAnswer, nextOffset: aOffset } = DNSAnswer.decode(
//   testAnswer.encode()
// );
// console.log(decodedAnswer.toObject());
// console.log(aOffset);
