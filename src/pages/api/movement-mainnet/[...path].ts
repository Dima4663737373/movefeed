/**
 * Movement Network Mainnet RPC Proxy
 * 
 * This API route proxies requests to Movement Network RPC to avoid CORS issues
 * when making requests from the browser.
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { MOVEMENT_MAINNET_RPC_DIRECT } from '@/lib/movement';
import { IncomingMessage } from 'http';

// Simple in-memory rate limiter
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_IP = 1000; // Increased to 1000 requests per minute per IP to prevent 429 errors during development

const requestCounts = new Map<string, { count: number; startTime: number }>();

export const config = {
  api: {
    bodyParser: false, // Disable body parsing to handle streams/binary data
  },
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Rate Limiting
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ipStr = Array.isArray(ip) ? ip[0] : ip;

    const now = Date.now();
    const record = requestCounts.get(ipStr);

    if (record) {
        if (now - record.startTime > RATE_LIMIT_WINDOW) {
            // Reset window
            requestCounts.set(ipStr, { count: 1, startTime: now });
        } else {
            if (record.count >= MAX_REQUESTS_PER_IP) {
                return res.status(429).json({ error: 'Too many requests' });
            }
            record.count++;
        }
    } else {
        requestCounts.set(ipStr, { count: 1, startTime: now });
    }

    // Set CORS headers immediately
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept, Authorization, x-aptos-chain-id, x-aptos-ledger-version');

    // Handle OPTIONS request
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }

    // Only allow GET and POST methods
    if (req.method !== 'GET' && req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Get the path from the query parameter
    const { path } = req.query;

    if (!path) {
      return res.status(400).json({ error: 'Invalid path' });
    }

    // Handle both array and string paths
    let pathArray: string[] = [];
    if (Array.isArray(path)) {
      pathArray = path;
    } else if (typeof path === 'string') {
      pathArray = [path];
    } else {
      return res.status(400).json({ error: 'Invalid path format' });
    }

    // Build the target URL
    // Path will be like ['v1', 'accounts', ...] or ['accounts', ...]
    
    // Normalize base URL to remove trailing slash
    const baseUrl = MOVEMENT_MAINNET_RPC_DIRECT.replace(/\/$/, '');
    
    // Check if base URL ends with /v1
    const baseEndsWithV1 = baseUrl.endsWith('/v1');
    
    // Check if path starts with v1
    const pathStartsWithV1 = pathArray.length > 0 && pathArray[0] === 'v1';

    // If base URL includes v1 and path also starts with v1, remove it from path
    // This handles cases where SDK appends v1 to a base that already has it
    if (baseEndsWithV1 && pathStartsWithV1) {
        pathArray.shift();
    }

    // For URL paths with Move resource types containing ::
    // We need to properly encode each segment
    const pathString = pathArray.map(segment => encodeURIComponent(segment)).join('/');

    // Build URL correctly
    let targetUrl = MOVEMENT_MAINNET_RPC_DIRECT;
    if (pathString) {
      targetUrl = `${targetUrl.replace(/\/$/, '')}/${pathString}`;
    }

    // Add query parameters if GET request
    if (req.method === 'GET') {
      const url = new URL(targetUrl);
      // We need to parse the query string manually since bodyParser is false
      // But req.query is still populated by Next.js from the URL
      Object.keys(req.query).forEach(key => {
        if (key !== 'path') {
          const value = req.query[key];
          if (Array.isArray(value)) {
            value.forEach(v => url.searchParams.append(key, v));
          } else if (value) {
            url.searchParams.append(key, value);
          }
        }
      });
      targetUrl = url.toString();
    }

    console.log(`[RPC Proxy Mainnet] ${req.method} ${targetUrl}`);

    // Forward the request to Movement Network RPC
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

    const headers: Record<string, string> = {
      'Accept': req.headers.accept || 'application/json',
      'User-Agent': 'MicroThreads-Tips/1.0',
    };

    // Forward Content-Type if present
    if (req.headers['content-type']) {
      headers['Content-Type'] = req.headers['content-type'];
    }

    const fetchOptions: RequestInit = {
      method: req.method,
      headers: headers,
      signal: controller.signal,
    };

    // If POST, stream the body
    if (req.method === 'POST') {
      // @ts-ignore - fetch accepts ReadableStream/IncomingMessage in Node environment
      fetchOptions.body = req;
      // Important: duplex: 'half' is required for Node.js fetch with streams
      // @ts-ignore
      fetchOptions.duplex = 'half';
    }

    let response: Response;
    try {
      response = await fetch(targetUrl, fetchOptions);
    } catch (fetchError: any) {
      console.error('[RPC Proxy Mainnet] Fetch error:', fetchError);
      throw fetchError;
    }

    clearTimeout(timeoutId);

    // Forward status
    res.status(response.status);

    // Check if response is HTML error page (common with 502/503 from Cloudflare/Nginx)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html') && response.status >= 500) {
        console.warn(`[RPC Proxy Mainnet] Upstream returned HTML error ${response.status}`);
        return res.status(response.status).json({
            errorCode: 'RPC_GATEWAY_ERROR',
            message: `Movement Mainnet RPC is currently unavailable (Status ${response.status}).`,
            details: 'The upstream node returned an HTML error page (Bad Gateway / Service Unavailable).'
        });
    }

    // Forward headers
    response.headers.forEach((value, key) => {
      // Skip some headers that might cause issues
      if (key !== 'content-encoding' && key !== 'content-length') {
        res.setHeader(key, value);
      }
    });

    // Stream the response back
    if (response.body) {
      // @ts-ignore - response.body is a ReadableStream
      const reader = response.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.end();
    }

  } catch (error: any) {
    console.error('[RPC Proxy Mainnet Error]', error);
    if (!res.headersSent) {
      const isTimeout = error.name === 'AbortError' || error.message === 'This operation was aborted';
      
      if (isTimeout) {
        res.status(504).json({
          error: 'Gateway Timeout',
          message: 'Upstream RPC request timed out after 60 seconds'
        });
      } else {
        res.status(500).json({
          error: 'Failed to proxy request',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }
}
