module tipjar_addr::MoveFeedV3 {
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::timestamp;
    use aptos_std::table::{Self, Table};

    /// Error codes
    const E_POST_NOT_FOUND: u64 = 1;
    const E_NOT_AUTHORIZED: u64 = 2;
    const E_CONTENT_TOO_LONG: u64 = 3;
    const E_IMAGE_TOO_LARGE: u64 = 4;

    /// Maximum post content length
    const MAX_CONTENT_LENGTH: u64 = 1000;
    
    /// Maximum image length (250KB for Base64)
    const MAX_IMAGE_LENGTH: u64 = 250000;

    /// Post structure
    struct Post has store, drop, copy {
        id: u64,
        global_id: u64, // Added for global lookup efficiency
        creator: address,
        content: String,
        image_url: String,
        style: u8,
        timestamp: u64,
        last_tip_timestamp: u64,
        total_tips: u64,
        // V3 New Fields
        is_deleted: bool,
        updated_at: u64,
        parent_id: u64, // ID of parent post if comment
        is_comment: bool,
    }

    /// User profile
    struct UserProfile has key {
        display_name: String,
    }

    /// User avatar
    struct UserAvatar has key {
        avatar_url: String,
    }

    /// User's posts storage
    struct UserPosts has key {
        posts: Table<u64, Post>, // Changed from vector to Table
        next_post_id: u64,
    }

    /// Global posts registry
    struct GlobalPosts has key {
        posts: Table<u64, Post>,
        post_count: u64,
    }

    #[event]
    /// Event emitted when a tip is sent
    struct TipEvent has drop, store {
        tipper: address,
        creator: address,
        post_id: u64,
        amount: u64,
        timestamp: u64,
    }

    /// User tip statistics
    struct UserTipStats has key {
        total_sent: u64,
        total_received: u64,
        tips_sent_count: u64,
    }

    /// Global tip statistics
    struct GlobalTipStats has key {
        total_volume: u64,
        top_tipper: address,
        top_tipper_amount: u64,
    }

    #[event]
    /// Event emitted when a post is created
    struct PostCreatedEvent has drop, store {
        post_id: u64, // The GLOBAL ID
        user_post_id: u64, // The User's local ID
        creator: address,
        content: String,
        timestamp: u64,
    }

