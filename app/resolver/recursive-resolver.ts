import {
  QR_FLAG,
  RecordType,
  ResponseCode,
  type DNSAnswerType,
  type DNSPacketType,
  type DNSQuestionType,
} from "../types";
import { rootNameServers } from "../root-name-server";
import { forwardResolver } from "./forward-resolver";
import { DNSPacket } from "../dns/DNSPacket";
import { isValidDomain, pickRandomFromArray } from "../utils";
import { DNSCache } from "../cache/dns-cache";

export async function recursiveResolver(
  requestObjects: DNSPacketType
): Promise<DNSPacketType> {
  try {
    // if there are multiple questions then resolve them one by one
    const dnsQueryResponseObjects: DNSPacketType[] = [];
    const cache = new DNSCache();

    for (const question of requestObjects.questions) {
      // check if the answer is in the cache
      const cachedAnswers = await cache.getDNSAnswer(question);

      // if the answer is in the cache build the response packet
      if (cachedAnswers) {
        console.log("cache hit");
        const responseObject: DNSPacketType = {
          header: {
            ...requestObjects.header,
            qr: QR_FLAG.RESPONSE,
            ra: 1,
            ancount: cachedAnswers.length,
          },
          questions: [question],
          answers: cachedAnswers,
          authorities: [],
          additionals: [],
        };
        dnsQueryResponseObjects.push(responseObject);
      } else {
        console.log("cache miss");
        // build dns packet with one question
        const dnsQuery = new DNSPacket({
          header: { ...requestObjects.header, qdcount: 1 },
          questions: [question],
        }).toObject();

        const result = await recursiveLookup(dnsQuery);
        if (result) {
          dnsQueryResponseObjects.push(result);
          const setResult = await cache.setDNSAnswer(question, result.answers);
          if (setResult == "OK") {
            console.log("set in cache");
          }
        }
      }
    }

    return dnsQueryResponseObjects.find(
      (response) => response != null && response != undefined
    ) as DNSPacketType;
  } catch (e) {
    return e as DNSPacketType;
  }
}

