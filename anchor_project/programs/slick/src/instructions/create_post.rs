use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, events::*, state::*};

/// Create a new post in a community
/// 
/// Validation:
/// - User must be a member of the community
/// - Content URI must be within length limits
/// - If anonymous: pseudonym is required
/// - If not anonymous: author is set to signer
/// 
/// Events: PostCreated
#[derive(Accounts)]
pub struct CreatePost<'info> {
    #[account(mut)]
    pub community: Account<'info, CommunityAccount>,
    
    #[account(
        seeds = [MEMBERSHIP_SEED, community.key().as_ref(), author.key().as_ref()],
        bump
    )]
    pub membership: Account<'info, MembershipAccount>,
    
    #[account(
        init,
        payer = author,
        space = POST_SIZE,
        seeds = [POST_SEED, community.key().as_ref(), &community.post_counter.to_le_bytes()],
        bump
    )]
    pub post: Account<'info, PostAccount>,
    
    #[account(mut)]
    pub author: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn create_post(
    ctx: Context<CreatePost>,
    content_uri: String,
    content_hash: [u8; 32],
    is_anonymous: bool,
    pseudonym: Option<String>,
) -> Result<()> {
    // Validate content URI length
    require!(
        content_uri.len() <= MAX_CONTENT_URI_LEN,
        SocialError::ContentUriTooLong
    );
    
    // Validate pseudonym logic
    if is_anonymous {
        require!(pseudonym.is_some(), SocialError::PseudonymRequired);
        if let Some(ref p) = pseudonym {
            require!(
                p.len() <= MAX_PSEUDONYM_LEN,
                SocialError::PseudonymTooLong
            );
        }
    } else {
        require!(pseudonym.is_none(), SocialError::PseudonymNotAllowed);
    }
    
    let community = &mut ctx.accounts.community;
    let post = &mut ctx.accounts.post;
    let clock = Clock::get()?;
    
    let post_id = community.post_counter;
    
    post.community = community.key();
    post.post_id = post_id;
    post.content_uri = content_uri;
    post.content_hash = content_hash;
    post.author = if is_anonymous { None } else { Some(ctx.accounts.author.key()) };
    post.pseudonym = pseudonym;
    post.likes_count = 0;
    post.comments_count = 0;
    post.total_tip_lamports = 0;
    post.created_at = clock.unix_timestamp;
    
    // Increment community post counter
    community.post_counter = community.post_counter
        .checked_add(1)
        .ok_or(SocialError::ArithmeticOverflow)?;
    
    emit!(PostCreated {
        post: post.key(),
        community: community.key(),
        post_id,
        author: post.author,
        is_anonymous,
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
