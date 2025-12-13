import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';
import { verifySignature, formatPublicKey } from '../../lib/verify';
import { Ed25519PublicKey } from "@aptos-labs/ts-sdk";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        if (!supabaseAdmin) {
            const missingEnv = [];
            if (!process.env.NEXT_PUBLIC_SUPABASE_URL) missingEnv.push('NEXT_PUBLIC_SUPABASE_URL');
            if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingEnv.push('SUPABASE_SERVICE_ROLE_KEY');
            
            console.error("Supabase Admin client not initialized. Missing:", missingEnv);
            return res.status(500).json({ error: 'Supabase Admin client not initialized.', missingEnv });
        }

        if (req.method === 'GET') {
            const { postId, creatorAddress, userAddress } = req.query;

            if (postId && creatorAddress) {
                const creator = (creatorAddress as string).toLowerCase();
                const pid = postId as string;

                // Fetch votes for this post
                const { data: votes, error } = await supabaseAdmin
                    .from('votes')
                    .select('vote_type, user_address')
                    .eq('creator_address', creator)
                    .eq('post_id', pid);

                if (error) {
                    console.error("Database error fetching votes:", error);
                     return res.status(500).json({ error: error.message, details: error });
                }

                const up = votes.filter(v => v.vote_type === 'up').length;
                const down = votes.filter(v => v.vote_type === 'down').length;

                let userVote = null;
                if (userAddress) {
                    const user = (userAddress as string).toLowerCase();
                    const myVote = votes.find(v => v.user_address === user);
                    if (myVote) {
                        userVote = myVote.vote_type;
                    }
                }

                return res.status(200).json({ up, down, userVote });
            }

            return res.status(200).json({});
            
        } else if (req.method === 'POST') {
            // Allow simplified voting without signature (as per user request)
            let postId, creatorAddress, type, userAddress;

            // Try to parse from top-level body first (simplified mode)
            if (req.body.postId && req.body.creatorAddress && req.body.type && req.body.userAddress) {
                ({ postId, creatorAddress, type, userAddress } = req.body);
            } else {
                 // Fallback to legacy/signed mode if params are missing
                 const { message, signature, publicKey } = req.body;
                 
                 if (message && signature && publicKey) {
                     // Verify signature
                     const verification = verifySignature(message, signature, publicKey);
                     if (!verification.valid) {
                          return res.status(401).json({ error: `Invalid signature: ${verification.error}` });
                     }
                     
                     try {
                         const parsedMessage = JSON.parse(message);
                         ({ postId, creatorAddress, type, userAddress } = parsedMessage);
                     } catch (e) {
                         // Try to extract JSON from prefixed message
                         try {
                             const jsonStart = message.indexOf('{');
                             const jsonEnd = message.lastIndexOf('}');
                             if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                                 const jsonStr = message.substring(jsonStart, jsonEnd + 1);
                                 const parsed = JSON.parse(jsonStr);
                                 ({ postId, creatorAddress, type, userAddress } = parsed);
                             } else {
                                  throw new Error("No JSON found");
                             }
                         } catch (innerE) {
                             return res.status(400).json({ error: 'Invalid message format' });
                         }
                     }

                     // Verify public key matches userAddress
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
                 } else {
                      return res.status(400).json({ error: 'Missing parameters. Provide postId, creatorAddress, type, userAddress directly or via signed message.' });
                 }
            }

            if (!postId || !creatorAddress || !['up', 'down'].includes(type) || !userAddress) {
                return res.status(400).json({ error: 'Invalid request. Missing postId, creatorAddress, type, or userAddress.' });
            }

            const creator = creatorAddress.toLowerCase();
            const user = userAddress.toLowerCase();
            const pid = postId.toString();

            // Check current vote
            const { data: currentVote, error: checkError } = await supabaseAdmin
                .from('votes')
                .select('*')
                .eq('creator_address', creator)
                .eq('post_id', pid)
                .eq('user_address', user)
                .single();

            if (checkError && checkError.code !== 'PGRST116') {
                 console.error("Database error checking vote:", checkError);
                 return res.status(500).json({ error: checkError.message });
            }

            if (currentVote) {
                if (currentVote.vote_type === type) {
                    // Toggle off (delete)
                    const { error } = await supabaseAdmin
                        .from('votes')
                        .delete()
                        .eq('id', currentVote.id);

                    if (error) {
                        console.error("Database error deleting vote:", error);
                        return res.status(500).json({ error: error.message });
                    }
                } else {
                    // Change vote (update)
                    const { error } = await supabaseAdmin
                        .from('votes')
                        .update({ vote_type: type })
                        .eq('id', currentVote.id);

                    if (error) {
                        console.error("Database error updating vote:", error);
                        return res.status(500).json({ error: error.message });
                    }
                }
            } else {
                // New vote (insert)
                const { error } = await supabaseAdmin
                    .from('votes')
                    .insert([{
                        post_id: pid,
                        creator_address: creator,
                        user_address: user,
                        vote_type: type
                    }]);

                if (error) {
                    console.error("Database error inserting vote:", error);
                    return res.status(500).json({ error: error.message });
                }
            }

            // Fetch updated counts
            const { data: updatedVotes, error: countError } = await supabaseAdmin
                .from('votes')
                .select('vote_type, user_address')
                .eq('creator_address', creator)
                .eq('post_id', pid);

            if (countError) {
                 console.error("Database error fetching updated votes:", countError);
                 return res.status(500).json({ error: countError.message });
            }

            const up = updatedVotes.filter(v => v.vote_type === 'up').length;
            const down = updatedVotes.filter(v => v.vote_type === 'down').length;
            const newUserVote = updatedVotes.find(v => v.user_address === user)?.vote_type || null;

            return res.status(200).json({ up, down, userVote: newUserVote });
        } else {
            res.setHeader('Allow', ['GET', 'POST']);
            return res.status(405).end(`Method ${req.method} Not Allowed`);
        }
    } catch (error: any) {
        console.error("Unexpected error in votes API:", error);
        return res.status(500).json({ error: "Unexpected server error", details: error.message, stack: error.stack });
    }
}
