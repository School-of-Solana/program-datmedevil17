use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, events::*, state::*};

/// Unfollow a user
/// 
/// Validation:
/// - Must currently be following the user
/// - Only the follower can unfollow
/// 
/// Events: UserUnfollowed
#[derive(Accounts)]
pub struct UnfollowUser<'info> {
    #[account(
        seeds = [PROFILE_SEED, owner.key().as_ref()],
        bump,
        has_one = owner
    )]
    pub follower_profile: Account<'info, ProfileAccount>,
    
    #[account(mut)]
    pub followed_profile: Account<'info, ProfileAccount>,
    
    #[account(
        mut,
        close = owner,
        seeds = [FOLLOW_SEED, follower_profile.key().as_ref(), followed_profile.key().as_ref()],
        bump
    )]
    pub follow: Account<'info, FollowAccount>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
}

pub fn unfollow_user(ctx: Context<UnfollowUser>) -> Result<()> {
    let clock = Clock::get()?;
    
    // Update counts
    ctx.accounts.followed_profile.follower_count = ctx.accounts.followed_profile
        .follower_count
        .checked_sub(1)
        .ok_or(SocialError::ArithmeticOverflow)?;
    
    emit!(UserUnfollowed {
        follower: ctx.accounts.follow.follower,
        unfollowed: ctx.accounts.follow.followed,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
