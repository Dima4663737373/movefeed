import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { verifySignature, formatPublicKey } from '../../lib/verify';
import { Ed25519PublicKey } from "@aptos-labs/ts-sdk";

export interface NotificationData {
    id: string;
    message: string;
    type: 'success' | 'info';
    timestamp: number;
    read: boolean;
    relatedUser?: string; // Address of the user who triggered the notification
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!supabaseAdmin) {
        return res.status(500).json({ error: 'Supabase Admin client not initialized.' });
    }

    const { userAddress } = req.query;

    if (!userAddress && req.method !== 'POST') {
        return res.status(400).json({ error: 'Missing userAddress' });
    }

    if (req.method === 'GET') {
        const user = (userAddress as string).toLowerCase();

        const { data: notifications, error } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('user_address', user)
            .order('timestamp', { ascending: false })
            .limit(50); // Limit to 50 as in original code logic

        if (error) {
             return res.status(500).json({ error: error.message });
        }

        // Map DB fields to NotificationData interface
        // DB: id, user_address, message, type, timestamp, read, related_user
        const mappedNotifications = notifications.map(n => ({
            id: n.id,
            message: n.message,
            type: n.type as 'success' | 'info',
            timestamp: n.timestamp,
            read: n.read,
            relatedUser: n.related_user
        }));

        return res.status(200).json(mappedNotifications);
    } else if (req.method === 'POST') {
        // This endpoint can be used to mark as read or delete
        const { message, signature, publicKey } = req.body;
        
        if (!message || !signature || !publicKey) {
             return res.status(400).json({ error: 'Missing signature, message, or public key' });
        }

        // Verify signature
        const verification = verifySignature(message, signature, publicKey);
        if (!verification.valid) {
             return res.status(401).json({ error: `Invalid signature: ${verification.error}` });
        }

        let parsedMessage;
        try {
            parsedMessage = JSON.parse(message);
        } catch (e) {
             // Try to extract JSON from prefixed message (e.g. "Aptos Signed Message: ...")
             try {
                 const jsonStart = message.indexOf('{');
                 const jsonEnd = message.lastIndexOf('}');
                 if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                     const jsonStr = message.substring(jsonStart, jsonEnd + 1);
                     parsedMessage = JSON.parse(jsonStr);
                 } else {
                      throw new Error("No JSON found");
                 }
             } catch (innerE) {
                 console.error("Failed to parse message:", message);
                 return res.status(400).json({ error: 'Invalid message format' });
             }
        }

        const { userAddress, notificationId, action } = parsedMessage;

        if (!userAddress) {
             return res.status(400).json({ error: 'Missing userAddress' });
        }

        // Verify sender matches public key
        try {
            const pubKeyStr = formatPublicKey(publicKey);
            const pubKey = new Ed25519PublicKey(pubKeyStr);
            const derivedAddress = pubKey.authKey().derivedAddress().toString();
            
            const normalize = (addr: string) => {
                const lower = addr.toLowerCase();
                return lower.startsWith('0x') ? lower : `0x${lower}`;
            };

            if (normalize(derivedAddress) !== normalize(userAddress)) {
                 return res.status(401).json({ error: 'Public key does not match user address' });
            }
        } catch (e: any) {
             return res.status(400).json({ error: `Invalid public key: ${e.message}` });
        }

        const user = userAddress.toLowerCase();

        if (action === 'mark_read') {
            if (notificationId) {
                const { error } = await supabaseAdmin
                    .from('notifications')
                    .update({ read: true })
                    .eq('id', notificationId)
                    .eq('user_address', user);

                if (error) {
                    return res.status(500).json({ error: error.message });
                }
            } else {
                // Mark all as read
                const { error } = await supabaseAdmin
                    .from('notifications')
                    .update({ read: true })
                    .eq('user_address', user)
                    .eq('read', false);

                if (error) {
                    return res.status(500).json({ error: error.message });
                }
            }
        } else if (action === 'clear') {
             // Delete all for user
             const { error } = await supabaseAdmin
                .from('notifications')
                .delete()
                .eq('user_address', user);

             if (error) {
                 return res.status(500).json({ error: error.message });
             }
        }

        // Fetch updated list to return
        const { data: updatedList, error: fetchError } = await supabaseAdmin
            .from('notifications')
            .select('*')
            .eq('user_address', user)
            .order('timestamp', { ascending: false })
            .limit(50);

        if (fetchError) {
             return res.status(500).json({ error: fetchError.message });
        }

        const mappedList = updatedList.map(n => ({
            id: n.id,
            message: n.message,
            type: n.type as 'success' | 'info',
            timestamp: n.timestamp,
            read: n.read,
            relatedUser: n.related_user
        }));

        return res.status(200).json({ success: true, notifications: mappedList });
    } else {
        res.setHeader('Allow', ['GET', 'POST']);
        res.status(405).json({ error: 'Method not allowed' });
    }
}
