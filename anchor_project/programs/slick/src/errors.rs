use anchor_lang::prelude::*;

#[error_code]
pub enum SocialError {
    #[msg("Display name is too long")]
    DisplayNameTooLong,
    #[msg("Avatar URI is too long")]
    AvatarUriTooLong,
    #[msg("Content URI is too long")]
    ContentUriTooLong,
    #[msg("Question URI is too long")]
    QuestionUriTooLong,
    #[msg("Community name is too long")]
    CommunityNameTooLong,
    #[msg("Description URI is too long")]
    DescriptionUriTooLong,
    #[msg("Pseudonym is required for anonymous posts")]
    PseudonymRequired,
    #[msg("Pseudonym is too long")]
    PseudonymTooLong,
    #[msg("Pseudonym not allowed for non-anonymous posts")]
    PseudonymNotAllowed,
    #[msg("Cannot follow yourself")]
    CannotFollowSelf,
    #[msg("Cannot like your own post")]
    CannotLikeOwnPost,
    #[msg("Not following this user")]
    NotFollowing,
    #[msg("Invalid tip amount")]
    InvalidTipAmount,
    #[msg("Too many poll options")]
    TooManyPollOptions,
    #[msg("Poll has ended")]
    PollEnded,
    #[msg("Invalid poll option")]
    InvalidPollOption,
    #[msg("Arithmetic overflow")]
    ArithmeticOverflow,
}
