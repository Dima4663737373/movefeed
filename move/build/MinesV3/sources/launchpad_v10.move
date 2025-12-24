module mines::launchpad_v10 {
    use std::signer;
    use std::string::{String};
    use std::option;
    use aptos_framework::object;
    use aptos_framework::fungible_asset::{Self};
    use aptos_framework::primary_fungible_store;

    struct TokenRefs has key {
        mint_ref: fungible_asset::MintRef,
        burn_ref: fungible_asset::BurnRef,
        transfer_ref: fungible_asset::TransferRef,
    }

    public entry fun create_token(
        creator: &signer,
        name: String,
        symbol: String,
        decimals: u8,
        icon_uri: String,
        project_uri: String,
        initial_supply: u64, 
    ) {
        // Create a non-deterministic object for the token metadata
        let constructor_ref = &object::create_object(signer::address_of(creator));
        
        primary_fungible_store::create_primary_store_enabled_fungible_asset(
            constructor_ref,
            option::none(),
            name,
            symbol,
            decimals,
            icon_uri,
            project_uri,
        );

        let mint_ref = fungible_asset::generate_mint_ref(constructor_ref);
        let burn_ref = fungible_asset::generate_burn_ref(constructor_ref);
        let transfer_ref = fungible_asset::generate_transfer_ref(constructor_ref);

        // Mint initial supply to creator
        if (initial_supply > 0) {
            let coins = fungible_asset::mint(&mint_ref, initial_supply);
            primary_fungible_store::deposit(signer::address_of(creator), coins);
        };

        // Store refs in the object so they can be managed later
        let object_signer = object::generate_signer(constructor_ref);
        move_to(&object_signer, TokenRefs {
            mint_ref,
            burn_ref,
            transfer_ref
        });
    }
}
