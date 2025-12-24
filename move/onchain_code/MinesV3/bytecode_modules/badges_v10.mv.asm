// Move bytecode v7
module ed56c3467b6bed0432a489e6f5adf9e9580b1bf3e3509694053149c42dc23020.badges_v10 {
use 0000000000000000000000000000000000000000000000000000000000000001::string;
use 0000000000000000000000000000000000000000000000000000000000000001::event;
use 0000000000000000000000000000000000000000000000000000000000000001::signer;
use 0000000000000000000000000000000000000000000000000000000000000001::account;


struct Badge has copy, drop, store {
	id: u64,
	name: String,
	description: String,
	image_url: String
}
struct BadgeEvent has drop, store {
	recipient: address,
	badge_id: u64
}
struct BadgeRegistry has key {
	badges: vector<Badge>,
	badge_events: EventHandle<BadgeEvent>
}
struct UserBadges has key {
	badges: vector<u64>
}

entry public initialize_badges(Arg0: &signer) /* def_idx: 0 */ {
B0:
	0: CopyLoc[0](Arg0: &signer)
	1: Call signer::address_of(&signer): address
	2: Exists[2](BadgeRegistry)
	3: BrTrue(11)
B1:
	4: CopyLoc[0](Arg0: &signer)
	5: VecPack(3, 0)
	6: MoveLoc[0](Arg0: &signer)
	7: Call account::new_event_handle<BadgeEvent>(&signer): EventHandle<BadgeEvent>
	8: Pack[2](BadgeRegistry)
	9: MoveTo[2](BadgeRegistry)
B2:
	10: Ret
B3:
	11: MoveLoc[0](Arg0: &signer)
	12: Pop
	13: Branch(10)
}
entry public mint_badge(Arg0: &signer, Arg1: address, Arg2: u64) /* def_idx: 1 */ {
B0:
	0: LdConst[0](Address: [237, 86, 195, 70, 123, 107, 237, 4, 50, 164, 137, 230, 245, 173, 249, 233, 88, 11, 27, 243, 227, 80, 150, 148, 5, 49, 73, 196, 45, 194, 48, 32])
	1: MoveLoc[0](Arg0: &signer)
	2: Pop
	3: MutBorrowGlobal[2](BadgeRegistry)
	4: MutBorrowField[0](BadgeRegistry.badge_events: EventHandle<BadgeEvent>)
	5: MoveLoc[1](Arg1: address)
	6: MoveLoc[2](Arg2: u64)
	7: Pack[1](BadgeEvent)
	8: Call event::emit_event<BadgeEvent>(&mut EventHandle<BadgeEvent>, BadgeEvent)
	9: Ret
}
}