import * as dgram from 'dgram'
import dnsPacket from 'dns-packet' // 3rd party module to decode and encode DNS packets
import { DNSPacket } from './dns/DNSPacket'
import { recursiveResolver as resolveQuery } from './resolver/recursive-resolver'

// Default to 0.0.0.0 in container, 127.0.0.1 for local dev
const isDocker =
  process.env.DOCKER_ENV === 'true' || process.env.REDIS_URL?.includes('redis-server')
const UDP_BIND_ADDRESS = process.env.UDP_BIND_ADDRESS || (isDocker ? '0.0.0.0' : '127.0.0.1')
const UDP_PORT = parseInt(process.env.UDP_PORT || '2053', 10)

console.log(`🔧 Binding to ${UDP_BIND_ADDRESS}:${UDP_PORT} (Docker: ${isDocker})`)

//socket connection
const udpSocket: dgram.Socket = dgram.createSocket('udp4')

udpSocket.bind(UDP_PORT, UDP_BIND_ADDRESS, () => {
  console.log('bind done!\n')
})

udpSocket.on('listening', () => {
  const address = udpSocket.address()
  console.log(`🚀 UDP Server is now active at ${address.address}:${address.port} 🚀\n`)
})

udpSocket.on('error', (err) => {
  console.log(`server error:\n${err.stack}\n`)
  udpSocket.close()
})

udpSocket.on('close', () => {
  console.log('server closed\n')
})

// receive data
udpSocket.on('message', async (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
  try {
    console.log(
      `\x1b[32m✨ Received DNS query from ${remoteAddr.address}:${remoteAddr.port} ✨\x1b[0m\n`,
    )
    console.log('raw packet : ', data, '\n')
    console.log('raw packet length: ', data.length, '\n')

    // decode request packet
    const decodedDnsQueryPacket = DNSPacket.decode(data)
    const decodedDnsQueryObject = decodedDnsQueryPacket.toObject()
    console.log('decoded packet : ', decodedDnsQueryObject, '\n')

    // resolve query
    const responseObject = await resolveQuery(decodedDnsQueryObject)
    console.log('resolved packet : ', responseObject, '\n')

    // encode response
    const responseBuffer = DNSPacket.encodeRaw(responseObject)
    console.log('response packet buffer: ', responseBuffer, '\n')
    console.log('response packet length: ', responseBuffer.length, '\n')

    const finalResponse = new Uint8Array(responseBuffer) // convert to Uint8Array for sending response

    // send data
    udpSocket.send(finalResponse, 0, finalResponse.length, remoteAddr.port, remoteAddr.address)
  } catch (e: any) {
    console.log(`Error sending DNS response: ${e}\n`)
  }
})

/*
 * Use dig command to test the server
 * dig @127.0.0.1 -p 2053 +qid=1234 +noedns +noad google.com
 */
