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
            // Gracefully handle missing table (42P01) or other DB errors
            console.warn("Error fetching views (likely missing table):", error.message);
            return res.status(200).json({ viewCount: 0 });
        }

        return res.status(200).json({ viewCount: data?.view_count || 0 });

    } else if (req.method === 'POST') {
        const { postId } = req.body;

        if (!postId) {
            return res.status(400).json({ error: 'Post ID is required' });
        }

        try {
            // Try using RPC function first (atomic increment)
            const { error: rpcError } = await supabaseAdmin.rpc('increment_view_count', {
                p_post_id: postId.toString()
            });

            if (rpcError) {
                // Fallback: Check if row exists, then update or insert
                // This is race-condition prone but better than failing
                const { data: existing, error: fetchError } = await supabaseAdmin
                    .from('post_views')
                    .select('view_count')
                    .eq('post_id', postId.toString())
                    .single();
                
                // If table doesn't exist, this will error
                if (fetchError && fetchError.code === '42P01') {
                     console.warn("post_views table missing, skipping view increment");
                     return res.status(200).json({ success: true, skipped: true });
                }

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
        } catch (e: any) {
             console.error("View increment failed:", e.message);
             // Return 200 to prevent client retries/errors
             return res.status(200).json({ success: false, error: e.message });
        }

        return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}
