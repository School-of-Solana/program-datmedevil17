use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, events::*, state::*};

/// Follow another user
/// 
/// Validation:
/// - Cannot follow yourself
/// - Cannot follow the same user twice
/// - Both profiles must exist
/// 
/// Events: UserFollowed
#[derive(Accounts)]
pub struct FollowUser<'info> {
    #[account(
        seeds = [PROFILE_SEED, owner.key().as_ref()],
        bump,
        has_one = owner @ SocialError::NotFollowing
    )]
    pub follower_profile: Account<'info, ProfileAccount>,
    
    #[account(mut)]
    pub followed_profile: Account<'info, ProfileAccount>,
    
    #[account(
        init,
        payer = owner,
        space = FOLLOW_SIZE,
        seeds = [FOLLOW_SEED, follower_profile.key().as_ref(), followed_profile.key().as_ref()],
        bump
    )]
    pub follow: Account<'info, FollowAccount>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn follow_user(ctx: Context<FollowUser>) -> Result<()> {
    // Check not following self
    require!(
        ctx.accounts.follower_profile.key() != ctx.accounts.followed_profile.key(),
        SocialError::CannotFollowSelf
    );
    
    let follow = &mut ctx.accounts.follow;
    let clock = Clock::get()?;
    
    follow.follower = ctx.accounts.follower_profile.key();
    follow.followed = ctx.accounts.followed_profile.key();
    follow.followed_at = clock.unix_timestamp;
    
    // Update counts
    ctx.accounts.followed_profile.follower_count = ctx.accounts.followed_profile
        .follower_count
        .checked_add(1)
        .ok_or(SocialError::ArithmeticOverflow)?;
    
    emit!(UserFollowed {
        follower: follow.follower,
        followed: follow.followed,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
