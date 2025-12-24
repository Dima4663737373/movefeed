import { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase Admin client not initialized' });
    }

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { username, currentAddress } = req.query;

    if (!username || typeof username !== 'string') {
        return res.status(400).json({ error: 'Missing username parameter' });
    }

    try {
        let query = supabaseAdmin
            .from('profiles')
            .select('wallet_address')
            .ilike('display_name', username); // Case-insensitive check

        // If currentAddress is provided, exclude it (so user can keep their own name)
        if (currentAddress && typeof currentAddress === 'string') {
            query = query.neq('wallet_address', currentAddress.toLowerCase());
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error checking username:', error);
            return res.status(500).json({ error: error.message });
        }

        const isTaken = data && data.length > 0;
        return res.status(200).json({ isTaken });

    } catch (e) {
        console.error("Error in check-username:", e);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
