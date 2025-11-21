use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, events::*, state::*};

/// Leave a community
/// 
/// Validation:
/// - User must be a member of the community
/// - Only the user can leave their own membership
/// 
/// Events: CommunityLeft
#[derive(Accounts)]
pub struct LeaveCommunity<'info> {
    #[account(mut)]
    pub community: Account<'info, CommunityAccount>,
    
    #[account(
        mut,
        close = user,
        seeds = [MEMBERSHIP_SEED, community.key().as_ref(), user.key().as_ref()],
        bump,
        has_one = community,
        has_one = user
    )]
    pub membership: Account<'info, MembershipAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
}

pub fn leave_community(ctx: Context<LeaveCommunity>) -> Result<()> {
    let community = &mut ctx.accounts.community;
    let clock = Clock::get()?;
    
    // Decrement member count
    community.member_count = community.member_count
        .checked_sub(1)
        .ok_or(SocialError::ArithmeticOverflow)?;
    
    emit!(CommunityLeft {
        community: community.key(),
        user: ctx.accounts.user.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
