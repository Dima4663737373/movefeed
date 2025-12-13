import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { verifySignature, formatPublicKey } from '../../lib/verify';
import { Ed25519PublicKey, AccountAddress, AuthenticationKey } from "@aptos-labs/ts-sdk";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase Admin client not initialized.' });
    }

    if (req.method === 'GET') {
        const { userAddress, targetAddress, includeLists } = req.query;

        if (!targetAddress) {
            return res.status(400).json({ error: 'Missing targetAddress' });
        }

        const target = (targetAddress as string).toLowerCase();
        
        // Fetch followers count and list
        const { data: followersData, error: followersError } = await supabaseAdmin
            .from('follows')
            .select('follower')
            .eq('following', target);

        if (followersError) {
             return res.status(500).json({ error: followersError.message });
        }

        const followers = followersData.map(f => f.follower);

        // Fetch following count and list
        const { data: followingData, error: followingError } = await supabaseAdmin
            .from('follows')
            .select('following')
            .eq('follower', target);

        if (followingError) {
             return res.status(500).json({ error: followingError.message });
        }

        const following = followingData.map(f => f.following);

        let isFollowing = false;
        if (userAddress) {
            const user = (userAddress as string).toLowerCase();
            isFollowing = followers.includes(user);
        }

        const response: any = {
            isFollowing,
            followersCount: followers.length,
            followingCount: following.length
        };

        if (includeLists === 'true') {
            response.followers = followers;
            response.following = following;
        }

        return res.status(200).json(response);

    } else if (req.method === 'POST') {
        const { userAddress, targetAddress, signature, message, publicKey } = req.body;

        if (!userAddress || !targetAddress) {
            return res.status(400).json({ error: 'Missing userAddress or targetAddress' });
        }

        // Security Check
        if (!signature || !message || !publicKey) {
             return res.status(401).json({ error: 'Missing authentication signature' });
        }

        try {
            const { valid, error: sigError } = verifySignature(message, signature, publicKey);
            if (!valid) return res.status(401).json({ error: `Invalid signature: ${sigError}` });

            if (!message.includes(`Toggle follow for ${targetAddress} by ${userAddress}`)) {
                 return res.status(401).json({ error: 'Message does not match intent' });
            }

            const pubKeyStr = formatPublicKey(publicKey);
            const pubKey = new Ed25519PublicKey(pubKeyStr);
            const authKey = AuthenticationKey.fromPublicKey({ publicKey: pubKey });
            const derivedAddress = authKey.derivedAddress();
            const signerAddress = AccountAddress.from(userAddress);

            if (!signerAddress.equals(derivedAddress)) {
                 return res.status(403).json({ error: 'Signer is not the follower' });
            }

            const timestampMatch = message.match(/at (\d+)$/);
            if (timestampMatch) {
                const timestamp = parseInt(timestampMatch[1]);
                const now = Date.now();
                if (now - timestamp > 5 * 60 * 1000 || timestamp > now + 60 * 1000) {
                     return res.status(401).json({ error: 'Signature expired' });
                }
            }
        } catch (e: any) {
            console.error("Auth error:", e);
            return res.status(401).json({ error: `Authentication failed: ${e?.message || e}` });
        }

        const follower = userAddress.toLowerCase();
        const following = targetAddress.toLowerCase();

        // Check if already following
        const { data: existing, error: checkError } = await supabaseAdmin
            .from('follows')
            .select('*')
            .eq('follower', follower)
            .eq('following', following)
            .single();
        
        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "The result contains 0 rows"
             return res.status(500).json({ error: checkError.message });
        }

        const isFollowing = !!existing;

        if (isFollowing) {
            // Unfollow
            const { error } = await supabaseAdmin
                .from('follows')
                .delete()
                .eq('follower', follower)
                .eq('following', following);

            if (error) {
                return res.status(500).json({ error: error.message });
            }
        } else {
            // Follow
            const { error } = await supabaseAdmin
                .from('follows')
                .insert([{ follower, following }]);

            if (error) {
                return res.status(500).json({ error: error.message });
            }
        }

        // Return updated state
        return res.status(200).json({ success: true, isFollowing: !isFollowing });
    } else {
         res.setHeader('Allow', ['GET', 'POST']);
         return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
