use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, events::*, state::*};

/// Join an existing community
/// 
/// Validation:
/// - User must have a profile
/// - User cannot join the same community twice
/// - Community must exist
/// 
/// Events: CommunityJoined
#[derive(Accounts)]
pub struct JoinCommunity<'info> {
    #[account(mut)]
    pub community: Account<'info, CommunityAccount>,
    
    #[account(
        seeds = [PROFILE_SEED, user.key().as_ref()],
        bump
    )]
    pub user_profile: Account<'info, ProfileAccount>,
    
    #[account(
        init,
        payer = user,
        space = MEMBERSHIP_SIZE,
        seeds = [MEMBERSHIP_SEED, community.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub membership: Account<'info, MembershipAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn join_community(ctx: Context<JoinCommunity>) -> Result<()> {
    let community = &mut ctx.accounts.community;
    let membership = &mut ctx.accounts.membership;
    let clock = Clock::get()?;
    
    membership.community = community.key();
    membership.user = ctx.accounts.user.key();
    membership.joined_at = clock.unix_timestamp;
    
    // Increment member count
    community.member_count = community.member_count
        .checked_add(1)
        .ok_or(SocialError::ArithmeticOverflow)?;
    
    emit!(CommunityJoined {
        community: community.key(),
        user: ctx.accounts.user.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
