
class DNSQuestion {
  name: string = "google.com";
  type: number = 1;   // Type A (host address)
  class: number = 1;  // Class IN (Internet)

  constructor(partial: Partial<DNSQuestion> = {}) {
    Object.assign(this, partial);
  }

  public encode(): Buffer {
    // Encode domain name to DNS format
    const nameBuffer = this.encodeDomainName(this.name);
    const bufferSize = nameBuffer.length + 4; // 2 bytes for type, 2 bytes for class
    const buffer = Buffer.alloc(bufferSize);

    // Copy name into buffer
    nameBuffer.copy(buffer, 0);

    // Write type and class
    buffer.writeUInt16BE(this.type, nameBuffer.length);
    buffer.writeUInt16BE(this.class, nameBuffer.length + 2);

    return buffer;
  }

  // Recommended method: returns Buffer with proper DNS-encoded domain name
  private encodeDomainName(domain: string): Buffer {
    const labels = domain.split(".");
    const bytes = labels.flatMap((label) => [
      label.length,
      ...Buffer.from(label),
    ]);
    return Buffer.from([...bytes, 0]); // End with null byte
  }

  // Alternate method using String.fromCharCode()
  // Useful for cases where you want to return a string first and convert later
  private encodeDomainNameAlt(domain: string): Buffer {
    const encodedStr =
      domain
        .split(".")
        .map((label) => String.fromCharCode(label.length) + label)
        .join("") + "\x00";
    return Buffer.from(encodedStr, "latin1"); // Use latin1 to preserve byte values
  }
}

export default DNSQuestion;

// Example usage
const testQuestion = new DNSQuestion();
console.log(testQuestion.encode());

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
