import {
  QR_FLAG,
  RecordType,
  ResponseCode,
  type DNSAnswerType,
  type DNSPacketType,
  type DNSQuestionType,
} from '../types'
import { rootNameServers } from '../root-name-server'
import { forwardResolver } from './forward-resolver'
import { DNSPacket } from '../dns/DNSPacket'
import { isValidDomain, pickRandomFromArray } from '../utils'
import { DNSCache } from '../cache/dns-cache'

/**
 * Resolves DNS queries recursively, utilizing a cache for improved performance.
 *
 * This function takes a DNS packet containing one or more questions and attempts to resolve
 * each question individually. It first checks if an answer to the question is available in
 * the cache. If a cached answer is found, it constructs a response packet using the cached
 * data. If the answer is not in the cache, it performs a recursive DNS lookup to obtain the
 * answer, caches the result if valid, and constructs a response packet.
 *
 * @param {DNSPacketType} requestObject - The DNS packet containing questions to be resolved.
 * @returns {Promise<DNSPacketType>} A promise that resolves to a DNS packet containing the
 * answers to the questions.
 */

export async function recursiveResolver(requestObject: DNSPacketType): Promise<DNSPacketType> {
  try {
    const dnsQueryResponseObjects: DNSPacketType[] = []
    const cache = new DNSCache()

    // if there are multiple questions then resolve them one by one
    for (const question of requestObject.questions) {
      // check if the answer is in the cache
      const cachedAnswers = await cache.get(question)

      // if the answer is in the cache build the response packet
      if (cachedAnswers) {
        console.log('\x1b[32m\u2713\x1b[0m Cache hit! \n')
        const responseObject: DNSPacketType = {
          header: {
            ...requestObject.header,
            qr: QR_FLAG.RESPONSE,
            ra: 1,
            ancount: cachedAnswers.length,
          },
          questions: [question],
          answers: cachedAnswers,
          authorities: [],
          additionals: [],
        }
        dnsQueryResponseObjects.push(responseObject)
      } else {
        console.log('\x1b[31m\u2717\x1b[0m Cache miss! \n')
        // construct the dnsPacket Object with single question
        const dnsQuery = new DNSPacket({
          header: { ...requestObject.header, qdcount: 1 },
          questions: [question],
        }).toObject()

        const result = await recursiveLookup(dnsQuery)
        dnsQueryResponseObjects.push(result)
        // check for valid response to set in cache
        if (result.header.rcode === ResponseCode.NO_ERROR && result.answers.length > 0) {
          const setResult = await cache.set(question, result.answers)
          if (setResult == 'OK') {
            console.log('Set result in cache \n')
          } else {
            console.log('Unable to set in cache \n')
          }
        }
      }
    }
    // return the first valid response
    return dnsQueryResponseObjects.find(
      (response) => response != null && response != undefined,
    ) as DNSPacketType
  } catch (e) {
    return e as DNSPacketType
  }
}

/**
 * Recursive DNS lookup.
 *
 * This function takes a DNS packet object representing a query and performs a recursive DNS lookup.
 * It will return a DNS packet object representing the final response.
 *
 * @param {DNSPacketType} requestObject - The DNS packet object representing the query.
 * @returns {Promise<DNSPacketType>} - The final response DNS packet object.
 */
