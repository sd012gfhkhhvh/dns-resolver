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
  type: z
    .string()
    .refine(isValidType, {
      message: "Invalid type!",
    })
    .optional()
    .default("A"),
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

    const { domain, type, host } = parsedQuery.data as QueryType;

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

    // res.json(dnsResponseObject);
    res.send(`
      <html>
      <head>
        <title>DNS Query Result</title>
        <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background: #f7f9fa;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 700px;
          margin: 40px auto;
          background: #fff;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.08);
          padding: 32px 40px 24px 40px;
        }
        h2 {
          color: #2d6cdf;
          margin-top: 0;
        }
        h3 {
          color: #444;
          margin-bottom: 8px;
        }
        p {
          font-size: 1.05em;
          margin: 8px 0;
        }
        strong {
          color: #222;
        }
        pre {
          background: #f4f6f8;
          border-radius: 6px;
          padding: 16px;
          font-size: 0.97em;
          overflow-x: auto;
          border: 1px solid #e0e6ed;
        }
        </style>
      </head>
      <body>
        <div class="container">
        <h2>Query Result for ${domain} (${type.toUpperCase()})</h2>
        <p><strong>Queried DNS Server:</strong> ${
          host || `${FORWARD_SERVER_HOST}:${FORWARD_SERVER_PORT}`
        }</p>
        <p><strong>Response Code:</strong> ${
          dnsResponseObject.header?.rcode
        }</p>
        <p><strong>Answer Count:</strong> ${
          dnsResponseObject.header?.ancount
        }</p>
        <p><strong>Authority Count:</strong> ${
          dnsResponseObject.header?.nscount
        }</p>
        <p><strong>Additional Count:</strong> ${
          dnsResponseObject.header?.arcount
        }</p>
        <h3>Full Response Object:</h3>
        <pre>${JSON.stringify(dnsResponseObject, null, 2)}</pre>
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal server error");
  }
});

app.listen(HTTP_PORT, () => {
  console.log(`Forwarding server listening on port ${HTTP_PORT}`);
});
