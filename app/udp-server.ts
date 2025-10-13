import * as dgram from "dgram";
import dnsPacket from "dns-packet"; // 3rd party module to decode and encode DNS packets
import { DNSPacket } from "./dns/DNSPacket";
import { recursiveResolver } from "./resolver/recursive-resolver";
import { QR_FLAG, ResponseCode } from "./types";

// Default to 0.0.0.0 in container, 127.0.0.1 for local dev
const isDocker = process.env.DOCKER_ENV === "true" || process.env.REDIS_URL?.includes("redis-server");
const UDP_BIND_ADDRESS = process.env.UDP_BIND_ADDRESS || (isDocker ? "0.0.0.0" : "127.0.0.1");
const UDP_PORT = parseInt(process.env.UDP_PORT || "2053", 10);

console.log(`🔧 Binding to ${UDP_BIND_ADDRESS}:${UDP_PORT} (Docker: ${isDocker})`);

//socket connection
const udpSocket: dgram.Socket = dgram.createSocket("udp4");

udpSocket.bind(UDP_PORT, UDP_BIND_ADDRESS, () => {
  console.log("bind done!\n");
});

udpSocket.on("listening", () => {
  const address = udpSocket.address();
  console.log(
    `🚀 UDP Server is now active at ${address.address}:${address.port} 🚀\n`
  );
});

udpSocket.on("error", (err) => {
  console.log(`server error:\n${err.stack}\n`);
  udpSocket.close();
});

udpSocket.on("close", () => {
  console.log("server closed\n");
});

// receive data
udpSocket.on("message", async (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
  try {
    console.log(
      `\x1b[32m✨ Received data from ${remoteAddr.address}:${remoteAddr.port} ✨\x1b[0m\n`
    );
    // console.log("raw packet : ", data, "\n");

    // decode packet
    const decodedDnsQueryPacket = DNSPacket.decode(data);
    const decodedDnsQueryObject = decodedDnsQueryPacket.toObject();
    console.log("decoded packet : ", decodedDnsQueryObject, "\n");

    // resolve query
    const dnsResponseObject = await recursiveResolver(decodedDnsQueryObject);
    console.log("resolved packet : ", dnsResponseObject, "\n");

    let responseBuffer: Buffer;
    // if response is not found
    if (!dnsResponseObject) {
      console.log("address not found\n");
      responseBuffer = DNSPacket.encodeRaw({
        header: {
          ...decodedDnsQueryObject.header,
          aa: 0,
          ra: 1,
          qr: QR_FLAG.RESPONSE,
          rcode: ResponseCode.NAME_ERROR,
        },
        questions: decodedDnsQueryObject.questions,
        answers: [],
        authorities: [],
        additionals: [],
      });
    } else {
      responseBuffer = DNSPacket.encodeRaw(dnsResponseObject);
      console.log("response packet buffer: ", responseBuffer, "\n");
      console.log("response packet length: ", responseBuffer.length, "\n");
    }
    // send data
    udpSocket.send(responseBuffer, remoteAddr.port, remoteAddr.address);
  } catch (e) {
    console.log(`Error sending data: ${e}\n`);
  }
});

/*
 * Use dig command to test the server
 * dig @127.0.0.1 -p 2053 +qid=1234 +noedns +noad google.com
 */