    /// Initialize user's posts storage
    fun init_user_posts(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<UserPosts>(addr)) {
            move_to(account, UserPosts {
                posts: table::new(),
                next_post_id: 0,
            });
        };
        // Also initialize TipStats if not present
        if (!exists<UserTipStats>(addr)) {
            move_to(account, UserTipStats {
                total_sent: 0,
                total_received: 0,
                tips_sent_count: 0,
            });
        };
    }

    /// Initialize global posts registry
    public entry fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<GlobalPosts>(addr)) {
            move_to(account, GlobalPosts {
                posts: table::new(),
                post_count: 0,
            });
        };
    }

    /// Initialize global tip statistics
    public entry fun initialize_global_stats(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<GlobalTipStats>(addr)) {
            move_to(account, GlobalTipStats {
                total_volume: 0,
                top_tipper: @0x0,
                top_tipper_amount: 0,
            });
        };
    }

    /// Create a new post
    public entry fun create_post(
        account: &signer,
        content: String,
        image_url: String,
        style: u8
    ) acquires UserPosts, GlobalPosts {
        create_content(account, content, image_url, style, 0, false);
    }

    /// Create a comment
    public entry fun create_comment(
        account: &signer,
        parent_id: u64,
        content: String,
        image_url: String
    ) acquires UserPosts, GlobalPosts {
        // Style 0 for comments by default
        create_content(account, content, image_url, 0, parent_id, true);
    }

    /// Internal helper to create content (post or comment)
    fun create_content(
        account: &signer,
        content: String,
        image_url: String,
        style: u8,
        parent_id: u64,
        is_comment: bool
    ) acquires UserPosts, GlobalPosts {
        let addr = signer::address_of(account);
        
        assert!(std::string::length(&content) <= MAX_CONTENT_LENGTH, E_CONTENT_TOO_LONG);
        assert!(std::string::length(&image_url) <= MAX_IMAGE_LENGTH, E_IMAGE_TOO_LARGE);

        init_user_posts(account);

        // Get global ID first (to include in Post struct)
        let global_id = 0;
        if (exists<GlobalPosts>(@tipjar_addr)) {
            global_id = borrow_global<GlobalPosts>(@tipjar_addr).post_count;
        };

        let user_posts = borrow_global_mut<UserPosts>(addr);
        let post_id = user_posts.next_post_id;
        let now = timestamp::now_seconds();

        let new_post = Post {
            id: post_id,
            global_id, // Store global ID
            creator: addr,
            content,
            image_url,
            style,
            timestamp: now,
            last_tip_timestamp: now,
            total_tips: 0,
            is_deleted: false,
            updated_at: now,
            parent_id,
            is_comment,
        };

        // Add to UserPosts Table
        table::add(&mut user_posts.posts, post_id, new_post);
        user_posts.next_post_id = post_id + 1;

        // Add to GlobalPosts Table
        if (exists<GlobalPosts>(@tipjar_addr)) {
            let global_posts = borrow_global_mut<GlobalPosts>(@tipjar_addr);
            // Ensure synchronization (global_id should match what we fetched)
            // In high concurrency, this might be risky if not careful, but Move execution is sequential per transaction.
            // Re-fetch post count to be safe? No, borrow_global_mut locks the resource.
            // But we dropped the borrow of GlobalPosts above? 
            // Actually:
            // 1. We borrowed GlobalPosts (immutable) to get ID.
            // 2. We borrowed UserPosts (mutable).
            // 3. We borrow GlobalPosts (mutable) now.
            // This is safe from race conditions within the same transaction.
            // However, if another transaction ran in between, `post_count` might have changed?
            // Move transactions are atomic. But `global_id` variable is stale if we don't re-read?
            // No, we should use the count from the mutable borrow to be sure.
            
            let current_global_count = global_posts.post_count;
            // Update the post's global_id if it differs (it shouldn't if we are the only ones, but good practice)
            let final_post = new_post;
            final_post.global_id = current_global_count;
            
            // We need to update the one in UserPosts too if it changed!
            // This suggests we should get the ID *inside* the mutable borrow block or hold a lock.
            // But we can't hold two mutable borrows of different resources easily if they are not carefully ordered.
            // Actually, we can borrow Global, get ID, increment, then borrow User, add.
            // But `create_content` does user first.
            
            // Correct approach:
            // 1. Modify UserPosts first. Use a temporary global_id (e.g. 0).
            // 2. Modify GlobalPosts. Get real global_id.
            // 3. Update UserPosts with real global_id.
            
            // However, that requires multiple writes.
            // Simpler: Just trust the sequential execution. 
            // If we use `global_posts.post_count` as the ID, we must ensure `new_post` has THAT id.
            
            table::add(&mut global_posts.posts, current_global_count, final_post);
            global_posts.post_count = current_global_count + 1;

            // If we updated global_id, we must update UserPosts entry
            if (final_post.global_id != global_id) {
                 let user_post_ref = table::borrow_mut(&mut user_posts.posts, post_id);
                 user_post_ref.global_id = final_post.global_id;
            }
        };

        // Emit PostCreatedEvent
        // Use the final global_id (if we have GlobalPosts, it's reliable. If not, it's 0)
        // If GlobalPosts didn't exist, global_id is 0.
        // We should really only emit if we have a valid global context, but for now we emit what we have.
        let final_global_id = if (exists<GlobalPosts>(@tipjar_addr)) {
             // We need to fetch it again or use what we calculated.
             // We calculated current_global_count above if exists.
             // But variables inside if block are scoped.
             // Let's re-read safely if needed, or better, structure the code to expose it.
             // Since we can't easily access the scoped var, and re-reading is cheap for view but hard for borrow rules.
             // Actually, new_post.global_id was set to 0 initially.
             // If we entered the block, we updated the table entry, but `new_post` variable itself is unchanged (it's a copy).
             // However, we can read from user_posts again.
             let p = table::borrow(&user_posts.posts, post_id);
             p.global_id
        } else {
             0
        };

        0x1::event::emit(PostCreatedEvent {
            post_id: final_global_id,
            user_post_id: post_id,
            creator: addr,
            content,
            timestamp: now,
        });
    }

    /// Edit a post (text only - maintains backward compatibility)
    public entry fun edit_post(
        account: &signer,
        post_id: u64,
        new_content: String
    ) acquires UserPosts, GlobalPosts {
        let addr = signer::address_of(account);
        assert!(std::string::length(&new_content) <= MAX_CONTENT_LENGTH, E_CONTENT_TOO_LONG);

        // 1. Update UserPosts
        let user_posts = borrow_global_mut<UserPosts>(addr);
        assert!(table::contains(&user_posts.posts, post_id), E_POST_NOT_FOUND);
        
        let post = table::borrow_mut(&mut user_posts.posts, post_id);
        post.content = new_content;
        post.updated_at = timestamp::now_seconds();
        let global_id = post.global_id;

        // 2. Update GlobalPosts
        if (exists<GlobalPosts>(@tipjar_addr)) {
            let global_posts = borrow_global_mut<GlobalPosts>(@tipjar_addr);
            if (table::contains(&global_posts.posts, global_id)) {
                let global_post = table::borrow_mut(&mut global_posts.posts, global_id);
                // Verify integrity
                if (global_post.creator == addr && global_post.id == post_id) {
                    global_post.content = new_content;
                    global_post.updated_at = timestamp::now_seconds();
                }
            }
        }
    }

    /// Edit a post with image (new function for full editing)
    public entry fun edit_post_with_image(
        account: &signer,
        post_id: u64,
        new_content: String,
        new_image_url: String
    ) acquires UserPosts, GlobalPosts {
        let addr = signer::address_of(account);
        assert!(std::string::length(&new_content) <= MAX_CONTENT_LENGTH, E_CONTENT_TOO_LONG);
        assert!(std::string::length(&new_image_url) <= MAX_IMAGE_LENGTH, E_IMAGE_TOO_LARGE);

        // 1. Update UserPosts
        let user_posts = borrow_global_mut<UserPosts>(addr);
        assert!(table::contains(&user_posts.posts, post_id), E_POST_NOT_FOUND);

        let post = table::borrow_mut(&mut user_posts.posts, post_id);
        post.content = new_content;
        post.image_url = new_image_url;
        post.updated_at = timestamp::now_seconds();
        let global_id = post.global_id;

        // 2. Update GlobalPosts
        if (exists<GlobalPosts>(@tipjar_addr)) {
            let global_posts = borrow_global_mut<GlobalPosts>(@tipjar_addr);
            if (table::contains(&global_posts.posts, global_id)) {
                let global_post = table::borrow_mut(&mut global_posts.posts, global_id);
                if (global_post.creator == addr && global_post.id == post_id) {
                    global_post.content = new_content;
                    global_post.image_url = new_image_url;
                    global_post.updated_at = timestamp::now_seconds();
                }
            }
        }
    }

    /// Delete a post (soft delete)
    public entry fun delete_post(
        account: &signer,
        post_id: u64
    ) acquires UserPosts, GlobalPosts {
        let addr = signer::address_of(account);

        // 1. Update UserPosts
        let user_posts = borrow_global_mut<UserPosts>(addr);
        assert!(table::contains(&user_posts.posts, post_id), E_POST_NOT_FOUND);

        let post = table::borrow_mut(&mut user_posts.posts, post_id);
        post.is_deleted = true;
        let global_id = post.global_id;

        // 2. Update GlobalPosts
        if (exists<GlobalPosts>(@tipjar_addr)) {
            let global_posts = borrow_global_mut<GlobalPosts>(@tipjar_addr);
            if (table::contains(&global_posts.posts, global_id)) {
                let global_post = table::borrow_mut(&mut global_posts.posts, global_id);
                if (global_post.creator == addr && global_post.id == post_id) {
                    global_post.is_deleted = true;
                }
            }
        }
    }

    /// Tip a post
    public entry fun tip_post(
        account: &signer,
        creator: address,
        post_id: u64,
        amount: u64
    ) acquires UserPosts, GlobalPosts, UserTipStats, GlobalTipStats {
        let tipper = signer::address_of(account);
        
        coin::transfer<AptosCoin>(account, creator, amount);

        let user_posts = borrow_global_mut<UserPosts>(creator);
        assert!(table::contains(&user_posts.posts, post_id), E_POST_NOT_FOUND);

        let post = table::borrow_mut(&mut user_posts.posts, post_id);
        let now = timestamp::now_seconds();
        
        post.total_tips = post.total_tips + amount;
        post.last_tip_timestamp = now;
        let global_id = post.global_id;

        if (exists<GlobalPosts>(@tipjar_addr)) {
            let global_posts = borrow_global_mut<GlobalPosts>(@tipjar_addr);
            if (table::contains(&global_posts.posts, global_id)) {
                let global_post = table::borrow_mut(&mut global_posts.posts, global_id);
                if (global_post.creator == creator && global_post.id == post_id) {
                    global_post.total_tips = global_post.total_tips + amount;
                    global_post.last_tip_timestamp = now;
                }
            }
        };

        0x1::event::emit(TipEvent {
            tipper,
            creator,
            post_id,
            amount,
            timestamp: now,
        });

        let tipper_total_sent = {
            // Update Tipper Stats
            if (!exists<UserTipStats>(tipper)) {
                move_to(account, UserTipStats {
                    total_sent: 0,
                    total_received: 0,
                    tips_sent_count: 0,
                });
            };
            let tipper_stats = borrow_global_mut<UserTipStats>(tipper);
            tipper_stats.total_sent = tipper_stats.total_sent + amount;
            tipper_stats.tips_sent_count = tipper_stats.tips_sent_count + 1;
            tipper_stats.total_sent
        };

        // Update Creator Stats (Receiver)
        // Note: We need to borrow UserTipStats for creator. 
        // Since creator might not be the signer, we can't move_to if it doesn't exist.
        // But we can check if it exists and update it. 
        // If it doesn't exist, we can't create it for them (requires their signature).
        // Limitation: User must have initialized their stats to track received tips efficiently.
        // OR: We can just ignore if it doesn't exist, but that defeats the purpose.
        // Ideally, `init_user_posts` or `initialize` should create this.
        if (exists<UserTipStats>(creator)) {
            let creator_stats = borrow_global_mut<UserTipStats>(creator);
            creator_stats.total_received = creator_stats.total_received + amount;
        };

        if (exists<GlobalTipStats>(@tipjar_addr)) {
            let global_stats = borrow_global_mut<GlobalTipStats>(@tipjar_addr);
            global_stats.total_volume = global_stats.total_volume + amount;
            
            if (tipper_total_sent > global_stats.top_tipper_amount) {
                global_stats.top_tipper = tipper;
                global_stats.top_tipper_amount = tipper_total_sent;
            };
        };
    }

    // --- VIEW FUNCTIONS ---

    #[view]
    public fun get_user_posts(user_addr: address): vector<Post> acquires UserPosts {
        if (exists<UserPosts>(user_addr)) {
            let user_posts = borrow_global<UserPosts>(user_addr);
            let posts = vector::empty<Post>();
            let i = 0;
            let count = user_posts.next_post_id;
            while (i < count) {
                if (table::contains(&user_posts.posts, i)) {
                    let post = table::borrow(&user_posts.posts, i);
                    vector::push_back(&mut posts, *post);
                };
                i = i + 1;
            };
            posts
        } else {
            vector::empty<Post>()
        }
    }

    #[view]
    public fun get_all_posts(): vector<Post> acquires GlobalPosts {
        if (exists<GlobalPosts>(@tipjar_addr)) {
            let global_posts = borrow_global<GlobalPosts>(@tipjar_addr);
            let posts = vector::empty<Post>();
            let i = 0;
            let count = global_posts.post_count;
            // Iterate all posts (could be expensive, but required for view compatibility)
            while (i < count) {
                if (table::contains(&global_posts.posts, i)) {
                    let post = table::borrow(&global_posts.posts, i);
                    vector::push_back(&mut posts, *post);
                };
                i = i + 1;
            };
            posts
        } else {
            vector::empty<Post>()
        }
    }

    public entry fun update_profile(account: &signer, display_name: String) acquires UserProfile {
        let addr = signer::address_of(account);
        if (!exists<UserProfile>(addr)) {
            move_to(account, UserProfile { display_name });
        } else {
            let profile = borrow_global_mut<UserProfile>(addr);
            profile.display_name = display_name;
        }
    }

    public entry fun set_avatar(account: &signer, avatar_url: String) acquires UserAvatar {
        let addr = signer::address_of(account);
        if (!exists<UserAvatar>(addr)) {
            move_to(account, UserAvatar { avatar_url });
        } else {
            let avatar = borrow_global_mut<UserAvatar>(addr);
            avatar.avatar_url = avatar_url;
        }
    }

    #[view]
    public fun get_profile(user_addr: address): String acquires UserProfile {
        if (exists<UserProfile>(user_addr)) {
            borrow_global<UserProfile>(user_addr).display_name
        } else {
            std::string::utf8(b"")
        }
    }

    #[view]
    public fun get_avatar(user_addr: address): String acquires UserAvatar {
        if (exists<UserAvatar>(user_addr)) {
            borrow_global<UserAvatar>(user_addr).avatar_url
        } else {
            std::string::utf8(b"")
        }
    }

    #[view]
    public fun get_user_posts_count(user_addr: address): u64 acquires UserPosts {
        if (exists<UserPosts>(user_addr)) {
            borrow_global<UserPosts>(user_addr).next_post_id
        } else {
            0
        }
    }

    #[view]
    public fun get_global_posts_count(): u64 acquires GlobalPosts {
        if (exists<GlobalPosts>(@tipjar_addr)) {
            borrow_global<GlobalPosts>(@tipjar_addr).post_count
        } else {
            0
        }
    }

    #[view]
    public fun get_user_tip_stats(user_addr: address): (u64, u64, u64) acquires UserTipStats {
        if (exists<UserTipStats>(user_addr)) {
            let stats = borrow_global<UserTipStats>(user_addr);
            (stats.total_sent, stats.total_received, stats.tips_sent_count)
        } else {
            (0, 0, 0)
        }
    }

    #[view]
    public fun get_user_posts_paginated(user_addr: address, start: u64, limit: u64): vector<Post> acquires UserPosts {
        if (exists<UserPosts>(user_addr)) {
            let user_posts = borrow_global<UserPosts>(user_addr);
            let posts = vector::empty<Post>();
            let count = user_posts.next_post_id;
            
            if (start >= count) {
                return posts
            };

            let i = start;
            let end = start + limit;
            if (end > count) {
                end = count;
            };

            while (i < end) {
                if (table::contains(&user_posts.posts, i)) {
                    let post = table::borrow(&user_posts.posts, i);
                    vector::push_back(&mut posts, *post);
                };
                i = i + 1;
            };
            posts
        } else {
            vector::empty<Post>()
        }
    }

    #[view]
    public fun get_all_posts_paginated(start: u64, limit: u64): vector<Post> acquires GlobalPosts {
        if (exists<GlobalPosts>(@tipjar_addr)) {
            let global_posts = borrow_global<GlobalPosts>(@tipjar_addr);
            let posts = vector::empty<Post>();
            let count = global_posts.post_count;

            if (start >= count) {
                return posts
            };

            let i = start;
            let end = start + limit;
            if (end > count) {
                end = count;
            };

            while (i < end) {
                if (table::contains(&global_posts.posts, i)) {
                    let post = table::borrow(&global_posts.posts, i);
                    vector::push_back(&mut posts, *post);
                };
                i = i + 1;
            };
            posts
        } else {
            vector::empty<Post>()
        }
    }

    #[view]
    public fun get_post_by_id(post_id: u64): vector<Post> acquires GlobalPosts {
        if (exists<GlobalPosts>(@tipjar_addr)) {
            let global_posts = borrow_global<GlobalPosts>(@tipjar_addr);
            if (table::contains(&global_posts.posts, post_id)) {
                let post = table::borrow(&global_posts.posts, post_id);
                let vec = vector::empty<Post>();
                vector::push_back(&mut vec, *post);
                vec
            } else {
                vector::empty<Post>()
            }
        } else {
            vector::empty<Post>()
        }
    }

    #[view]
    public fun get_comments_for_post(post_id: u64): vector<Post> acquires GlobalPosts {
        if (exists<GlobalPosts>(@tipjar_addr)) {
            let global_posts = borrow_global<GlobalPosts>(@tipjar_addr);
            let comments = vector::empty<Post>();
            let i = 0;
            let count = global_posts.post_count;
            while (i < count) {
                if (table::contains(&global_posts.posts, i)) {
                    let post = table::borrow(&global_posts.posts, i);
                    if (post.is_comment && post.parent_id == post_id && !post.is_deleted) {
                        vector::push_back(&mut comments, *post);
                    };
                };
                i = i + 1;
            };
            comments
        } else {
            vector::empty<Post>()
        }
    }

    #[view]
    public fun get_global_tip_stats(): (u64, address, u64) acquires GlobalTipStats {
        if (exists<GlobalTipStats>(@tipjar_addr)) {
            let stats = borrow_global<GlobalTipStats>(@tipjar_addr);
            (stats.total_volume, stats.top_tipper, stats.top_tipper_amount)
        } else {
            (0, @0x0, 0)
        }
    }
}