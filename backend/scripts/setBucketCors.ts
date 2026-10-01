import { env } from "../src/config/env.js";

async function updateB2Cors() {
  const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_BUCKET_NAME } = env;

  if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY || !S3_BUCKET_NAME) {
    console.error("Missing B2 credentials in .env");
    process.exit(1);
  }

  console.log("1. Authorizing with B2 Native API...");
  const authHeader = "Basic " + Buffer.from(`${S3_ACCESS_KEY_ID}:${S3_SECRET_ACCESS_KEY}`).toString("base64");
  const authRes = await fetch("https://api.backblazeb2.com/b2api/v3/b2_authorize_account", {
    headers: { Authorization: authHeader },
  });

  if (!authRes.ok) {
    const errorText = await authRes.text();
    throw new Error(`b2_authorize_account failed (${authRes.status}): ${errorText}`);
  }

  const authData = (await authRes.json()) as any;
  const apiUrl = authData.apiInfo?.storageApi?.apiUrl ?? authData.apiUrl;
  const authToken = authData.authorizationToken;
  const accountId = authData.accountId;

  console.log("✅ Authorized successfully. Account ID:", accountId, "API URL:", apiUrl);

  console.log(`2. Finding bucketId for "${S3_BUCKET_NAME}"...`);
  const listBucketsRes = await fetch(`${apiUrl}/b2api/v3/b2_list_buckets`, {
    method: "POST",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accountId: accountId,
      bucketName: S3_BUCKET_NAME,
    }),
  });

  if (!listBucketsRes.ok) {
    const errorText = await listBucketsRes.text();
    throw new Error(`b2_list_buckets failed (${listBucketsRes.status}): ${errorText}`);
  }

  const listBucketsData = (await listBucketsRes.json()) as {
    buckets: Array<{ bucketId: string; bucketName: string; corsRules: unknown[] }>;
  };

  const bucket = listBucketsData.buckets.find((b) => b.bucketName === S3_BUCKET_NAME);
  if (!bucket) {
    throw new Error(`Bucket "${S3_BUCKET_NAME}" not found in account.`);
  }

  console.log("✅ Found bucketId:", bucket.bucketId);

  console.log("3. Updating CORS rules with s3_put, s3_get, s3_head, and wildcard headers...");
  const updateRes = await fetch(`${apiUrl}/b2api/v3/b2_update_bucket`, {
    method: "POST",
    headers: {
      Authorization: authToken,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accountId: accountId,
      bucketId: bucket.bucketId,
      corsRules: [
        {
          corsRuleName: "allow-frontend-uploads",
          allowedOrigins: [
            "https://chatbot-builder-pearl-sigma.vercel.app",
            "http://localhost:3000",
            "http://localhost:5000",
          ],
          allowedOperations: [
            "s3_put",
            "s3_get",
            "s3_head",
            "s3_post",
            "s3_delete",
            "b2_upload_file",
            "b2_upload_part",
            "b2_download_file_by_name",
            "b2_download_file_by_id",
          ],
          allowedHeaders: ["*"],
          exposeHeaders: ["ETag"],
          maxAgeSeconds: 3600,
        },
      ],
    }),
  });

  if (!updateRes.ok) {
    const errorText = await updateRes.text();
    throw new Error(`b2_update_bucket failed (${updateRes.status}): ${errorText}`);
  }

  const updatedBucket = (await updateRes.json()) as any;
  console.log("🎉 B2 CORS rules successfully updated!");
  console.log("Updated CORS Rules:", JSON.stringify(updatedBucket.corsRules, null, 2));
}

updateB2Cors().catch((err) => {
  console.error("❌ Failed to update B2 CORS rules:", err);
  process.exit(1);
});
