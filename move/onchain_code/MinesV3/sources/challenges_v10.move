module mines::challenges_v10 {
    use std::signer;
    use std::vector;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    struct ChallengeRegistry has key {
        challenges: vector<u64>, // Challenge IDs
        challenge_completion_events: EventHandle<ChallengeCompleted>,
    }

    struct UserProgress has key {
        completed_challenges: vector<u64>,
    }

    struct ChallengeCompleted has drop, store {
        user: address,
        challenge_id: u64,
    }

    public entry fun initialize_challenges(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<ChallengeRegistry>(addr)) {
            move_to(account, ChallengeRegistry {
                challenges: vector::empty(),
                challenge_completion_events: account::new_event_handle<ChallengeCompleted>(account),
            });
        }
    }

    public entry fun join_challenge(_account: &signer, _challenge_id: u64) {
        // Placeholder implementation
    }

    public entry fun complete_challenge(user: &signer, challenge_id: u64) acquires ChallengeRegistry, UserProgress {
        let user_addr = signer::address_of(user);
        let registry = borrow_global_mut<ChallengeRegistry>(@mines);
        if (!exists<UserProgress>(user_addr)) {
             move_to(user, UserProgress { completed_challenges: vector::empty() });
        };
        let progress = borrow_global_mut<UserProgress>(user_addr);
        if (!vector::contains(&progress.completed_challenges, &challenge_id)) {
            vector::push_back(&mut progress.completed_challenges, challenge_id);
            event::emit_event(&mut registry.challenge_completion_events, ChallengeCompleted {
                user: user_addr,
                challenge_id
            });
        };
    }
}
