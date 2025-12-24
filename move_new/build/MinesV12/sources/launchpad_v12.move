module mines::launchpad_v12 {
    use std::signer;
    use std::string::{String};
    use std::option;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::fungible_asset::{Self, Metadata};
    use aptos_framework::primary_fungible_store;
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;

    struct TokenRefs has key {
        mint_ref: fungible_asset::MintRef,
        burn_ref: fungible_asset::BurnRef,
        transfer_ref: fungible_asset::TransferRef,
    }

    struct LiquidityPool has key {
        reserve_apt: coin::Coin<AptosCoin>,
        virtual_apt_reserve: u64,
    }

    const E_NOT_TRADEABLE: u64 = 1;
    const E_SLIPPAGE_EXCEEDED: u64 = 2;

    // Constant for initial virtual liquidity
    // 200 APT (8 decimals) -> 200 * 10^8
    const VIRTUAL_APT_RESERVE: u64 = 20000000000; 

    public entry fun create_token(
        creator: &signer,
        name: String,
        symbol: String,
        decimals: u8,
        icon_uri: String,
        project_uri: String,
        initial_supply: u64, 
        enable_trading: bool
    ) {
        let constructor_ref = &object::create_object_from_account(creator);
        
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

        let object_signer = object::generate_signer(constructor_ref);
        let token_obj_addr = signer::address_of(&object_signer);
        
        if (enable_trading && initial_supply > 0) {
            // Mint all to the pool (the object itself)
            let tokens = fungible_asset::mint(&mint_ref, initial_supply);
            primary_fungible_store::deposit(token_obj_addr, tokens);
            
            // Create pool
            move_to(&object_signer, LiquidityPool {
                reserve_apt: coin::zero<AptosCoin>(),
                virtual_apt_reserve: VIRTUAL_APT_RESERVE,
            });
        } else if (initial_supply > 0) {
            // Mint to creator
            let coins = fungible_asset::mint(&mint_ref, initial_supply);
            primary_fungible_store::deposit(signer::address_of(creator), coins);
        };

        move_to(&object_signer, TokenRefs {
            mint_ref,
            burn_ref,
            transfer_ref
        });
    }

    public entry fun buy(
        user: &signer,
        token_obj: Object<Metadata>,
        apt_amount_in: u64,
        min_tokens_out: u64
    ) acquires LiquidityPool, TokenRefs {
        let token_addr = object::object_address(&token_obj);
        assert!(exists<LiquidityPool>(token_addr), E_NOT_TRADEABLE);
        
        let pool = borrow_global_mut<LiquidityPool>(token_addr);
        let refs = borrow_global<TokenRefs>(token_addr);
        
        // Calculate reserves
        // Token reserve is in the object's primary store
        let token_store = primary_fungible_store::primary_store(token_addr, token_obj);
        let y = fungible_asset::balance(token_store);
        
        let x = pool.virtual_apt_reserve + coin::value(&pool.reserve_apt);
        
        // Constant Product: x * y = k
        let x_new = x + apt_amount_in;
        let x_u128 = (x as u128);
        let y_u128 = (y as u128);
        let x_new_u128 = (x_new as u128);
        let y_new_val = (x_u128 * y_u128) / x_new_u128;
        let y_new = (y_new_val as u64);
        let tokens_out = y - y_new;
        
        assert!(tokens_out >= min_tokens_out, E_SLIPPAGE_EXCEEDED);
        
        // Take APT
        let apt_coins = coin::withdraw<AptosCoin>(user, apt_amount_in);
        coin::merge(&mut pool.reserve_apt, apt_coins);
        
        // Give Tokens (withdraw from object's store)
        let tokens = fungible_asset::withdraw_with_ref(&refs.transfer_ref, token_store, tokens_out);
        primary_fungible_store::deposit(signer::address_of(user), tokens);
    }
    
    public entry fun sell(
        user: &signer,
        token_obj: Object<Metadata>,
        token_amount_in: u64,
        min_apt_out: u64
    ) acquires LiquidityPool {
        let token_addr = object::object_address(&token_obj);
        assert!(exists<LiquidityPool>(token_addr), E_NOT_TRADEABLE);
        
        let pool = borrow_global_mut<LiquidityPool>(token_addr);
        
        let token_store = primary_fungible_store::primary_store(token_addr, token_obj);
        let y = fungible_asset::balance(token_store);
        
        let x = pool.virtual_apt_reserve + coin::value(&pool.reserve_apt);
        
        let y_new = y + token_amount_in;
        let x_u128 = (x as u128);
        let y_u128 = (y as u128);
        let y_new_u128 = (y_new as u128);
        let x_new_val = (x_u128 * y_u128) / y_new_u128;
        let x_new = (x_new_val as u64);
        let apt_out = x - x_new;
        
        assert!(apt_out >= min_apt_out, E_SLIPPAGE_EXCEEDED);
        
        // Take Tokens
        let tokens = primary_fungible_store::withdraw(user, token_obj, token_amount_in);
        primary_fungible_store::deposit(token_addr, tokens); // Deposit back to pool
        
        // Give APT
        let apt_coins = coin::extract(&mut pool.reserve_apt, apt_out);
        coin::deposit(signer::address_of(user), apt_coins);
    }
}
