import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase Admin client not initialized.' });
    }

    if (req.method === 'GET') {
        const { postId } = req.query;

        if (!postId) {
            return res.status(400).json({ error: 'Post ID is required' });
        }

        const { data, error } = await supabaseAdmin
            .from('post_views')
            .select('view_count')
            .eq('post_id', postId as string)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
            console.error("Error fetching views:", error);
            return res.status(500).json({ error: error.message });
        }

        return res.status(200).json({ viewCount: data?.view_count || 0 });

    } else if (req.method === 'POST') {
        const { postId } = req.body;

        if (!postId) {
            return res.status(400).json({ error: 'Post ID is required' });
        }

        // Try using RPC function first (atomic increment)
        const { error: rpcError } = await supabaseAdmin.rpc('increment_view_count', {
            p_post_id: postId.toString()
        });

        if (rpcError) {
            console.warn("RPC increment failed, falling back to manual upsert:", rpcError);

            // Fallback: Check if row exists, then update or insert
            // This is race-condition prone but better than failing
            const { data: existing } = await supabaseAdmin
                .from('post_views')
                .select('view_count')
                .eq('post_id', postId.toString())
                .single();

            if (existing) {
                const { error: updateError } = await supabaseAdmin
                    .from('post_views')
                    .update({ 
                        view_count: existing.view_count + 1,
                        last_updated: new Date().toISOString()
                    })
                    .eq('post_id', postId.toString());
                
                if (updateError) throw updateError;
            } else {
                const { error: insertError } = await supabaseAdmin
                    .from('post_views')
                    .insert({ 
                        post_id: postId.toString(), 
                        view_count: 1,
                        last_updated: new Date().toISOString()
                    });
                
                if (insertError) throw insertError;
            }
        }

        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
