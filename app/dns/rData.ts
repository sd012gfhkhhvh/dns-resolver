import { RecordType, type DNSAnswerType, type RDataType, type SOA_RECORD } from '../types'
import { decodeDomainName, encodeDomainName } from '../utils'

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
  rdlength: number,
): RDataType {
  // const rDataBuffer = buffer.subarray(offset, offset + rdlength); // extract the rdata buffer
  const data: RDataType = typeMap[type].decodeFn(buffer, offset, rdlength)
  return data
}

/**
 * Decodes a DNS A record from a Buffer.
 *
 * @param buffer The Buffer containing the A record.
 * @returns The decoded A record as a string.
 */
export function decodeARecord(buffer: Buffer, offset: number, rdlength: number): string {
  const rDataBuffer = buffer.subarray(offset, offset + rdlength)
  return rDataBuffer.map((byte) => byte).join('.') // no need for explicit toString as map converts them into decimal digits and then join method converts them into string
}

/**
 * Decodes a DNS AAAA record from a Buffer.
 *
 * @param buffer The Buffer containing the AAAA record.
 * @returns The decoded AAAA record as a string.
 */
export function decodeAAAARecord(buffer: Buffer, offset: number, rdlength: number): string {
  const rDataBuffer = buffer.subarray(offset, offset + rdlength)
  return rDataBuffer.map((byte) => byte).join(':')
}

/**
 * Decodes a DNS CNAME record from a Buffer.
 *
 * @param buffer The Buffer containing the CNAME record.
 * @returns The decoded CNAME record as a string.
 */
export function decodeCNAMERecord(buffer: Buffer, offset: number, rdlength: number): string {
  const { domainName } = decodeDomainName(buffer, offset)
  return domainName
}

/**
 * Decodes a DNS NS record from a Buffer.
 *
 * @param buffer The Buffer containing the NS record.
 * @returns The decoded NS record as a string.
 */
export function decodeNSRecord(buffer: Buffer, offset: number, rdlength: number): string {
  const { domainName } = decodeDomainName(buffer, offset)
  return domainName
}

/**
 * Decodes a DNS TXT record from a Buffer.
 *
 * @param buffer The Buffer containing the TXT record.
 * @returns The decoded TXT record as a string.
 */
export function decodeTXTRecord(buffer: Buffer, offset: number, rdlength: number): string {
  const rDataBuffer = buffer.subarray(offset, offset + rdlength)
  let result = ''
  for (const byte of rDataBuffer) {
    result += String.fromCharCode(byte)
  }
  return result
}

/**
 * Decodes a DNS SOA record from a Buffer.
 *
 * The SOA RDATA format is as follows:
 *
 * <mname> <rname> <serial> <refresh> <retry> <expire> <minimum>
 *
 * - MNAME: The <domain-name> of the name server that was the original or primary source of data for this zone.
 * - RNAME: A <domain-name> which specifies the mailbox of the person responsible for this zone.
 * - SERIAL: The unsigned 32 bit version number of the original copy of the zone. Zone transfers preserve this value. This value wraps and should be compared using sequence space arithmetic.
 * - REFRESH: A 32 bit time interval before the zone should be refreshed.
 * - RETRY: A 32 bit time interval that should elapse before a failed refresh should be retried.
 * - EXPIRE: A 32 bit time value that specifies the upper limit on the time interval that can elapse before the zone is no longer authoritative.
 *
 * @param buffer The Buffer containing the SOA record.
 * @param offset The offset into the Buffer where the SOA record starts.
 * @param rdlength The length of the rdata field.
 * @returns An object containing the decoded SOA record.
 */
