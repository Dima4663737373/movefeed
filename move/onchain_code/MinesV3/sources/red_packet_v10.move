module mines::red_packet_v10 {
    use std::signer;
    use std::string::String;
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::account;
    use aptos_framework::timestamp;

    // Errors
    const E_NOT_INITIALIZED: u64 = 1;
    const E_PACKET_EXISTS: u64 = 2;
    const E_PACKET_NOT_FOUND: u64 = 3;
    const E_PACKET_EMPTY: u64 = 4;
    const E_ALREADY_CLAIMED: u64 = 5;

    struct RedPacket has store, drop, copy {
        creator: address,
        total_amount: u64,
        remaining_amount: u64,
        total_count: u64,
        remaining_count: u64,
        is_random: bool,
        message: String,
        claimers: vector<address>,
        timestamp: u64,
    }

    struct PacketStore has key {
        packets: vector<RedPacket>,
        packet_codes: vector<String>,
        signer_cap: account::SignerCapability,
    }

    public entry fun initialize(account: &signer) {
        let addr = signer::address_of(account);
        if (!exists<PacketStore>(addr)) {
            let (resource_signer, signer_cap) = account::create_resource_account(account, x"06");
            
            // Register resource account to receive AptosCoin
            if (!coin::is_account_registered<AptosCoin>(signer::address_of(&resource_signer))) {
                coin::register<AptosCoin>(&resource_signer);
            };

            move_to(account, PacketStore {
                packets: vector::empty(),
                packet_codes: vector::empty(),
                signer_cap,
            });
        };
    }

    public entry fun create_packet(
        account: &signer,
        code: String,
        amount: u64,
        count: u64,
        is_random: bool,
        message: String
    ) acquires PacketStore {
        let store = borrow_global_mut<PacketStore>(@mines);
        
        // Ensure code is unique
        assert!(!vector::contains(&store.packet_codes, &code), E_PACKET_EXISTS);

        // Transfer funds to resource account
        let resource_account_addr = account::get_signer_capability_address(&store.signer_cap);
        coin::transfer<AptosCoin>(account, resource_account_addr, amount);

        let packet = RedPacket {
            creator: signer::address_of(account),
            total_amount: amount,
            remaining_amount: amount,
            total_count: count,
            remaining_count: count,
            is_random,
            message,
            claimers: vector::empty(),
            timestamp: timestamp::now_seconds(),
        };

        vector::push_back(&mut store.packets, packet);
        vector::push_back(&mut store.packet_codes, code);
    }

    public entry fun claim_packet(
        account: &signer,
        code: String
    ) acquires PacketStore {
        let account_addr = signer::address_of(account);
        let store = borrow_global_mut<PacketStore>(@mines);
        
        let (found, index) = vector::index_of(&store.packet_codes, &code);
        assert!(found, E_PACKET_NOT_FOUND);

        let packet = vector::borrow_mut(&mut store.packets, index);
        
        // Checks
        assert!(packet.remaining_count > 0, E_PACKET_EMPTY);
        assert!(!vector::contains(&packet.claimers, &account_addr), E_ALREADY_CLAIMED);

        // Calculate amount
        let claim_amount = if (packet.remaining_count == 1) {
            packet.remaining_amount
        } else if (packet.is_random) {
            // Simple pseudo-random: (timestamp + remaining_amount) % (remaining_amount / remaining_count * 2)
            // This ensures we don't drain everything too fast but gives variety
            let avg = packet.remaining_amount / packet.remaining_count;
            let seed = timestamp::now_microseconds() + packet.remaining_amount;
            // Range [1, avg * 2]
            let random_part = seed % (avg * 2); 
            if (random_part == 0) 1 else random_part
        } else {
            packet.remaining_amount / packet.remaining_count
        };

        // Safety cap
        if (claim_amount > packet.remaining_amount) {
            claim_amount = packet.remaining_amount;
        };

        // Update state
        packet.remaining_amount = packet.remaining_amount - claim_amount;
        packet.remaining_count = packet.remaining_count - 1;
        vector::push_back(&mut packet.claimers, account_addr);

        // Transfer funds from resource account
        let resource_signer = account::create_signer_with_capability(&store.signer_cap);
        coin::transfer<AptosCoin>(&resource_signer, account_addr, claim_amount);
    }
}
