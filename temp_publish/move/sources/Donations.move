module mines::donations {
    use std::signer;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::event;
    use aptos_framework::account;
    use aptos_std::table::{Self, Table};

    struct Registry has key {
        total_tips: Table<address, u64>,
        tip_events: event::EventHandle<TipSent>,
    }

    struct TipSent has drop, store {
        author: address,
        amount: u64,
        sender: address,
    }

    fun init_module(account: &signer) {
        move_to(account, Registry {
            total_tips: table::new(),
            tip_events: account::new_event_handle<TipSent>(account),
        });
    }

    public entry fun send_tip(sender: &signer, author: address, amount: u64) acquires Registry {
        let sender_addr = signer::address_of(sender);
        
        // Transfer coins
        coin::transfer<AptosCoin>(sender, author, amount);

        // Update Registry
        let registry = borrow_global_mut<Registry>(@mines);
        
        if (table::contains(&registry.total_tips, author)) {
            let current = table::borrow_mut(&mut registry.total_tips, author);
            *current = *current + amount;
        } else {
            table::add(&mut registry.total_tips, author, amount);
        };

        event::emit_event(&mut registry.tip_events, TipSent {
            author,
            amount,
            sender: sender_addr,
        });
    }

    public fun get_author_tips(author: address): u64 acquires Registry {
        let registry = borrow_global<Registry>(@mines);
        if (table::contains(&registry.total_tips, author)) {
            *table::borrow(&registry.total_tips, author)
        } else {
            0
        }
    }
}
