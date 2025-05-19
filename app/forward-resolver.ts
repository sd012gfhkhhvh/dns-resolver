import dgram from "dgram";
import { DNSPacket } from "./dns-packet/DNSPacket";
import type { DNSPacketType } from "./types";

export async function forwardResolver(
  queryPacket: Buffer,
  forwardPort: number,
  forwardHost: string
): Promise<DNSPacketType> {
  const udpSocket = dgram.createSocket("udp4");

  const answer = await new Promise<DNSPacketType>((resolve, reject) => {
    udpSocket.send(queryPacket, forwardPort, forwardHost);

    udpSocket.on("message", (msg: Buffer) => {
      try {
        console.log("response: ", msg);
        console.log("response length: ", msg.length);

        const parsedResponse: DNSPacketType = DNSPacket.decode(msg).toObject();
        console.log("parsed response: ", parsedResponse);

        udpSocket.close();
        resolve(parsedResponse);
      } catch (error) {
        console.error("Error in forwardResolver:", error);
        reject(error);
      }
    });

    udpSocket.on("error", (err) => {
      reject(err);
      udpSocket.close();
    });
  });

  return answer;
}
