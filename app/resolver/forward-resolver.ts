import dgram from 'dgram'
import { DNSPacket } from '../dns/DNSPacket'
import type { DNSPacketType } from '../types'

export async function forwardResolver(
  queryPacket: Buffer,
  forwardPort: number,
  forwardHost: string,
): Promise<DNSPacketType> {
  console.log(`\x1b[32mForwarding to ${forwardHost}:${forwardPort} via UDP socket...\n\x1b[0m`)
  const udpSocket = dgram.createSocket({ type: 'udp4' })

  const answer = await new Promise<DNSPacketType>((resolve, reject) => {
    udpSocket.send(new Uint8Array(queryPacket), forwardPort, forwardHost)

    udpSocket.on('message', (msg: Buffer) => {
      try {
        console.log(`forwarded response:`, msg, '\n')
        console.log('forwarded response length: ', msg.length, '\n')

        const parsedResponse: DNSPacketType = DNSPacket.decode(msg).toObject()
        // console.log("parsed forwarded response: ", parsedResponse);

        resolve(parsedResponse)
      } catch (error) {
        console.error('Error in forwardResolver:', error, '\n')
        reject(error)
      } finally {
        udpSocket.close()
      }
    })

    udpSocket.on('error', (err) => {
      reject(err)
      udpSocket.close()
    })
  })

  return answer
}
