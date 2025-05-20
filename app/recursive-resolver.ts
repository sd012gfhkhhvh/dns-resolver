import { ResponseCode, type DNSPacketType } from "./types";
import { rootNameServers } from "./root-name-server";
import { forwardResolver } from "./forward-resolver";
import { DNSPacket } from "./dns-packet/DNSPacket";
import { pickRandomFromArray } from "./utils";

const QUERY_PORT = 53;

export async function recursiveResolver(
  dnsObject: DNSPacketType
): Promise<DNSPacketType | null | undefined> {
  try {
    const queryObject = DNSPacket.encodeRaw(dnsObject);
    let flag = true;
    let maxTrials = 3;
    let queryResponse: DNSPacketType | null = null;

    while (flag && maxTrials--) {
      // query the root name servers
      queryResponse = await forwardResolver(
        queryObject,
        QUERY_PORT,
        pickRandomFromArray(rootNameServers)
      );

      // if the response is not an error
      if (queryResponse.header.rcode !== ResponseCode.NO_ERROR) {
        continue;
      }

      if (
        queryResponse.header.ancount > 0 &&
        queryResponse.header.nscount === 0
      ) {
        flag = false;
        break;
      }

      // if there are authority records
      if (queryResponse.header.nscount > 0) {
        const tldServers = queryResponse.authorities.map(
          (authority) => authority.rdata
        );
        // query the tld name servers
        queryResponse = await forwardResolver(
          queryObject,
          QUERY_PORT,
          pickRandomFromArray(tldServers)
        );
        if (queryResponse.header.rcode !== ResponseCode.NO_ERROR) {
          continue;
        }
        if (
          queryResponse.header.ancount > 0 &&
          queryResponse.header.nscount === 0
        ) {
          flag = false;
          break;
        }

        // if there are additional records
        if (queryResponse.header.nscount > 0) {
          const domainServers = queryResponse.authorities.map(
            (authority) => authority.rdata
          );
          // query the authoritative domain name servers
          queryResponse = await forwardResolver(
            queryObject,
            QUERY_PORT,
            pickRandomFromArray(domainServers)
          );
          if (queryResponse.header.rcode !== ResponseCode.NO_ERROR) {
            continue;
          }
          if (
            queryResponse.header.ancount > 0 &&
            queryResponse.header.nscount === 0
          ) {
            flag = false;
            break;
          }
        }
      }
    }
    return queryResponse;
  } catch (e) {
    console.log(e);
  }
}