export function decodeSOARecord(
  buffer: Buffer,
  offset: number,
  rdlength: number,
): {
  mname: string
  rname: string
  serial: number
  refresh: number
  retry: number
  expire: number
  minimum: number
} {
  const soaRecord = {} as {
    mname: string
    rname: string
    serial: number
    refresh: number
    retry: number
    expire: number
    minimum: number
  }

  let currentOffset = offset
  const { domainName: mname, nextOffset: mnameOffset } = decodeDomainName(buffer, currentOffset)
  soaRecord.mname = mname
  currentOffset = mnameOffset

  const { domainName: rname, nextOffset: rnameOffset } = decodeDomainName(buffer, currentOffset)
  soaRecord.rname = rname
  currentOffset = rnameOffset

  soaRecord.serial = buffer.readUInt32BE(currentOffset)
  currentOffset += 4

  soaRecord.refresh = buffer.readUInt32BE(currentOffset)
  currentOffset += 4

  soaRecord.retry = buffer.readUInt32BE(currentOffset)
  currentOffset += 4

  soaRecord.expire = buffer.readUInt32BE(currentOffset)
  currentOffset += 4

  soaRecord.minimum = buffer.readUInt32BE(currentOffset)
  currentOffset += 4

  return soaRecord
}

// -------------------------------- encodeRecordData ----------------------------------

/**
 * Encodes DNS record data into a Buffer.
 *
 * @param data The record data to encode.
 * @param type The type of the resource record.
 * @returns The encoded record data as a Buffer.
 */
export function encodeRecordData(
  this: DNSAnswerType,
  data: RDataType,
  type: RecordType,
  nextOffset: number,
): Buffer {
  const buffer = typeMap[type].encodeFn.apply(this, [data, nextOffset])
  return buffer
}

/**
 * Encodes a DNS A record from a string.
 *
 * @param address The address to encode, in dotted decimal notation.
 * @returns The encoded A record as a Buffer.
 */
export function encodeArecord(address: RDataType, nextOffset: number): Buffer {
  address = address as string
  const octets = address.split('.').map((octet) => parseInt(octet))
  return Buffer.from(octets)
}

/**
 * Encodes a DNS AAAA record from a string.
 *
 * @param address The address to encode, in colon-separated hex notation.
 * @returns The encoded AAAA record as a Buffer.
 */
export function encodeAAAARecord(address: RDataType, nextOffset: number): Buffer {
  address = address as string
  const octets = address.split(':').map((octet) => parseInt(octet, 16))
  return Buffer.from(octets)
}

/**
 * Encodes a DNS CNAME record from a string.
 *
 * @param domainName The domain name to encode.
 * @returns The encoded CNAME record as a Buffer.
 */
export function encodeCNAMERecord(
  this: DNSAnswerType,
  domainName: RDataType,
  nextOffset: number,
): Buffer {
  return encodeDomainName(domainName as string, this.dnsObject?.encodedLabels, nextOffset)
}

/**
 * Encodes a DNS NS record from a string.
 *
 * @param domainName The domain name to encode.
 * @returns The encoded NS record as a Buffer.
 */
export function encodeNSRecord(
  this: DNSAnswerType,
  domainName: RDataType,
  nextOffset: number,
): Buffer {
  return encodeDomainName(domainName as string, this.dnsObject?.encodedLabels, nextOffset)
}

/**
 * Encodes a DNS TXT record from a string.
 *
 * @param data The data to encode.
 * @returns The encoded TXT record as a Buffer.
 */
export function encodeTXTRecord(data: RDataType, nextOffset: number): Buffer {
  data = data as string
  const bytes = data.split('').map((char) => char.charCodeAt(0))
  return Buffer.from(bytes)
}

/**
 * Encodes a DNS SOA record from an object.
 *
 * @param data The data to encode, an object with the following properties:
 *   - mname: the master name server domain name
 *   - rname: the responsible person's domain name
 *   - serial: the current serial number
 *   - refresh: the refresh interval
 *   - retry: the retry interval
 *   - expire: the expire interval
 *   - minimum: the minimum TTL
 * @returns The encoded SOA record as a Buffer.
 */