export async function recursiveLookup(requestObject: DNSPacketType): Promise<DNSPacketType> {
  try {
    let rootNameServerIP: string = pickRandomFromArray(rootNameServers).ipv4
    const resolverPort = 53

    let queryDomainName = requestObject.questions[0].name
    const queryType = requestObject.questions[0].type || RecordType.A

    for (;;) {
      const rootnameServerIPCopy = rootNameServerIP
      const requestHeader = requestObject.header
      const requestQuestion = requestObject.questions[0]
      const requestAuthorities = requestObject.authorities
      const requestAdditionals = requestObject.additionals

      console.log(
        `\x1b[36mLooking up ${queryDomainName} for ${RecordType[queryType]} record \x1b[0m\n`,
      )

      const requestBuffer = DNSPacket.encodeRaw(requestObject)
      // perform forward lookup
      const dnsResponse = await forwardResolver(requestBuffer, resolverPort, rootnameServerIPCopy)

      // throw error if response is not received
      if (!dnsResponse) {
        throw new Error('No response received')
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
        }
      }

      // if find answer return and end loop
      if (dnsResponse.answers && dnsResponse.answers.length > 0) {
        const answers = dnsResponse.answers
        const cnameAnswers = answers.filter((answer) => answer.type === RecordType.CNAME)
        // if cname record is present then we have to resolve the cname record to get the ip
        // unless user has asked for cname record explicitly
        if (cnameAnswers.length > 0 && requestQuestion.type !== RecordType.CNAME) {
          for (const cnameAnswer of cnameAnswers) {
            const cnameQuestion: DNSQuestionType = {
              name: cnameAnswer.rdata as string,
              type: RecordType.CNAME,
              class: 1,
            }
            const cnameDNSPacket = new DNSPacket({
              header: requestHeader,
              questions: [cnameQuestion],
              authorities: requestAuthorities,
              additionals: requestAdditionals,
            })
            queryDomainName = cnameQuestion.name
            const res = await recursiveLookup(cnameDNSPacket.toObject())
            if (res?.answers) answers.push(...res.answers)
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
        }).toObject()

        return finalResponse
      }

      // if find additional use those ip and continue the loop in hope that you will get the answer
      if (dnsResponse.additionals && dnsResponse.additionals.length > 0) {
        const additionalWithIPv4 = dnsResponse.additionals.filter((record) => {
          if (record.rdlength === 4) {
            return record
          }
        })
        const randomAdditional = pickRandomFromArray(additionalWithIPv4) as DNSAnswerType
        rootNameServerIP = randomAdditional.rdata as string
        queryDomainName = randomAdditional.name
        continue
      }

      // if authority is present while additional is not present simply means, now we have to perform another lookup to get the additional records or basically ip of these authority servers to proceed with the original query
      let validAuthorityRecord: DNSAnswerType | undefined
      if (
        dnsResponse.authorities &&
        dnsResponse.authorities.length > 0 &&
        (!dnsResponse.additionals || dnsResponse.additionals.length === 0)
      ) {
        const validAuthorityRecords = dnsResponse.authorities
          .map((authorityRecord) => {
            return {
              ...authorityRecord,
              name: authorityRecord.rdata || '',
            }
          })
          .filter((authorityRecord) => {
            if (isValidDomain(String(authorityRecord.name))) {
              return authorityRecord
            }
          })
        validAuthorityRecord = pickRandomFromArray(validAuthorityRecords)

        // if validAuthorityRecord is a SOA record then return the response with SOA record
        if (validAuthorityRecord?.type === RecordType.SOA) {
          return {
            header: {
              ...requestHeader,
              qr: QR_FLAG.RESPONSE,
              rcode: ResponseCode.NAME_ERROR,
              nscount: dnsResponse.authorities ? dnsResponse.authorities.length : 0,
            },
            questions: [requestQuestion],
            answers: [],
            authorities: dnsResponse.authorities || [],
            additionals: dnsResponse.additionals || [],
          } as DNSPacketType
        }
      }

      // if valid authority record is present then perform another lookup
      if (validAuthorityRecord) {
        console.log('validAuthorityRecord', validAuthorityRecord)

        const newQuery = new DNSPacket({
          header: requestHeader,
          questions: [
            {
              name: validAuthorityRecord.name,
              type: RecordType.A,
              class: validAuthorityRecord.class,
            },
          ],
        }).toObject()
        const res = await recursiveLookup(newQuery)

        if (res.answers && res.answers.length > 0) {
          const randomResponse: DNSAnswerType = pickRandomFromArray(res.answers)
          rootNameServerIP = randomResponse.rdata as string
          queryDomainName = randomResponse.name
          continue
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
      }).toObject()
    }
  } catch (error) {
    console.error('Error in recursiveLookup:', error, '\n')
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
    }).toObject()
  }
}
