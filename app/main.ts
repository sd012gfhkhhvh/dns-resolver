import * as dgram from "dgram";
import dnsPacket from "dns-packet"; // 3rd party module to decode and encode DNS packets
import { DNSPacket } from "./dns-packet/DNSPacket";
import { recursiveResolver } from "./recursive-resolver";
import type { DNSPacketType } from "./types";

//socket connection
const udpSocket: dgram.Socket = dgram.createSocket("udp4");

udpSocket.bind(2053, "127.0.0.1", () => {
  console.log("bind done!");
});

udpSocket.on("listening", () => {
  const address = udpSocket.address();
  console.log(`UDP Server listening on ${address.address}:${address.port}`);
});

udpSocket.on("error", (err) => {
  console.log(`server error:\n${err.stack}`);
  udpSocket.close();
});

udpSocket.on("close", () => {
  console.log("server closed");
});

// receive data
udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
  try {
    console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);
    console.log("raw packet : ", data);

    // decode packet
    const decodedDnsQueryPacket = DNSPacket.decode(data);
    const decodedDnsQueryObject = decodedDnsQueryPacket.toObject();
    console.log("decoded packet : ", decodedDnsQueryObject);

    // resolve query
    const dnsResponseObject: DNSPacketType = recursiveResolver(
      decodedDnsQueryObject
    );
    const responseBuffer = DNSPacket.encodeRaw(dnsResponseObject);

    console.log("response packet : ", responseBuffer);
    console.log("response packet Decoded : ", dnsResponseObject);
    // send data
    udpSocket.send(responseBuffer, remoteAddr.port, remoteAddr.address);
  } catch (e) {
    console.log(`Error sending data: ${e}`);
  }
});

/*
 * Use dig command to test the server
 * dig @127.0.0.1 -p 2053 +qid=1234 +noedns +noad google.com
 */
