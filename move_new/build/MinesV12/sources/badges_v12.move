module mines::badges_v12 {
    use std::string::String;
    use std::vector;
    use std::signer;
    use aptos_framework::event;
    use aptos_framework::account;

    struct Badge has store, drop, copy {
        id: u64,
        name: String,
        description: String,
        image_uri: String,
    }

    struct BadgeRegistry has key {
        badges: vector<Badge>,
        badge_events: event::EventHandle<BadgeEvent>,
    }

    struct BadgeEvent has drop, store {
        recipient: address,
        badge_id: u64,
    }

    struct UserBadges has key {
        badges: vector<u64>,
    }

    const E_REGISTRY_NOT_INITIALIZED: u64 = 1;
    const E_BADGE_NOT_FOUND: u64 = 2;

    public entry fun initialize(admin: &signer) {
        let addr = signer::address_of(admin);
        if (!exists<BadgeRegistry>(addr)) {
            move_to(admin, BadgeRegistry {
                badges: vector::empty(),
                badge_events: account::new_event_handle<BadgeEvent>(admin),
            });
        }
    }

    public entry fun create_badge(
        admin: &signer,
        id: u64,
        name: String,
        description: String,
        image_uri: String
    ) acquires BadgeRegistry {
        let registry = borrow_global_mut<BadgeRegistry>(signer::address_of(admin));
        vector::push_back(&mut registry.badges, Badge {
            id,
            name,
            description,
            image_uri,
        });
    }

    public fun mint_badge(user: &signer, badge_id: u64) acquires BadgeRegistry, UserBadges {
        let recipient = signer::address_of(user);
        
        // Ensure UserBadges exists
        if (!exists<UserBadges>(recipient)) {
            move_to(user, UserBadges { badges: vector::empty() });
        };

        let registry = borrow_global_mut<BadgeRegistry>(@mines);
        
        // Verify badge exists in registry
        let badges_len = vector::length(&registry.badges);
        let i = 0;
        let found = false;
        while (i < badges_len) {
            let b = vector::borrow(&registry.badges, i);
            if (b.id == badge_id) {
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, E_BADGE_NOT_FOUND);

        let user_badges = borrow_global_mut<UserBadges>(recipient);
        if (!vector::contains(&user_badges.badges, &badge_id)) {
            vector::push_back(&mut user_badges.badges, badge_id);
            event::emit_event(&mut registry.badge_events, BadgeEvent {
                recipient,
                badge_id,
            });
        }
    }

    public fun get_user_badges(user: address): vector<u64> acquires UserBadges {
        if (exists<UserBadges>(user)) {
            *&borrow_global<UserBadges>(user).badges
        } else {
            vector::empty()
        }
    }
}
