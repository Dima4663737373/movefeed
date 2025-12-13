
import type { NextApiRequest, NextApiResponse } from 'next';

const TARGET_INDEXER_URL = "https://indexer.testnet.movementnetwork.xyz/v1/graphql";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(TARGET_INDEXER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error("Indexer Proxy Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
