use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, events::*, state::*};


#[derive(Accounts)]
#[instruction(name: String, description_uri: String, community_id: u64)]
pub struct CreateCommunity<'info> {
    #[account(
        init,
        payer = creator,
        space = COMMUNITY_SIZE,
        seeds = [COMMUNITY_SEED, &community_id.to_le_bytes()],
        bump
    )]
    pub community: Account<'info, CommunityAccount>,
    
    #[account(
        seeds = [PROFILE_SEED, creator.key().as_ref()],
        bump
    )]
    pub creator_profile: Account<'info, ProfileAccount>,
    
    #[account(
        init,
        payer = creator,
        space = MEMBERSHIP_SIZE,
        seeds = [MEMBERSHIP_SEED, community.key().as_ref(), creator.key().as_ref()],
        bump
    )]
    pub membership: Account<'info, MembershipAccount>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_community(
    ctx: Context<CreateCommunity>,
    name: String,
    description_uri: String,
    community_id: u64,
) -> Result<()> {
    // Validate string lengths
    require!(
        name.len() <= MAX_COMMUNITY_NAME_LEN,
        SocialError::CommunityNameTooLong
    );
    require!(
        description_uri.len() <= MAX_DESCRIPTION_URI_LEN,
        SocialError::DescriptionUriTooLong
    );
    
    let community = &mut ctx.accounts.community;
    let membership = &mut ctx.accounts.membership;
    let clock = Clock::get()?;
    
    community.name = name.clone();
    community.description_uri = description_uri;
    community.creator = ctx.accounts.creator.key();
    community.community_id = community_id;
    community.member_count = 1; // Creator is first member
    community.post_counter = 0;
    community.poll_counter = 0;
    community.created_at = clock.unix_timestamp;
    
    // Initialize creator's membership
    membership.community = community.key();
    membership.user = ctx.accounts.creator.key();
    membership.joined_at = clock.unix_timestamp;
    
    emit!(CommunityCreated {
        community: community.key(),
        creator: community.creator,
        name,
        timestamp: clock.unix_timestamp,
    });
    
    emit!(CommunityJoined {
        community: community.key(),
        user: ctx.accounts.creator.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
