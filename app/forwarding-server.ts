import express, { type Request, type Response } from "express";
import { z } from "zod";
import { isValidDomain, isValidIpv4, isValidType } from "./utils";
import {
  QR_FLAG,
  RecordClass,
  RecordType,
  RecordTypeString,
  type DNSPacketType,
} from "./types";
import { forwardResolver } from "./resolver/forward-resolver";
import { DNSPacket } from "./dns/DNSPacket";

const app = express();

const HTTP_PORT = 8080;

const FORWARD_SERVER_PORT = 2053; // our own UDP server port
const FORWARD_SERVER_HOST = "127.0.0.1"; // our own UDP server

const querySchema = z.object({
  domain: z.string().refine(isValidDomain, {
    message: "Invalid domain name!",
  }),
  type: z.string().refine(isValidType, {
    message: "Invalid type!",
  }),
  host: z
    .string()
    .refine(isValidIpv4, {
      message: "Invalid host name!",
    })
    .optional(),
});

type QueryType = z.infer<typeof querySchema>;

app.get("/", (req, res) => {
  res.send("Hello from the forwarding server!");
});

app.get("/resolve", async (req: Request, res: Response) => {
  try {
    // validate query
    const parsedQuery = querySchema.safeParse(req.query);

    if (!parsedQuery.success) {
      console.error(parsedQuery.error);
      res.status(400).send(parsedQuery.error.message);
      return;
    }

    const { domain, type, host } = req.query as QueryType;

    const dnsQueryObject: DNSPacketType = {
      header: {
        id: 1234,
        qr: QR_FLAG.QUERY,
        opcode: 0,
        aa: 0,
        tc: 0,
        rd: 1,
        ra: 0,
        z: 0,
        rcode: 0,
        qdcount: 1,
        ancount: 0,
        nscount: 0,
        arcount: 0,
      },
      questions: [
        {
          name: domain,
          type: RecordType[type.toUpperCase() as RecordTypeString],
          class: RecordClass.IN,
        },
      ],
      answers: [],
      authorities: [],
      additionals: [],
    };

    const dnsQueryPacket: Buffer = DNSPacket.encodeRaw(dnsQueryObject);

    const dnsResponseObject = await forwardResolver(
      dnsQueryPacket,
      host ? 53 : FORWARD_SERVER_PORT,
      host || FORWARD_SERVER_HOST
    );

    res.json(dnsResponseObject);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`Forwarding server listening on port ${HTTP_PORT}`);
});
