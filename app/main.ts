import * as dgram from "dgram";
import dnsPacket from "dns-packet"; // 3rd party module to decode and encode DNS packets
import DNSQuestion from "./question";
import DNSHeader from "./header";

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

// dns default header
const defaultHeader = new DNSHeader({ id: 1234, qr: 1, qdcount: 1 });

// dns default question
const defaultQuestion = new DNSQuestion({
  name: "codecrafters.io",
  type: 1,
  class: 1,
});

// receive data
udpSocket.on("message", (data: Buffer, remoteAddr: dgram.RemoteInfo) => {
  try {
    const DecodedPacket = dnsPacket.decode(data);
    console.log(`Received data from ${remoteAddr.address}:${remoteAddr.port}`);
    console.log("raw packet : ", data);
    console.log("decoded packet : ", DecodedPacket);

    const responseHeader = defaultHeader.encode();
    const responseQuestion = defaultQuestion.encode();

    const response = Buffer.concat([responseHeader, responseQuestion]);
    console.log("response packet : ", response);
    console.log("response packet Decoded : ", dnsPacket.decode(response));
    // send data
    udpSocket.send(response, remoteAddr.port, remoteAddr.address);
  } catch (e) {
    console.log(`Error sending data: ${e}`);
  }
});

/*
 * Use dig command to test the server
 * dig @127.0.0.1 -p 2053 +qid=1234 google.com
 */