export async function recursiveLookup(
  requestObject: DNSPacketType
): Promise<DNSPacketType> {
  try {
    let rootNameServerIP = pickRandomFromArray(rootNameServers).ipv4;
    const resolverPort = 53;

    while (true) {
      let rootnameServerIPCopy = rootNameServerIP;
      let requestHeader = requestObject.header;
      let requestQuestion = requestObject.questions[0];
      let requestAuthorities = requestObject.authorities;
      let requestAdditionals = requestObject.additionals;

      const requestBuffer = new DNSPacket(requestObject).encode();
      let dnsResponse = await forwardResolver(
        requestBuffer,
        resolverPort,
        rootnameServerIPCopy
      );

      // throw error if response is not received
      if (!dnsResponse) {
        throw new Error("No response received");
      }

      // id response is giving an error of NAME_ERROR then return the response
      if (dnsResponse.header.rcode === ResponseCode.NAME_ERROR) {
        return {
          ...dnsResponse,
          header: {
            ...dnsResponse.header,
            aa: 0,
            ra: 1,
            qr: QR_FLAG.RESPONSE,
            rcode: ResponseCode.NAME_ERROR,
          },
        };
      }

      // if find answer return and end loop
      if (dnsResponse.answers && dnsResponse.answers.length > 0) {
        const answers = dnsResponse.answers;
        const cnameAnswers = answers.filter(
          (answer) => answer.type === RecordType.CNAME
        );
        // if cname record is present then we have to resolve the cname record to get the ip
        // unless user has asked for cname record explicitly
        if (
          cnameAnswers.length > 0 &&
          requestQuestion.type !== RecordType.CNAME
        ) {
          for (const cnameAnswer of cnameAnswers) {
            const cnameQuestion: DNSQuestionType = {
              name: cnameAnswer.rdata as string,
              type: RecordType.CNAME,
              class: 1,
            };
            const cnameDNSPacket = new DNSPacket({
              header: requestHeader,
              questions: [cnameQuestion],
              authorities: requestAuthorities,
              additionals: requestAdditionals,
            });
            const res = await recursiveLookup(cnameDNSPacket.toObject());
            if (res?.answers) answers.push(...res.answers);
          }
        }
        const finalResponse = new DNSPacket({
          header: {
            ...dnsResponse.header,
            ancount: answers.length,
            aa: 0,
            ra: 1,
            // tc: 0,
            nscount: 0,
            arcount: 0,
          },
          questions: [requestQuestion],
          answers,
          authorities: [],
          additionals: [],
        }).toObject();

        return finalResponse;
      }

      // if find additional use those ip and continue the loop in hope that you will get the answer
      if (dnsResponse.additionals && dnsResponse.additionals.length > 0) {
        const additionalWithIPv4 = dnsResponse.additionals.filter((record) => {
          if (record.rdlength === 4) {
            return record;
          }
        });
        const randomAdditional = pickRandomFromArray(
          additionalWithIPv4
        ) as DNSAnswerType;
        rootNameServerIP = randomAdditional.rdata;
        continue;
      }

      // if authority is present while additional is not present simply means, now we have to perform another lookup to get the additional records or basically ip of these authority servers to proceed with the original query
      let validAuthorityRecord: DNSAnswerType | undefined;
      if (
        dnsResponse.authorities &&
        dnsResponse.authorities.length > 0 &&
        (!dnsResponse.additionals || dnsResponse.additionals.length === 0)
      ) {
        const validAuthorityRecords = dnsResponse.authorities
          .map((authorityRecord) => {
            return {
              ...authorityRecord,
              name: authorityRecord.rdata || "",
            };
          })
          .filter((authorityRecord) => {
            if (isValidDomain(String(authorityRecord.name))) {
              return authorityRecord;
            }
          });
        validAuthorityRecord = pickRandomFromArray(validAuthorityRecords);

        // if validAuthorityRecord is a SOA record then return the response with SOA record
        if (validAuthorityRecord?.type === RecordType.SOA) {
          return {
            header: {
              ...requestHeader,
              qr: QR_FLAG.RESPONSE,
              rcode: ResponseCode.NAME_ERROR,
              nscount: dnsResponse.authorities
                ? dnsResponse.authorities.length
                : 0,
            },
            questions: [requestQuestion],
            answers: [],
            authorities: dnsResponse.authorities || [],
            additionals: dnsResponse.additionals || [],
          } as DNSPacketType;
        }
      }

      if (validAuthorityRecord) {
        const newQuery = new DNSPacket({
          header: requestHeader,
          questions: [
            {
              name: validAuthorityRecord.name,
              type: requestQuestion.type,
              class: validAuthorityRecord.class,
            },
          ],
        }).toObject();
        const res = await recursiveLookup(newQuery);

        if (res.answers) {
          const randomResponse: DNSAnswerType = pickRandomFromArray(
            res.answers
          );
          rootNameServerIP = randomResponse.rdata;
          continue;
        }
      }

      // If no valid authority record or additional records found, return NAME_ERROR with SOA if possible
      return new DNSPacket({
        header: {
          ...requestHeader,
          qr: QR_FLAG.RESPONSE,
          aa: 0,
          ra: 1,
          rcode: ResponseCode.NAME_ERROR,
          nscount: dnsResponse.authorities ? dnsResponse.authorities.length : 0,
        },
        questions: [requestQuestion],
        answers: [],
        authorities: dnsResponse.authorities || [],
        additionals: [],
      }).toObject();
    }
  } catch (error) {
    console.error("Error in recursiveLookup:", error);
    return new DNSPacket({
      header: {
        ...requestObject.header,
        aa: 0,
        ra: 1,
        qr: QR_FLAG.RESPONSE,
        rcode: ResponseCode.NAME_ERROR,
      },
      questions: requestObject.questions,
      answers: [],
      authorities: [],
      additionals: [],
    }).toObject();
  }
}
