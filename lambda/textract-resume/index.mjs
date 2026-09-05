import { TextractClient, DetectDocumentTextCommand } from "@aws-sdk/client-textract";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

const textract = new TextractClient({ region: "us-east-1" });
const s3 = new S3Client({ region: "us-east-1" });

export const handler = async (event) => {
  let bucket, key;
  try {
    const body = typeof event.body === "string" ? JSON.parse(event.body) : event.body ?? event;
    bucket = body.bucket;
    key = body.key;
  } catch {
    return reply(400, { error: "Invalid JSON body" });
  }

  if (!bucket || !key) return reply(400, { error: "bucket and key are required" });

  try {
    // Step 1: Download file bytes from S3
    const s3Res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const chunks = [];
    for await (const chunk of s3Res.Body) chunks.push(chunk);
    const bytes = Buffer.concat(chunks);

    let result;
    try {
      // Step 2a: Try Bytes first (fast, works for images & single-page PDFs)
      result = await textract.send(new DetectDocumentTextCommand({
        Document: { Bytes: bytes }
      }));
    } catch (bytesErr) {
      // Step 2b: Bytes fails for multi-page PDFs → use S3Object reference
      if (bytesErr.name === 'UnsupportedDocumentException' ||
          (bytesErr.message && bytesErr.message.includes('unsupported'))) {
        console.log('Bytes approach failed, trying S3Object reference for:', key);
        result = await textract.send(new DetectDocumentTextCommand({
          Document: { S3Object: { Bucket: bucket, Name: key } }
        }));
      } else {
        throw bytesErr;
      }
    }

    const text = (result.Blocks ?? [])
      .filter(b => b.BlockType === "LINE" && b.Text)
      .map(b => b.Text)
      .join("\n");

    return reply(200, { text });
  } catch (err) {
    console.error("Error:", err);
    return reply(500, { error: err.message ?? "Textract processing failed" });
  }
};

function reply(statusCode, body) {
  return {
    statusCode,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(body),
  };
}

