module hello_addr::hello {
    use std::string;
    use std::signer;
    use aptos_framework::account;
    use aptos_framework::event;

    struct Message has key {
        text: string::String,
    }

    public entry fun set_message(account: &signer, text: string::String) acquires Message {
        let addr = signer::address_of(account);
        if (exists<Message>(addr)) {
            let msg = borrow_global_mut<Message>(addr);
            msg.text = text;
        } else {
            move_to(account, Message { text });
        }
    }
}