export function encodeSOARecord(this: DNSAnswerType, data: RDataType, nextOffset: number): Buffer {
  data = data as SOA_RECORD
  const bufferArray: number[] = []

  bufferArray.push(...encodeDomainName(data.mname, this.dnsObject?.encodedLabels, nextOffset))
  bufferArray.push(
    ...encodeDomainName(data.rname, this.dnsObject?.encodedLabels, nextOffset + bufferArray.length),
  )

  bufferArray.push((data.serial >>> 24) & 0xff)
  bufferArray.push((data.serial >>> 16) & 0xff)
  bufferArray.push((data.serial >>> 8) & 0xff)
  bufferArray.push(data.serial & 0xff)

  bufferArray.push((data.refresh >>> 24) & 0xff)
  bufferArray.push((data.refresh >>> 16) & 0xff)
  bufferArray.push((data.refresh >>> 8) & 0xff)
  bufferArray.push(data.refresh & 0xff)

  bufferArray.push((data.retry >>> 24) & 0xff)
  bufferArray.push((data.retry >>> 16) & 0xff)
  bufferArray.push((data.retry >>> 8) & 0xff)
  bufferArray.push(data.retry & 0xff)

  bufferArray.push((data.expire >>> 24) & 0xff)
  bufferArray.push((data.expire >>> 16) & 0xff)
  bufferArray.push((data.expire >>> 8) & 0xff)
  bufferArray.push(data.expire & 0xff)

  bufferArray.push((data.minimum >>> 24) & 0xff)
  bufferArray.push((data.minimum >>> 16) & 0xff)
  bufferArray.push((data.minimum >>> 8) & 0xff)
  bufferArray.push(data.minimum & 0xff)

  return Buffer.from(bufferArray)
}

// typeMap ----------------------------------
/**
 * A map of record types to their respective decode and encode functions.
 */
export const typeMap: {
  [key in RecordType]: {
    /**
     * Decodes a DNS record of the specified type from a Buffer.
     *
     * @param buffer The Buffer containing the DNS packet.
     * @param offset The offset into the Buffer where the record data starts.
     * @param rdlength The length of the rdata field.
     * @returns The decoded record data.
     */
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType
    /**
     * Encodes a DNS record of the specified type into a Buffer.
     *
     * @param this The DNSAnswerType instance.
     * @param data The record data to encode.
     * @param nextOffset The next offset to start encoding from.
     * @returns The encoded record data as a Buffer.
     */
    encodeFn(this: DNSAnswerType, data: RDataType, nextOffset: number): Buffer
  }
} = {
  [RecordType.A]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return decodeARecord(buffer, offset, rdlength)
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return encodeArecord.apply(this, [data, nextOffset])
    },
  },
  [RecordType.AAAA]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return decodeAAAARecord(buffer, offset, rdlength)
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return encodeAAAARecord.apply(this, [data, nextOffset])
    },
  },
  [RecordType.NS]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return decodeNSRecord(buffer, offset, rdlength)
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return encodeNSRecord.apply(this, [data, nextOffset])
    },
  },
  [RecordType.MD]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return 'Method not implemented'
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return Buffer.from([0])
    },
  },
  [RecordType.MF]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return 'Method not implemented'
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return Buffer.from([0])
    },
  },
  [RecordType.CNAME]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return decodeCNAMERecord(buffer, offset, rdlength)
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return encodeCNAMERecord.apply(this, [data, nextOffset])
    },
  },
  [RecordType.SOA]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return decodeSOARecord(buffer, offset, rdlength)
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return encodeSOARecord.apply(this, [data, nextOffset])
    },
  },
  [RecordType.MB]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return 'Method not implemented'
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return Buffer.from([0])
    },
  },
  [RecordType.MG]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return 'Method not implemented'
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return Buffer.from([0])
    },
  },
  [RecordType.MR]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return 'Method not implemented'
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return Buffer.from([0])
    },
  },
  [RecordType.NULL]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return 'Method not implemented'
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return Buffer.from([0])
    },
  },
  [RecordType.WKS]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return 'Method not implemented'
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return Buffer.from([0])
    },
  },
  [RecordType.PTR]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return 'Method not implemented'
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return Buffer.from([0])
    },
  },
  [RecordType.HINFO]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return 'Method not implemented'
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return Buffer.from([0])
    },
  },
  [RecordType.MINFO]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return 'Method not implemented'
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return Buffer.from([0])
    },
  },
  [RecordType.MX]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return 'Method not implemented'
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return Buffer.from([0])
    },
  },
  [RecordType.TXT]: {
    decodeFn(buffer: Buffer, offset: number, rdlength: number): RDataType {
      return decodeTXTRecord(buffer, offset, rdlength)
    },
    encodeFn(data: RDataType, nextOffset: number): Buffer {
      return encodeTXTRecord.apply(this, [data, nextOffset])
    },
  },
}
