use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, events::*, state::*};

/// Updates an existing user profile
/// 
/// Validation:
/// - Only the profile owner can update
/// - String lengths must be within limits
/// 
/// Events: ProfileUpdated
#[derive(Accounts)]
pub struct UpdateProfile<'info> {
    #[account(
        mut,
        seeds = [PROFILE_SEED, owner.key().as_ref()],
        bump,
        has_one = owner
    )]
    pub profile: Account<'info, ProfileAccount>,
    
    pub owner: Signer<'info>,
}

pub fn update_profile(
    ctx: Context<UpdateProfile>,
    display_name: Option<String>,
    avatar_uri: Option<String>,
) -> Result<()> {
    let profile = &mut ctx.accounts.profile;
    let clock = Clock::get()?;
    
    if let Some(name) = display_name {
        require!(
            name.len() <= MAX_DISPLAY_NAME_LEN,
            SocialError::DisplayNameTooLong
        );
        profile.display_name = name;
    }
    
    if let Some(uri) = avatar_uri {
        require!(
            uri.len() <= MAX_AVATAR_URI_LEN,
            SocialError::AvatarUriTooLong
        );
        profile.avatar_uri = uri;
    }
    
    emit!(ProfileUpdated {
        profile: profile.key(),
        owner: profile.owner,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
