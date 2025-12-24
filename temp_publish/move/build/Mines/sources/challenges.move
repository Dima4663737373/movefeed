module mines::challenges {
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::event;
    use aptos_framework::account;

    struct Challenge has store, drop, copy {
        id: u64,
        description: String,
        reward: u64,
    }

    struct UserProgress has key {
        completed_challenges: vector<u64>,
    }
    
    struct ChallengeRegistry has key {
        challenges: vector<Challenge>,
        challenge_completion_events: event::EventHandle<ChallengeCompleted>,
    }

    struct ChallengeCompleted has drop, store {
        user: address,
        challenge_id: u64,
    }

    fun init_module(account: &signer) {
        move_to(account, ChallengeRegistry {
            challenges: vector::empty(),
            challenge_completion_events: account::new_event_handle<ChallengeCompleted>(account),
        });
    }

    public entry fun join_challenge(user: &signer, _challenge_id: u64) {
        let user_addr = signer::address_of(user);
        if (!exists<UserProgress>(user_addr)) {
            move_to(user, UserProgress { completed_challenges: vector::empty() });
        };
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
