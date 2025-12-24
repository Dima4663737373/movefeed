module tipjar_addr::RedPacket {
    use std::signer;
    use std::string::{String};
    use std::vector;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::account;
    use aptos_framework::timestamp;

    // Errors
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_PACKET_EXISTS: u64 = 2;
    const E_PACKET_NOT_FOUND: u64 = 3;
    const E_PACKET_EMPTY: u64 = 4;
    const E_ALREADY_CLAIMED: u64 = 5;

    struct Packet has store, drop {
        creator: address,
        total_amount: u64,
        remaining_amount: u64,
        total_count: u64,
        remaining_count: u64,
        is_random: bool,
        claimers: vector<address>,
        message: String,
        timestamp: u64,
    }

    struct PacketStore has key {
        packets: vector<Packet>,
        packet_codes: vector<String>, 
    }

    struct ModuleData has key {
        signer_cap: account::SignerCapability,
    }

    fun init_module(resource_signer: &signer) {
        let (_resource_account_signer, resource_signer_cap) = account::create_resource_account(resource_signer, x"01");
        
        move_to(resource_signer, ModuleData {
            signer_cap: resource_signer_cap,
        });

        move_to(resource_signer, PacketStore {
            packets: vector::empty(),
            packet_codes: vector::empty(),
        });
    }

    public entry fun create_packet(
        account: &signer,
        code: String,
        total_amount: u64,
        count: u64,
        is_random: bool,
        message: String
    ) acquires ModuleData, PacketStore {
        let sender_addr = signer::address_of(account);
        
        // 1. Get Resource Account
        let module_data = borrow_global<ModuleData>(@tipjar_addr);
        let resource_signer = account::create_signer_with_capability(&module_data.signer_cap);
        let resource_addr = signer::address_of(&resource_signer);

        // 2. Register Resource Account for AptosCoin if needed (usually auto-registered on transfer if feature enabled, but safe to ensure)
        if (!coin::is_account_registered<AptosCoin>(resource_addr)) {
            coin::register<AptosCoin>(&resource_signer);
        };

        // 3. Transfer coins to Resource Account
        coin::transfer<AptosCoin>(account, resource_addr, total_amount);

        // 4. Create Packet
        let store = borrow_global_mut<PacketStore>(@tipjar_addr);
        
        // Check if code exists
        let i = 0;
        let len = vector::length(&store.packet_codes);
        while (i < len) {
            let existing_code = vector::borrow(&store.packet_codes, i);
            assert!(existing_code != &code, E_PACKET_EXISTS);
            i = i + 1;
        };

        let packet = Packet {
            creator: sender_addr,
            total_amount,
            remaining_amount: total_amount,
            total_count: count,
            remaining_count: count,
            is_random,
            claimers: vector::empty(),
            message,
            timestamp: timestamp::now_seconds(),
        };

        vector::push_back(&mut store.packets, packet);
        vector::push_back(&mut store.packet_codes, code);
    }

    public entry fun claim_packet(
        account: &signer,
        code: String
    ) acquires ModuleData, PacketStore {
        let claimer_addr = signer::address_of(account);
        let store = borrow_global_mut<PacketStore>(@tipjar_addr);
        
        // Find packet
        let found = false;
        let i = 0;
        let len = vector::length(&store.packet_codes);
        while (i < len) {
            if (vector::borrow(&store.packet_codes, i) == &code) {
                found = true;
                break
            };
            i = i + 1;
        };
        assert!(found, E_PACKET_NOT_FOUND);

        let packet = vector::borrow_mut(&mut store.packets, i);
        
        // Checks
        assert!(packet.remaining_count > 0, E_PACKET_EMPTY);
        assert!(!vector::contains(&packet.claimers, &claimer_addr), E_ALREADY_CLAIMED);

        // Calculate Amount
        let claim_amount = if (packet.remaining_count == 1) {
            packet.remaining_amount
        } else if (!packet.is_random) {
            packet.remaining_amount / packet.remaining_count
        } else {
            // Random logic
            let seed = timestamp::now_microseconds();
            let avg = packet.remaining_amount / packet.remaining_count;
            // Limit max to 2x average, but also ensure we don't drain too much early
            let max = avg * 2;
            let rand = seed % max;
            if (rand == 0) rand = 1;
            
            // Ensure we leave enough for others (simplistic check)
            if (packet.remaining_amount - rand < (packet.remaining_count - 1)) {
                 rand = packet.remaining_amount - (packet.remaining_count - 1);
            };
            rand
        };

        // Update Packet
        packet.remaining_count = packet.remaining_count - 1;
        packet.remaining_amount = packet.remaining_amount - claim_amount;
        vector::push_back(&mut packet.claimers, claimer_addr);

        // Transfer Coins
        let module_data = borrow_global<ModuleData>(@tipjar_addr);
        let resource_signer = account::create_signer_with_capability(&module_data.signer_cap);
        
        coin::transfer<AptosCoin>(&resource_signer, claimer_addr, claim_amount);
    }
}
