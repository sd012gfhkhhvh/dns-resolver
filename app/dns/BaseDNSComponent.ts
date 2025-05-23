/**
 * Abstract class representing a base DNS component.
 * This class provides a structure for encoding DNS components
 * and converting them to raw objects.
 */
export abstract class BaseDNSComponent<T> {
  /**
   * Encodes the DNS component into a Buffer.
   *
   * @returns The encoded DNS component as a Buffer.
   */
  abstract encode(): Buffer;

  /**
   * Converts the DNS component into a raw object.
   *
   * @returns {T} The raw object representation of the DNS component.
   */
  abstract toObject(): T;
}
