module mines::badges {
    use std::string::String;
    use std::signer;
    use std::vector;
    
    struct Badge has store, drop, copy {
        id: u64,
        name: String,
        description: String,
        image_url: String,
    }
    
    struct BadgeCollection has key {
        badges: vector<Badge>,
    }
    
    public entry fun mint_badge(user: &signer, id: u64, name: String, description: String, image_url: String) acquires BadgeCollection {
        let user_addr = signer::address_of(user);
        if (!exists<BadgeCollection>(user_addr)) {
            move_to(user, BadgeCollection { badges: vector::empty() });
        };
        
        let collection = borrow_global_mut<BadgeCollection>(user_addr);
        let badge = Badge { id, name, description, image_url };
        vector::push_back(&mut collection.badges, badge);
    }

    public fun get_user_badges(user: address): vector<Badge> acquires BadgeCollection {
        if (exists<BadgeCollection>(user)) {
            *&borrow_global<BadgeCollection>(user).badges
        } else {
            vector::empty()
        }
    }
}
