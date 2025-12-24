module hello_addr::message {
    use std::string::{String, utf8};
    use std::signer;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    struct MessageHolder has key {
        message: String,
        message_change_events: EventHandle<MessageChangeEvent>,
    }

    struct MessageChangeEvent has drop, store {
        from_message: String,
        to_message: String,
    }

    public fun set_message(account: &signer, message_bytes: vector<u8>) acquires MessageHolder {
        let message = utf8(message_bytes);
        let account_addr = signer::address_of(account);
        if (!exists<MessageHolder>(account_addr)) {
            move_to(account, MessageHolder {
                message,
                message_change_events: account::new_event_handle<MessageChangeEvent>(account),
            })
        } else {
            let old_message_holder = borrow_global_mut<MessageHolder>(account_addr);
            let from_message = *&old_message_holder.message;
            event::emit_event(&mut old_message_holder.message_change_events, MessageChangeEvent {
                from_message,
                to_message: copy message,
            });
            old_message_holder.message = message;
        }
    }
}
