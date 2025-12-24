module mines::donations_v12 {
    use std::signer;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_std::table::{Self, Table};
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    struct Registry has key {
        total_tips: Table<address, u64>,
        authors: vector<address>,
        global_total: u64,
        tip_events: EventHandle<TipEvent>,
    }

    struct TopTipperStats has key {
        sent_counts: Table<address, u64>,
        top_tipper: address,
        top_amount: u64,
    }

    struct TipEvent has drop, store {
        sender: address,
        recipient: address,
        amount: u64,
    }

    public entry fun initialize_donations(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<Registry>(addr)) {
            move_to(account, Registry {
                total_tips: table::new(),
                authors: vector::empty(),
                global_total: 0,
                tip_events: account::new_event_handle<TipEvent>(account),
            });
        };
        
        if (!exists<TopTipperStats>(addr)) {
            move_to(account, TopTipperStats {
                sent_counts: table::new(),
                top_tipper: @0x0,
                top_amount: 0,
            });
        }
    }

    public entry fun send_tip(sender: &signer, author: address, amount: u64) acquires Registry, TopTipperStats {
        let sender_addr = signer::address_of(sender);
        coin::transfer<AptosCoin>(sender, author, amount);
        let registry = borrow_global_mut<Registry>(@mines);
        
        if (!table::contains(&registry.total_tips, author)) {
            vector::push_back(&mut registry.authors, author);
            table::add(&mut registry.total_tips, author, amount);
        } else {
            let current = table::borrow_mut(&mut registry.total_tips, author);
            *current = *current + amount;
        };
        
        registry.global_total = registry.global_total + amount;
        event::emit_event(&mut registry.tip_events, TipEvent {
            sender: sender_addr,
            recipient: author,
            amount,
        });

        if (exists<TopTipperStats>(@mines)) {
            let stats = borrow_global_mut<TopTipperStats>(@mines);
            let sent_amount;
            if (!table::contains(&stats.sent_counts, sender_addr)) {
                table::add(&mut stats.sent_counts, sender_addr, amount);
                sent_amount = amount;
            } else {
                let current = table::borrow_mut(&mut stats.sent_counts, sender_addr);
                *current = *current + amount;
                sent_amount = *current;
            };

            if (sent_amount > stats.top_amount) {
                stats.top_amount = sent_amount;
                stats.top_tipper = sender_addr;
            };
        }
    }

    public fun get_global_tip_stats(): (u64, address, u64) acquires Registry, TopTipperStats {
        let total = 0;
        if (exists<Registry>(@mines)) {
            total = borrow_global<Registry>(@mines).global_total;
        };

        let top_tipper = @0x0;
        let top_amount = 0;

        if (exists<TopTipperStats>(@mines)) {
            let stats = borrow_global<TopTipperStats>(@mines);
            top_tipper = stats.top_tipper;
            top_amount = stats.top_amount;
        };
        
        (total, top_tipper, top_amount)
    }

    public fun get_all_authors(): vector<address> acquires Registry {
        if (exists<Registry>(@mines)) {
            borrow_global<Registry>(@mines).authors
        } else {
            vector::empty()
        }
    }

    public fun get_author_tips(author: address): u64 acquires Registry {
        if (exists<Registry>(@mines)) {
            let registry = borrow_global<Registry>(@mines);
            if (table::contains(&registry.total_tips, author)) {
                *table::borrow(&registry.total_tips, author)
            } else {
                0
            }
        } else {
            0
        }
    }
}
