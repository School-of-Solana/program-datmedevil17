use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, events::*, state::*};

/// Creates a new user profile
/// 
/// Validation:
/// - Display name and avatar URI must be within length limits
/// - Each wallet can only have one profile
/// 
/// Events: ProfileCreated
#[derive(Accounts)]
pub struct CreateProfile<'info> {
    #[account(
        init,
        payer = owner,
        space = PROFILE_SIZE,
        seeds = [PROFILE_SEED, owner.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, ProfileAccount>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_profile(
    ctx: Context<CreateProfile>,
    display_name: String,
    avatar_uri: String,
) -> Result<()> {
    // Validate string lengths
    require!(
        display_name.len() <= MAX_DISPLAY_NAME_LEN,
        SocialError::DisplayNameTooLong
    );
    require!(
        avatar_uri.len() <= MAX_AVATAR_URI_LEN,
        SocialError::AvatarUriTooLong
    );
    
    let profile = &mut ctx.accounts.profile;
    let clock = Clock::get()?;
    
    profile.owner = ctx.accounts.owner.key();
    profile.display_name = display_name.clone();
    profile.avatar_uri = avatar_uri;
    profile.follower_count = 0;
    profile.following_count = 0;
    profile.created_at = clock.unix_timestamp;
    
    emit!(ProfileCreated {
        profile: profile.key(),
        owner: profile.owner,
        display_name,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
