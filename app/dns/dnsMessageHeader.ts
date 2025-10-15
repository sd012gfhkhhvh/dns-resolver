export class DNSMessageHeader {
  constructor(
    public packetID: number = 0,
    public isResponse: boolean = false,
    public opCode: number = 0,
    public isAuthoritativeAnswer: boolean = false,
    public isTruncated: boolean = false,
    public isRecursionDesired: boolean = false,
    public isRecursionAvailable: boolean = false,
    public responseCode: number = 0,
    public questionCount: number = 0,
    public answerRecordCount: number = 0,
    public authorityRecordCount: number = 0,
    public additionalRecordCount: number = 0,
  ) {}
  encode(): Uint8Array {
    const encodeBigEndian = (value: number) => {
      const lowByte = value & 0xff
      const highByte = (value >> 8) & 0xff
      return [lowByte, highByte]
    }
    const byteArray = new Uint8Array(12)
    // packetID -- FIRST 2 bytes
    // We get the low and high bytes
    let [lowByte, highByte] = encodeBigEndian(this.packetID)
    byteArray[0] = highByte
    byteArray[1] = lowByte
    // QR, OPCODE, AA, TC, RD -- 3RD BYTE
    let byte = 0
    // if the boolean for is response is true, we do bitwise OR
    if (this.isResponse) byte |= 0b10000000 // 1 bit (of 8) taken
    byte |= this.opCode << 3 // 2-5 bits taken
    if (this.isAuthoritativeAnswer) byte |= 0b00000100 // 6th
    if (this.isTruncated) byte |= 0b00000010 // 7th
    if (this.isRecursionDesired) byte |= 0b00000001 // 8th
    byteArray[2] = byte
    // RA, Z (reserved), RCODE
    byte = 0
    if (this.isRecursionAvailable) byte |= 0b10000000
    // reserved is always 0 - reserved for future use
    byte |= this.responseCode
    byteArray[3] = byte
    // QDCOUNT
    ;[lowByte, highByte] = encodeBigEndian(this.questionCount)
    byteArray[4] = highByte
    byteArray[5] = lowByte
    // ANCOUNT
    ;[lowByte, highByte] = encodeBigEndian(this.answerRecordCount)
    byteArray[6] = highByte
    byteArray[7] = lowByte
    // NSCOUNT
    ;[lowByte, highByte] = encodeBigEndian(this.authorityRecordCount)
    byteArray[8] = highByte
    byteArray[9] = lowByte
    // ARCOUNT
    ;[lowByte, highByte] = encodeBigEndian(this.additionalRecordCount)
    byteArray[10] = highByte
    byteArray[11] = lowByte
    console.log('byteArray', byteArray)

    return byteArray
  }
}
