// PDA Seeds
pub const PROFILE_SEED: &[u8] = b"profile";
pub const COMMUNITY_SEED: &[u8] = b"community";
pub const MEMBERSHIP_SEED: &[u8] = b"membership";
pub const POST_SEED: &[u8] = b"post";
pub const LIKE_SEED: &[u8] = b"like";
pub const COMMENT_SEED: &[u8] = b"comment";
pub const FOLLOW_SEED: &[u8] = b"follow";
pub const POLL_SEED: &[u8] = b"poll";
pub const VOTE_SEED: &[u8] = b"vote";

// String Length Limits
pub const MAX_DISPLAY_NAME_LEN: usize = 50;
pub const MAX_AVATAR_URI_LEN: usize = 200;
pub const MAX_COMMUNITY_NAME_LEN: usize = 100;
pub const MAX_DESCRIPTION_URI_LEN: usize = 200;
pub const MAX_CONTENT_URI_LEN: usize = 200;
pub const MAX_PSEUDONYM_LEN: usize = 30;
pub const MAX_QUESTION_URI_LEN: usize = 200;
pub const MAX_POLL_OPTIONS: usize = 10;

// Tipping
pub const FIXED_TIP_AMOUNT: u64 = 2_000_000; // 0.002 SOL in lamports

// Account Space Calculations (in bytes)
// Base: 8 (discriminator)
pub const PROFILE_SIZE: usize = 8 + 32 + 4 + MAX_DISPLAY_NAME_LEN + 4 + MAX_AVATAR_URI_LEN + 8 + 8 + 8;
pub const COMMUNITY_SIZE: usize = 8 + 4 + MAX_COMMUNITY_NAME_LEN + 4 + MAX_DESCRIPTION_URI_LEN + 32 + 8 + 8 + 8 + 8;
pub const MEMBERSHIP_SIZE: usize = 8 + 32 + 32 + 8;
pub const POST_SIZE: usize = 8 + 32 + 8 + 4 + MAX_CONTENT_URI_LEN + 32 + 1 + 32 + 1 + 4 + MAX_PSEUDONYM_LEN + 8 + 8 + 8 + 8;
pub const LIKE_SIZE: usize = 8 + 32 + 32 + 8;
pub const COMMENT_SIZE: usize = 8 + 32 + 32 + 8 + 4 + MAX_CONTENT_URI_LEN + 32 + 8;
pub const FOLLOW_SIZE: usize = 8 + 32 + 32 + 8;
pub const POLL_SIZE: usize = 8 + 32 + 8 + 4 + MAX_QUESTION_URI_LEN + 4 + (32 * MAX_POLL_OPTIONS) + 4 + (4 * MAX_POLL_OPTIONS) + 32 + 8 + 8;
pub const VOTE_SIZE: usize = 8 + 32 + 32 + 1 + 8;