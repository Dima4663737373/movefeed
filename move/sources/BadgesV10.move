module mines::badges_v10 {
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;
    // use aptos_framework::timestamp;
    // use aptos_std::table::{Self, Table};

    struct Badge has store, drop, copy {
        id: u64,
        name: String,
        description: String,
        image_url: String,
    }

    // Struct returned to frontend (Not on chain storage, so safe to keep? No, if public struct)
    // Disassembly didn't show it as public struct unless used in public function signature?
    // It wasn't in disassembly.
    struct UserBadgeData has store, drop, copy {
        badge_id: u64,
        timestamp: u64,
    }

    struct UserBadge has drop, store, copy {
        id: u64,
        name: String,
        description: String,
        image_url: String,
        timestamp: u64,
    }

    struct BadgeRegistry has key {
        badges: vector<Badge>,
        // user_badges: Table<address, vector<UserBadgeData>>, // REMOVED to match on-chain
        badge_events: EventHandle<BadgeEvent>,
    }

    struct BadgeEvent has drop, store {
        recipient: address,
        badge_id: u64,
        // timestamp: u64, // REMOVED to match on-chain
    }
    
    struct UserBadges has key {
        badges: vector<u64>,
    }

    const EREGISTRY_NOT_INITIALIZED: u64 = 1;
    const EBADGE_NOT_FOUND: u64 = 2;

    public entry fun initialize_badges(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<BadgeRegistry>(addr)) {
            move_to(account, BadgeRegistry {
                badges: vector::empty(),
                // user_badges: table::new(),
                badge_events: account::new_event_handle<BadgeEvent>(account),
            });
        }
    }

    public entry fun create_badge(
        account: &signer, 
        id: u64, 
        name: String, 
        description: String, 
        image_url: String
    ) acquires BadgeRegistry {
        let registry = borrow_global_mut<BadgeRegistry>(signer::address_of(account));
        let badge = Badge {
            id,
            name,
            description,
            image_url,
        };
        vector::push_back(&mut registry.badges, badge);
    }

    public entry fun mint_badge(_account: &signer, recipient: address, badge_id: u64) acquires BadgeRegistry {
        let registry = borrow_global_mut<BadgeRegistry>(@mines);
        
        // Ensure badge exists (Keep this logic?)
        /*
        let badge_exists = false;
        let i = 0;
        let len = vector::length(&registry.badges);
        while (i < len) {
            let b = vector::borrow(&registry.badges, i);
            if (b.id == badge_id) {
                badge_exists = true;
                break
            };
            i = i + 1;
        };
        assert!(badge_exists, EBADGE_NOT_FOUND);
        */

        // Simple emit to match on-chain behavior approx (or minimal compatible)
        event::emit_event(&mut registry.badge_events, BadgeEvent {
            recipient,
            badge_id,
            // timestamp: timestamp::now_seconds(),
        });
    }

    /*
    // Removed functions that rely on Table or new fields
    public fun get_user_badges(user: address): vector<UserBadge> acquires BadgeRegistry {
       ...
    }
    */
}
