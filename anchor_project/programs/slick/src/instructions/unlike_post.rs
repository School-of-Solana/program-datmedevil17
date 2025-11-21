use anchor_lang::prelude::*;
use crate::{constants::*, errors::*, events::*, state::*};

/// Unlike a post
/// 
/// Validation:
/// - User must have previously liked the post
/// 
/// Events: PostUnliked
#[derive(Accounts)]
pub struct UnlikePost<'info> {
    #[account(mut)]
    pub post: Account<'info, PostAccount>,
    
    #[account(
        mut,
        close = liker,
        seeds = [LIKE_SEED, post.key().as_ref(), liker.key().as_ref()],
        bump,
        has_one = post,
        has_one = liker
    )]
    pub like: Account<'info, LikeAccount>,
    
    #[account(mut)]
    pub liker: Signer<'info>,
}

pub fn unlike_post(ctx: Context<UnlikePost>) -> Result<()> {
    let post = &mut ctx.accounts.post;
    let clock = Clock::get()?;
    
    // Decrement like count
    post.likes_count = post.likes_count
        .checked_sub(1)
        .ok_or(SocialError::ArithmeticOverflow)?;
    
    emit!(PostUnliked {
        post: post.key(),
        unliker: ctx.accounts.liker.key(),
        timestamp: clock.unix_timestamp,
    });
    
    Ok(())
}
