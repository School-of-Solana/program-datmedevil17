use anchor_lang::prelude::*;

// ============= PROFILE EVENTS =============
#[event]
pub struct ProfileCreated {
    pub profile: Pubkey,
    pub owner: Pubkey,
    pub display_name: String,
    pub timestamp: i64,
}

#[event]
pub struct ProfileUpdated {
    pub profile: Pubkey,
    pub owner: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct UserFollowed {
    pub follower: Pubkey,
    pub followed: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct UserUnfollowed {
    pub follower: Pubkey,
    pub unfollowed: Pubkey,
    pub timestamp: i64,
}

// ============= COMMUNITY EVENTS =============
#[event]
pub struct CommunityCreated {
    pub community: Pubkey,
    pub creator: Pubkey,
    pub name: String,
    pub timestamp: i64,
}

#[event]
pub struct CommunityJoined {
    pub community: Pubkey,
    pub user: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CommunityLeft {
    pub community: Pubkey,
    pub user: Pubkey,
    pub timestamp: i64,
}

// ============= POST EVENTS =============
#[event]
pub struct PostCreated {
    pub post: Pubkey,
    pub community: Pubkey,
    pub post_id: u64,
    pub author: Option<Pubkey>,
    pub is_anonymous: bool,
    pub timestamp: i64,
}

#[event]
pub struct PostLiked {
    pub post: Pubkey,
    pub liker: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PostUnliked {
    pub post: Pubkey,
    pub unliker: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct CommentCreated {
    pub comment: Pubkey,
    pub post: Pubkey,
    pub comment_id: u32,
    pub commenter: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct PostTipped {
    pub post: Pubkey,
    pub tipper: Pubkey,
    pub recipient: Pubkey,
    pub amount: u64,
    pub timestamp: i64,
}

// ============= POLL EVENTS =============
#[event]
pub struct PollCreated {
    pub poll: Pubkey,
    pub community: Pubkey,
    pub poll_id: u64,
    pub creator: Pubkey,
    pub end_time: i64,
    pub timestamp: i64,
}

#[event]
pub struct PollVoted {
    pub poll: Pubkey,
    pub voter: Pubkey,
    pub option_index: u8,
    pub timestamp: i64,
}
