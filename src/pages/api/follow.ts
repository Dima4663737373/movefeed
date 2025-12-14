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
        const { userAddress, targetAddress } = req.body;

        if (!userAddress || !targetAddress) {
            return res.status(400).json({ error: 'Missing userAddress or targetAddress' });
        }

        // Security Check SKIPPED as per user request for seamless UX
        // In a production app, we should use a session token or at least a signature
        // to verify the request comes from the owner of userAddress.
        // Since this is a demo/hackathon project, we trust the client for now.

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
