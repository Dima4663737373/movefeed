import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb', // Set higher than default just in case
        },
    },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        if (!supabaseAdmin) {
            console.error("Supabase Admin client not initialized in upload API.");
            return res.status(500).json({ error: 'Supabase Admin client not initialized.' });
        }

        const { fileName, fileData, contentType } = req.body;

        if (!fileName || !fileData) {
            return res.status(400).json({ error: 'Missing fileName or fileData' });
        }

        // fileData is expected to be a base64 string. 
        // It might include the data URI prefix (e.g., "data:image/jpeg;base64,...").
        // We need to strip it if present.
        const base64Data = fileData.replace(/^data:.*,/, '');
        const buffer = Buffer.from(base64Data, 'base64');

        const { data, error } = await supabaseAdmin.storage
            .from('post-media')
            .upload(fileName, buffer, {
                contentType: contentType || 'image/jpeg',
                upsert: true
            });

        if (error) {
            console.error('Supabase upload error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Get public URL
        const { data: publicUrlData } = supabaseAdmin.storage
            .from('post-media')
            .getPublicUrl(fileName);

        return res.status(200).json({ 
            path: data.path, 
            publicUrl: publicUrlData.publicUrl 
        });

    } catch (error: any) {
        console.error("Unexpected error in upload API:", error);
        return res.status(500).json({ error: "Unexpected server error", details: error.message });
    }
}
