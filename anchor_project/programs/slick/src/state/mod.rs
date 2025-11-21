use anchor_lang::prelude::*;

/// User profile account
/// PDA: ["profile", user_wallet]
/// 
/// Stores user identity information. Display name and avatar are on-chain
/// for quick access and verification. Profile is wallet-owned and can only
/// be updated by the wallet owner.
#[account]
pub struct ProfileAccount {
    /// Owner wallet public key
    pub owner: Pubkey, // 32
    
    /// Display name shown in the app
    pub display_name: String, // 4 + max 50
    
    /// URI to avatar image (IPFS/Arweave)
    pub avatar_uri: String, // 4 + max 200
    
    /// Number of followers (updated on follow/unfollow)
    pub follower_count: u64, // 8
    
    /// Number of users this profile is following
    pub following_count: u64, // 8
    
    /// Timestamp when profile was created
    pub created_at: i64, // 8
}

/// Community account
/// PDA: ["community", community_id (u64)]
/// 
/// Represents a community (like a subreddit). Anyone can create.
/// Description is stored off-chain (URI) to save space.
/// Counters are maintained on-chain for generating sequential IDs.
#[account]
pub struct CommunityAccount {
    /// Community name
    pub name: String, // 4 + max 100
    
    /// URI to full description/rules (IPFS/Arweave)
    pub description_uri: String, // 4 + max 200
    
    /// Creator's public key
    pub creator: Pubkey, // 32
    
    /// Unique ID for this community
    pub community_id: u64, // 8
    
    /// Total number of members
    pub member_count: u64, // 8
    
    /// Counter for generating post IDs
    pub post_counter: u64, // 8
    
    /// Counter for generating poll IDs
    pub poll_counter: u64, // 8
    
    /// Timestamp when community was created
    pub created_at: i64, // 8
}

/// Membership record
/// PDA: ["membership", community_pubkey, user_wallet]
/// 
/// Proves a user is a member of a community. Required to post, vote, etc.
/// Small account for efficient lookups.
#[account]
pub struct MembershipAccount {
    /// Community this membership belongs to
    pub community: Pubkey, // 32
    
    /// User who is a member
    pub user: Pubkey, // 32
    
    /// Timestamp when user joined
    pub joined_at: i64, // 8
}

/// Post account
/// PDA: ["post", community_pubkey, post_id (u64)]
/// 
/// Represents a post in a community. Content is off-chain (URI + hash).
/// Author can be None for anonymous posts (ghost mode).
/// Counters track engagement metrics on-chain.
#[account]
pub struct PostAccount {
    /// Community where post was created
    pub community: Pubkey, // 32
    
    /// Sequential ID within the community
    pub post_id: u64, // 8
    
    /// URI to post content (IPFS/Arweave)
    pub content_uri: String, // 4 + max 200
    
    /// Hash of content for integrity verification
    pub content_hash: [u8; 32], // 32
    
    /// Author's public key (None if anonymous)
    pub author: Option<Pubkey>, // 1 + 32
    
    /// Pseudonym for anonymous posts
    pub pseudonym: Option<String>, // 1 + 4 + max 30
    
    /// Number of likes
    pub likes_count: u64, // 8
    
    /// Number of comments
    pub comments_count: u64, // 8
    
    /// Total tips received in lamports
    pub total_tip_lamports: u64, // 8
    
    /// Timestamp when post was created
    pub created_at: i64, // 8
}

/// Like record
/// PDA: ["like", post_pubkey, user_wallet]
/// 
/// Records that a user liked a post. Used to enforce one-like-per-user
/// and to allow unlike functionality.
#[account]
pub struct LikeAccount {
    /// Post that was liked
    pub post: Pubkey, // 32
    
    /// User who liked
    pub liker: Pubkey, // 32
    
    /// Timestamp when liked
    pub liked_at: i64, // 8
}

/// Comment account
/// PDA: ["comment", post_pubkey, comment_id (u64)]
/// 
/// Represents a comment on a post. Content is off-chain.
/// Comment ID is derived from post's comment_counter.
#[account]
pub struct CommentAccount {
    /// Post this comment belongs to
    pub post: Pubkey, // 32
    
    /// User who commented
    pub commenter: Pubkey, // 32
    
    /// Sequential ID within the post
    pub comment_id: u64, // 8
    
    /// URI to comment content (IPFS/Arweave)
    pub content_uri: String, // 4 + max 200
    
    /// Hash of content for integrity
    pub content_hash: [u8; 32], // 32
    
    /// Timestamp when comment was created
    pub created_at: i64, // 8
}

/// Follow relationship
/// PDA: ["follow", follower_wallet, followed_wallet]
/// 
/// Records that one user follows another. Used to enforce
/// one-follow-per-pair and to allow unfollow functionality.
#[account]
pub struct FollowAccount {
    /// User who is following
    pub follower: Pubkey, // 32
    
    /// User being followed
    pub followed: Pubkey, // 32
    
    /// Timestamp when follow occurred
    pub followed_at: i64, // 8
}

/// Poll account
/// PDA: ["poll", community_pubkey, poll_id (u64)]
/// 
/// Represents a poll in a community. Options are user profiles (Pubkeys).
/// Vote counts are maintained on-chain for transparency.
/// Question details are off-chain (URI).
#[account]
pub struct PollAccount {
    /// Community where poll was created
    pub community: Pubkey, // 32
    
    /// Sequential ID within the community
    pub poll_id: u64, // 8
    
    /// URI to poll question/description
    pub question_uri: String, // 4 + max 200
    
    /// Profile pubkeys that are options in this poll
    pub option_profiles: Vec<Pubkey>, // 4 + (32 * count, max 10)
    
    /// Vote count for each option (parallel to option_profiles)
    pub votes_per_option: Vec<u32>, // 4 + (4 * count, max 10)
    
    /// Creator of the poll
    pub created_by: Pubkey, // 32
    
    /// Unix timestamp when poll ends
    pub end_time: i64, // 8
    
    /// Timestamp when poll was created
    pub created_at: i64, // 8
}

/// Vote record
/// PDA: ["vote", poll_pubkey, voter_wallet]
/// 
/// Records that a user voted in a poll and which option they chose.
/// Enforces one-vote-per-user-per-poll.
#[account]
pub struct VoteAccount {
    /// Poll this vote belongs to
    pub poll: Pubkey, // 32
    
    /// User who voted
    pub voter: Pubkey, // 32
    
    /// Index of the option voted for
    pub option_index: u8, // 1
    
    /// Timestamp when vote was cast
    pub voted_at: i64, // 8
}